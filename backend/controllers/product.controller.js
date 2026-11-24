import { redis } from "../lib/redis.js";
import { ImageUploadError, ImageStorageError, deleteManagedImage, resolveImageReference, isImageCollectionWithinLimit } from "../lib/image-upload.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Order from "../models/order.model.js";
import { normalizePersianText, escapeSearchRegex } from "../lib/persian-search.js";
import { buildProductSearchClause, buildEffectivePriceRangeClause } from "../lib/product-query.js";
import { getVisibleCategoryTree } from "../lib/category-tree-cache.js";
import { getProductDerivedCacheVersion, invalidateProductDerivedCaches } from "../lib/product-cache.js";
import { recordAuditEvent } from "../lib/audit-log.js";
import { normalizeCustomSpecifications } from "../lib/custom-product-specifications.js";
import { getProductDiscountAmount, getProductDiscountedPrice, normalizeProductDiscountPercent } from "../lib/product-pricing.js";

import { prisma } from "../lib/prisma.js";

const idOf = (value) => value == null ? "" : String(value);
const getCategoryProductScope = async (slug) => {
  const selected = await Category.findOne({ slug }).select("_id slug").maxTimeMS(1200).lean();
  if (!selected) return null;
  const visible = await getVisibleCategoryTree();
  const selectedId = idOf(selected._id);
  if (!visible.some((category) => idOf(category._id) === selectedId)) return { ids: [], slugs: [] };
  const scope = visible.filter((category) =>
    idOf(category._id) === selectedId ||
    (category.ancestors || []).some((ancestor) => idOf(ancestor) === selectedId)
  );
  return { ids: scope.map((category) => category._id), slugs: scope.map((category) => category.slug) };
};

const getCachedProductPriceBounds = async (filter, scopeKey) => {
  let version = "redis-unavailable";
  try {
    version = (await redis.get("product_price_bounds_version_v1")) || "initial";
  } catch {
    // Redis is optional for cache reads; PostgreSQL remains the source of truth.
  }
  const cacheKey = "product_price_bounds_v4:" + scopeKey + ":" + version;
  const cached = await readJsonCache(cacheKey);
  if (cached && Number.isFinite(Number(cached.minPrice)) &&
      Number.isFinite(Number(cached.maxPrice)) && Number.isFinite(Number(cached.count))) return cached;

  const count = await Product.countDocuments(filter).maxTimeMS(1500);
  if (!count) {
    const empty = { minPrice: 0, maxPrice: 0, count: 0 };
    await writeJsonCache(cacheKey, empty, 120);
    return empty;
  }

  const [minimum, maximum] = await Promise.all([
    Product.findOne(filter).sort({ effectivePrice: 1, _id: 1 }).select("+effectivePrice").lean().maxTimeMS(1500),
    Product.findOne(filter).sort({ effectivePrice: -1, _id: -1 }).select("+effectivePrice").lean().maxTimeMS(1500),
  ]);
  const min = Number(minimum?.effectivePrice);
  const max = Number(maximum?.effectivePrice);
  const result = {
    minPrice: Number.isFinite(min) ? Math.max(0, Math.floor(min)) : 0,
    maxPrice: Number.isFinite(max) ? Math.max(0, Math.ceil(max)) : 0,
    count,
  };
  await writeJsonCache(cacheKey, result, 120);
  return result;
};

const findProductsSortedByEffectivePrice = (filter, direction, skip, limit) =>
  Product.find(filter)
    .sort({ effectivePrice: direction, _id: direction })
    .skip(skip)
    .limit(limit)
    .maxTimeMS(1500)
    .lean();

const validateProductAttributes = async (category, input) => {
  const raw = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const ids = [...(category.ancestors || []), category._id];
  const categories = await Category.find({ _id: { $in: ids } }).lean();
  categories.sort((a, b) => (a.ancestors || []).length - (b.ancestors || []).length);
  const definitions = new Map();
  for (const item of categories) {
    const isCurrent = idOf(item._id) === idOf(category._id);
    for (const attribute of item.attributes || []) {
      if (isCurrent || attribute.inherited !== false) definitions.set(attribute.key, attribute);
    }
  }
  for (const key of Object.keys(raw)) {
    if (!definitions.has(key)) return { error: "ویژگی نامعتبر برای این دسته‌بندی: " + key };
  }
  const values = {};
  for (const [key, definition] of definitions) {
    let value = raw[key];
    const missing = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    if (missing) {
      if (definition.required) return { error: "ویژگی «" + (definition.name?.fa || key) + "» الزامی است." };
      continue;
    }
    if (definition.type === "select") {
      if (typeof value !== "string" || !(definition.options || []).some((option) => option.value === value)) {
        return { error: "مقدار ویژگی «" + (definition.name?.fa || key) + "» معتبر نیست." };
      }
    } else if (definition.type === "multi-select") {
      if (!Array.isArray(value) || value.some((entry) =>
        typeof entry !== "string" || !(definition.options || []).some((option) => option.value === entry)
      )) return { error: "گزینه‌های ویژگی «" + (definition.name?.fa || key) + "» معتبر نیستند." };
    } else if (definition.type === "boolean") {
      if (typeof value !== "boolean") return { error: "مقدار ویژگی «" + (definition.name?.fa || key) + "» باید بله یا خیر باشد." };
    } else if (definition.type === "number") {
      value = Number(value);
      if (!Number.isFinite(value)) return { error: "مقدار ویژگی «" + (definition.name?.fa || key) + "» باید عددی باشد." };
    } else if (definition.type === "text") {
      if (typeof value !== "string" || value.length > 500) return { error: "مقدار متنی ویژگی «" + (definition.name?.fa || key) + "» معتبر نیست." };
    }
    values[key] = value;
  }
  return { values };
};

const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
let cacheWarningLogged = false;
const readJsonCache = async (key) => {
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    if (!cacheWarningLogged) {
      console.warn("Redis cache unavailable; continuing with database reads:", error.message);
      cacheWarningLogged = true;
    }
    return null;
  }
};
const writeJsonCache = async (key, value, ttlSeconds) => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    if (!cacheWarningLogged) {
      console.warn("Redis cache unavailable; continuing without cache writes:", error.message);
      cacheWarningLogged = true;
    }
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const page = clampInteger(req.query.page, 1, 1, 100000);
    const limit = clampInteger(req.query.limit, 12, 1, 50);
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim().slice(0, 96) : "";
    const stock = typeof req.query.stock === "string" ? req.query.stock : "";
    const requestedStatus = typeof req.query.status === "string" ? req.query.status : "active";
    const status = ["active", "archived", "all"].includes(requestedStatus) ? requestedStatus : "active";
    const clauses = [];
    const filter = {};

    if (status === "active") filter.isActive = { $ne: false };
    else if (status === "archived") filter.isActive = false;

    if (rawQuery) {
      const searchClause = buildProductSearchClause(rawQuery);
      if (searchClause) clauses.push(searchClause);
    }
    if (category) {
      const categoryRecord = await Category.findOne({ slug: category }).select("_id").lean();
      const categoryMatches = [{ category }];
      if (categoryRecord) categoryMatches.push({ categoryId: categoryRecord._id });
      clauses.push({ $or: categoryMatches });
    }
    if (stock === "in_stock") {
      clauses.push({ $or: [
        { variants: { $elemMatch: { stock: { $gt: 0 } } } },
        { $and: [{ stock: { $gt: 0 } }, { $or: [{ variants: { $size: 0 } }] }] },
      ] });
    } else if (stock === "out_of_stock") {
      clauses.push({ $or: [
        { stock: 0, $or: [{ variants: { $size: 0 } }] },
        { $expr: { $and: [
          { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
          { $eq: [
            { $size: { $filter: { input: { $ifNull: ["$variants", []] }, as: "variant", cond: { $gt: ["$$variant.stock", 0] } } } },
            0,
          ] },
        ] } },
      ] });
    } else if (stock === "untracked") {
      clauses.push({ stock: null, $or: [{ variants: { $size: 0 } }] });
    }
    if (clauses.length) filter.$and = clauses;

    const sort = req.query.sort === "priceAsc"
      ? { effectivePrice: 1, _id: 1 }
      : req.query.sort === "priceDesc"
        ? { effectivePrice: -1, _id: -1 }
        : req.query.sort === "nameAsc"
          ? { name: 1, _id: 1 }
          : { createdAt: -1, _id: -1 };
    const priceDirection = req.query.sort === "priceAsc" ? 1 : req.query.sort === "priceDesc" ? -1 : 0;
    const productsQuery = priceDirection
      ? findProductsSortedByEffectivePrice(filter, priceDirection, (page - 1) * limit, limit)
      : Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).maxTimeMS(1500).lean();
    const [total, products] = await Promise.all([
      Product.countDocuments(filter).maxTimeMS(1500),
      productsQuery,
    ]);
    return res.json({ products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Error in getAllProducts controller", error.message);
    return res.status(500).json({ message: "دریافت محصولات ناموفق بود." });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: { $ne: false } }).maxTimeMS(1500).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json(product);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid product ID" });
    console.error("Error in getProductById controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getFeaturedProducts = async (_req, res) => {
  const cached = await readJsonCache("featured_products_v3");
  if (Array.isArray(cached)) return res.json(cached);
  try {
    const featuredProducts = await Product.find({ isFeatured: true, isActive: { $ne: false } })
      .sort({ createdAt: -1, _id: -1 }).limit(100).maxTimeMS(1500).lean();
    await writeJsonCache("featured_products_v3", featuredProducts, 300);
    return res.json(featuredProducts);
  } catch (error) {
    console.error("Error in getFeaturedProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getNewestProducts = async (req, res) => {
  try {
    const limit = clampInteger(req.query.limit, 8, 1, 24);
    const cacheKey = "newest_products_v1:" + limit;
    const cached = await readJsonCache(cacheKey);
    if (Array.isArray(cached)) return res.json({ products: cached });

    const products = await Product.find({ isActive: { $ne: false } })
      .sort({ createdAt: -1, _id: -1 }).limit(limit).maxTimeMS(1500).lean();
    await writeJsonCache(cacheKey, products, 60);
    return res.json({ products });
  } catch (error) {
    console.error("Error in getNewestProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getProductPriceBounds = async (_req, res) => {
  try {
    const priceBounds = await getCachedProductPriceBounds({ isActive: { $ne: false } }, "global");
    return res.json({ priceBounds });
  } catch (error) {
    console.error("Error in getProductPriceBounds controller", error.message);
    return res.status(500).json({ message: "Unable to load product price bounds" });
  }
};

export const getSearchedProducts = async (req, res) => {
  try {
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    const q = normalizePersianText(rawQuery).slice(0, 80);
    const category = typeof req.query.category === "string" ? req.query.category.trim().slice(0, 64) : "";
    const page = clampInteger(req.query.page, 1, 1, 5000);
    const limit = clampInteger(req.query.limit, 24, 1, 48);
    const minPrice = req.query.minPrice === undefined || req.query.minPrice === "" ? null : Number(req.query.minPrice);
    const maxPrice = req.query.maxPrice === undefined || req.query.maxPrice === "" ? null : Number(req.query.maxPrice);

    if ((minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0)) ||
        (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0))) {
      return res.status(400).json({ message: "Price filters must be non-negative numbers" });
    }
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      return res.status(400).json({ message: "Minimum price cannot exceed maximum price" });
    }

    const filter = { isActive: { $ne: false } };
    if (category) {
      const scope = await getCategoryProductScope(category);
      filter.$or = [
        { categoryId: { $in: scope?.ids || [] } },
        { category: { $in: scope?.slugs || [] } },
      ];
    }
    if (q) {
      const searchClause = buildProductSearchClause(rawQuery);
      if (searchClause) filter.$and = [searchClause];
    }
    if (minPrice !== null || maxPrice !== null) {
      filter.$and = [...(filter.$and || []), buildEffectivePriceRangeClause(minPrice, maxPrice)];
    }

    const sortMap = {
      newest: { createdAt: -1, _id: -1 },
      oldest: { createdAt: 1, _id: 1 },
      priceAsc: { effectivePrice: 1, _id: 1 },
      priceDesc: { effectivePrice: -1, _id: -1 },
      nameAsc: { name: 1, _id: 1 },
    };
    const sort = sortMap[req.query.sort] || sortMap.newest;
    const priceDirection = req.query.sort === "priceAsc" ? 1 : req.query.sort === "priceDesc" ? -1 : 0;
    const productsQuery = priceDirection
      ? findProductsSortedByEffectivePrice(filter, priceDirection, (page - 1) * limit, limit)
      : Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).maxTimeMS(1500).lean();
    const [total, products] = await Promise.all([
      Product.countDocuments(filter).maxTimeMS(1500),
      productsQuery,
    ]);
    return res.json({ products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Error in getSearchedProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createProduct = async (req, res) => {
  const pendingUploadedImages = [];
  try {
    const {
      name, description, price, image, images, category, categoryId, attributes, stock,
      sizes, colors, variants, fit, sizeChart,
    } = req.body;
    let categoryRecord = null;
    if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
      if (typeof categoryId !== "string" || !/^[a-f\d]{24}$/i.test(categoryId)) {
        return res.status(400).json({ message: "دسته‌بندی انتخاب‌شده معتبر نیست." });
      }
      categoryRecord = await Category.findOne({ _id: categoryId, isActive: true });
      if (!categoryRecord) return res.status(400).json({ message: "دسته‌بندی فعال پیدا نشد." });
    }
    const productCategory = categoryRecord ? categoryRecord.slug : (typeof category === "string" ? category.trim() : "");
    const normalizedAttributes = categoryRecord
      ? await validateProductAttributes(categoryRecord, attributes)
      : { values: attributes && typeof attributes === "object" && !Array.isArray(attributes) ? attributes : {} };
    if (normalizedAttributes.error) return res.status(400).json({ message: normalizedAttributes.error });
    const normalizedCustomSpecifications = normalizeCustomSpecifications(req.body?.customSpecifications);
    if (normalizedCustomSpecifications.error) return res.status(400).json({ message: normalizedCustomSpecifications.error });
    const numericPrice = price === "" || price === undefined || price === null ? Number.NaN : Number(price);
    const numericStock = stock === "" || stock === undefined || stock === null ? null : Number(stock);
    const normalizedSizes = Array.isArray(sizes)
      ? [...new Set(sizes.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean))].slice(0, 24)
      : [];
    const normalizedColors = Array.isArray(colors)
      ? colors.filter((value) => value && typeof value.name === "string")
          .map((value) => ({ name: value.name.trim().slice(0, 40), hex: typeof value.hex === "string" && /^#[0-9a-fA-F]{6}$/.test(value.hex) ? value.hex : "#d5d0c5" }))
          .filter((value) => value.name)
          .filter((value, index, list) => list.findIndex((entry) => entry.name.toLowerCase() === value.name.toLowerCase()) === index)
          .slice(0, 16)
      : [];
    const normalizedVariants = Array.isArray(variants)
      ? variants.map((variant) => ({
          size: typeof variant?.size === "string" ? variant.size.trim() : "",
          color: typeof variant?.color === "string" ? variant.color.trim() : "",
          stock: Number(variant?.stock),
        }))
      : [];
    const normalizedFit = fit && typeof fit === "object" ? {
      type: ["true-to-size", "slim", "regular", "relaxed", "oversized", "athletic"].includes(fit.type) ? fit.type : "regular",
      description: typeof fit.description === "string" ? fit.description.trim().slice(0, 500) : "",
      modelHeight: typeof fit.modelHeight === "string" ? fit.modelHeight.trim().slice(0, 40) : "",
      modelSize: typeof fit.modelSize === "string" ? fit.modelSize.trim().slice(0, 24) : "",
    } : { type: "regular", description: "", modelHeight: "", modelSize: "" };
    const normalizedSizeChart = Array.isArray(sizeChart)
      ? sizeChart.filter((row) => row && typeof row.size === "string" && row.size.trim())
          .slice(0, 24)
          .map((row) => {
            const measurement = (value) => value === "" || value === null || value === undefined ? null : Number(value);
            return {
              size: row.size.trim().slice(0, 24),
              chestCm: measurement(row.chestCm),
              waistCm: measurement(row.waistCm),
              hipsCm: measurement(row.hipsCm),
              lengthCm: measurement(row.lengthCm),
            };
          })
      : [];

    if (Number.isFinite(numericPrice) && !Number.isSafeInteger(numericPrice)) {
      return res.status(400).json({ message: "قیمت باید مبلغ صحیح و بدون اعشار به تومان باشد." });
    }
    if (typeof name !== "string" || !name.trim() ||
        typeof description !== "string" || !description.trim() ||
        typeof productCategory !== "string" || !productCategory ||
        !Number.isFinite(numericPrice) || numericPrice < 0 ||
        (numericStock !== null && (!Number.isInteger(numericStock) || numericStock < 0))) {
      return res.status(400).json({ message: "Provide valid product details, price, and stock" });
    }
    if (normalizedVariants.some((variant) => !Number.isInteger(variant.stock) || variant.stock < 0 ||
        (variant.size && !normalizedSizes.includes(variant.size)) ||
        (variant.color && !normalizedColors.some((color) => color.name === variant.color)))) {
      return res.status(400).json({ message: "Variant inventory or size/color options are invalid" });
    }
    if ((normalizedSizes.length > 0 || normalizedColors.length > 0) && normalizedVariants.length === 0) {
      return res.status(400).json({ message: "Add stock for each size/color combination" });
    }
    if (normalizedSizes.length > 0 && normalizedColors.length > 0) {
      const expectedCount = normalizedSizes.length * normalizedColors.length;
      if (normalizedVariants.length !== expectedCount) {
        return res.status(400).json({ message: "Every size and color combination needs an inventory value" });
      }
      const keys = new Set(normalizedVariants.map((variant) => `${variant.size}::${variant.color}`));
      if (keys.size !== expectedCount) {
        return res.status(400).json({ message: "Duplicate size/color combinations are not allowed" });
      }
    }
    if (normalizedSizeChart.some((row) =>
      ["chestCm", "waistCm", "hipsCm", "lengthCm"].some((key) =>
        row[key] !== null && (!Number.isFinite(row[key]) || row[key] < 0)
      )
    )) {
      return res.status(400).json({ message: "Size measurements must be non-negative numbers" });
    }

    if (Array.isArray(images) && images.length > 8) {
      return res.status(400).json({ message: "حداکثر ۸ تصویر برای هر محصول مجاز است." });
    }
    const imageInputs = (Array.isArray(images) ? images : image ? [image] : [])
      .filter((value) => typeof value === "string" && value.trim())
      .slice(0, 8);
    if (!isImageCollectionWithinLimit(imageInputs)) {
      return res.status(413).json({ message: "مجموع حجم تصاویر محصول نباید از ۱۲ مگابایت بیشتر شود." });
    }
    const uploadedImages = [];
    for (const imageInput of imageInputs) {
      const imageReference = await resolveImageReference(imageInput, {
        folder: "products",
        maxBytes: 2 * 1024 * 1024,
      });
      uploadedImages.push(imageReference);
      if (imageInput.startsWith("data:")) pendingUploadedImages.push(imageReference);
    }

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price: numericPrice,
      image: uploadedImages[0] || "",
      images: uploadedImages,
      category: productCategory,
      categoryId: categoryRecord?._id || null,
      attributes: normalizedAttributes.values || {},
      customSpecifications: normalizedCustomSpecifications.values || [],
      sizes: normalizedSizes,
      colors: normalizedColors,
      variants: normalizedVariants,
      fit: normalizedFit,
      sizeChart: normalizedSizeChart,
      stock: normalizedVariants.length ? null : numericStock,
    });
    pendingUploadedImages.length = 0;
    await invalidateProductDerivedCaches();
    await recordAuditEvent(req, {
      action: "product.created",
      targetType: "product",
      targetId: product._id,
      summary: "Product created: " + product.name,
      metadata: {
        after: {
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          categoryId: product.categoryId ? String(product.categoryId) : null,
          imageCount: (product.images || []).length,
          primaryImage: product.image,
          images: product.images || [],
          sizes: product.sizes,
          colors: product.colors,
          variants: (product.variants || []).map(({ size, color, stock }) => ({ size, color, stock })),
          attributes: product.attributes instanceof Map ? Object.fromEntries(product.attributes) : (product.attributes || {}),
          customSpecifications: product.customSpecifications || [],
          fit: product.fit,
          sizeChart: product.sizeChart,
          stock: product.stock,
          isFeatured: product.isFeatured,
          isActive: product.isActive,
        },
      },
    });
    return res.status(201).json(product);
  } catch (error) {
    await Promise.all(pendingUploadedImages.map((image) =>
      deleteManagedImage(image, { folder: "products" }).catch((cleanupError) => {
        console.error("Unpersisted product image cleanup failed", { name: cleanupError?.name || "Error" });
      })
    ));
    if (error instanceof ImageUploadError) return res.status(400).json({ message: error.message });
    if (error instanceof ImageStorageError) return res.status(502).json({ message: error.message });
    console.error("Error in createProduct controller", error.message);
    return res.status(500).json({ message: "Unable to create product" });
  }
};

export const updateProduct = async (req, res) => {
  const pendingUploadedImages = [];
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const numericPrice = body.price === "" || body.price === undefined || body.price === null ? Number.NaN : Number(body.price);
    const numericStock = body.stock === "" || body.stock === undefined || body.stock === null ? null : Number(body.stock);

    let categoryRecord = null;
    if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== "") {
      if (typeof body.categoryId !== "string" || !/^[a-f\d]{24}$/i.test(body.categoryId)) {
        return res.status(400).json({ message: "دسته‌بندی انتخاب‌شده معتبر نیست." });
      }
      categoryRecord = await Category.findOne({ _id: body.categoryId, isActive: true });
      if (!categoryRecord) return res.status(400).json({ message: "دسته‌بندی فعال پیدا نشد؛ یک دسته‌بندی فعال انتخاب کنید." });
    }
    const productCategory = categoryRecord ? categoryRecord.slug : (typeof body.category === "string" ? body.category.trim() : "");
    const rawAttributes = body.attributes && typeof body.attributes === "object" && !Array.isArray(body.attributes) ? body.attributes : {};
    const normalizedAttributes = categoryRecord
      ? await validateProductAttributes(categoryRecord, rawAttributes)
      : { values: rawAttributes };
    if (normalizedAttributes.error) return res.status(400).json({ message: normalizedAttributes.error });
    const normalizedCustomSpecifications = normalizeCustomSpecifications(body.customSpecifications, product.customSpecifications || []);
    if (normalizedCustomSpecifications.error) return res.status(400).json({ message: normalizedCustomSpecifications.error });

    const normalizedSizes = Array.isArray(body.sizes)
      ? [...new Set(body.sizes.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean))].slice(0, 24)
      : [];
    const normalizedColors = Array.isArray(body.colors)
      ? body.colors.filter((value) => value && typeof value.name === "string")
          .map((value) => ({ name: value.name.trim().slice(0, 40), hex: typeof value.hex === "string" && /^#[0-9a-fA-F]{6}$/.test(value.hex) ? value.hex : "#d5d0c5" }))
          .filter((value) => value.name)
          .filter((value, index, list) => list.findIndex((entry) => entry.name.toLowerCase() === value.name.toLowerCase()) === index)
          .slice(0, 16)
      : [];
    const normalizedVariants = Array.isArray(body.variants)
      ? body.variants.map((variant) => ({
          size: typeof variant?.size === "string" ? variant.size.trim() : "",
          color: typeof variant?.color === "string" ? variant.color.trim() : "",
          stock: Number(variant?.stock),
        }))
      : [];
    const normalizedFit = body.fit && typeof body.fit === "object" ? {
      type: ["true-to-size", "slim", "regular", "relaxed", "oversized", "athletic"].includes(body.fit.type) ? body.fit.type : "regular",
      description: typeof body.fit.description === "string" ? body.fit.description.trim().slice(0, 500) : "",
      modelHeight: typeof body.fit.modelHeight === "string" ? body.fit.modelHeight.trim().slice(0, 40) : "",
      modelSize: typeof body.fit.modelSize === "string" ? body.fit.modelSize.trim().slice(0, 24) : "",
    } : { type: "regular", description: "", modelHeight: "", modelSize: "" };
    const normalizedSizeChart = Array.isArray(body.sizeChart)
      ? body.sizeChart.filter((row) => row && typeof row.size === "string" && row.size.trim()).slice(0, 24).map((row) => {
          const measurement = (value) => value === "" || value === null || value === undefined ? null : Number(value);
          return {
            size: row.size.trim().slice(0, 24),
            chestCm: measurement(row.chestCm),
            waistCm: measurement(row.waistCm),
            hipsCm: measurement(row.hipsCm),
            lengthCm: measurement(row.lengthCm),
          };
        })
      : [];

    if (name.length > 160 || !name || description.length > 5000 || !description || !productCategory ||
        !Number.isSafeInteger(numericPrice) || numericPrice < 0 ||
        (numericStock !== null && (!Number.isInteger(numericStock) || numericStock < 0))) {
      return res.status(400).json({ message: "نام، توضیحات، دسته‌بندی، قیمت صحیح و موجودی معتبر را وارد کنید." });
    }
    if (!Array.isArray(body.variants) && product.variants?.length && numericStock === null) {
      return res.status(400).json({ message: "برای حذف گزینه‌های دارای موجودی، ابتدا موجودی کل جدید را ثبت کنید." });
    }
    if (Array.isArray(body.variants) && normalizedVariants.length === 0 && product.variants?.length && numericStock === null) {
      return res.status(400).json({ message: "برای حذف گزینه‌های دارای موجودی، ابتدا موجودی کل جدید را ثبت کنید." });
    }
    if (!normalizedVariants.length && numericStock === null && product.stock !== null && product.stock !== undefined) {
      return res.status(400).json({ message: "برای کالای دارای موجودی، مقدار جدیدی وارد کنید یا گزینه‌های موجودی را تعریف کنید." });
    }
    if (normalizedVariants.some((variant) => !Number.isInteger(variant.stock) || variant.stock < 0 ||
        (variant.size && !normalizedSizes.includes(variant.size)) ||
        (variant.color && !normalizedColors.some((color) => color.name === variant.color)))) {
      return res.status(400).json({ message: "موجودی یا ترکیب سایز و رنگ معتبر نیست." });
    }
    if ((normalizedSizes.length > 0 || normalizedColors.length > 0) && normalizedVariants.length === 0) {
      return res.status(400).json({ message: "برای هر ترکیب سایز و رنگ موجودی ثبت کنید." });
    }
    if (normalizedSizes.length > 0 || normalizedColors.length > 0) {
      const expectedCount = (normalizedSizes.length || 1) * (normalizedColors.length || 1);
      const keys = new Set(normalizedVariants.map((variant) => variant.size + "::" + variant.color));
      if (normalizedVariants.length !== expectedCount || keys.size !== expectedCount) {
        return res.status(400).json({ message: "هر ترکیب یکتای سایز و رنگ باید دقیقاً یک مقدار موجودی داشته باشد." });
      }
    }
    if (normalizedSizeChart.some((row) => ["chestCm", "waistCm", "hipsCm", "lengthCm"].some((key) =>
      row[key] !== null && (!Number.isFinite(row[key]) || row[key] < 0)
    ))) {
      return res.status(400).json({ message: "اندازه‌های جدول سایز باید عددی نامنفی باشند." });
    }

    const imageInputs = (Array.isArray(body.images) ? body.images : (body.image ? [body.image] : []))
      .filter((value) => typeof value === "string" && value.trim()).slice(0, 8);
    if (!isImageCollectionWithinLimit(imageInputs)) {
      return res.status(413).json({ message: "مجموع حجم تصاویر محصول نباید از ۱۲ مگابایت بیشتر شود." });
    }
    if ((Array.isArray(body.images) && body.images.length > 8) ||
        imageInputs.some((value) => !/^https:\/\//i.test(value) && !/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(value))) {
      return res.status(400).json({ message: "فرمت تصاویر محصول معتبر نیست." });
    }
    const uploadedImages = [];
    for (const imageInput of imageInputs) {
      const imageReference = await resolveImageReference(imageInput, {
        folder: "products",
        maxBytes: 2 * 1024 * 1024,
      });
      uploadedImages.push(imageReference);
      if (imageInput.startsWith("data:")) pendingUploadedImages.push(imageReference);
    }

    const previousImageReferences = [...new Set([product.image, ...(product.images || [])]
      .filter((value) => typeof value === "string" && value))];

    const snapshot = (item) => ({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      categoryId: item.categoryId ? String(item.categoryId) : null,
      images: item.images || [],
      sizes: item.sizes || [],
      colors: item.colors || [],
      variants: (item.variants || []).map(({ size, color, stock }) => ({ size, color, stock })),
      attributes: item.attributes instanceof Map ? Object.fromEntries(item.attributes) : (item.attributes || {}),
      fit: item.fit,
      sizeChart: item.sizeChart || [],
      stock: item.stock,
      isFeatured: item.isFeatured,
      isActive: item.isActive,
    });
    const before = snapshot(product);

    product.name = name;
    product.description = description;
    product.price = numericPrice;
    product.image = uploadedImages[0] || "";
    product.images = uploadedImages;
    product.category = productCategory;
    product.categoryId = categoryRecord?._id || null;
    product.attributes = normalizedAttributes.values || {};
    product.customSpecifications = normalizedCustomSpecifications.values || [];
    product.sizes = normalizedSizes;
    product.colors = normalizedColors;
    product.variants = normalizedVariants;
    product.fit = normalizedFit;
    product.sizeChart = normalizedSizeChart;
    product.stock = normalizedVariants.length ? null : numericStock;
    await product.save();
    pendingUploadedImages.length = 0;

    const retainedImageReferences = new Set(uploadedImages);
    await Promise.all(previousImageReferences
      .filter((image) => !retainedImageReferences.has(image))
      .map((image) => deleteManagedImage(image, { folder: "products" }).catch((cleanupError) => {
        console.error("Replaced product image cleanup failed", { name: cleanupError?.name || "Error" });
      })));

    await updateFeaturedProductsCache();
    await invalidateProductDerivedCaches();
    await recordAuditEvent(req, {
      action: "product.updated",
      targetType: "product",
      targetId: product._id,
      summary: "Product updated: " + product.name,
      metadata: { productName: product.name, before, after: snapshot(product) },
    });
    return res.json(product);
  } catch (error) {
    await Promise.all(pendingUploadedImages.map((image) =>
      deleteManagedImage(image, { folder: "products" }).catch((cleanupError) => {
        console.error("Unpersisted product image cleanup failed", { name: cleanupError?.name || "Error" });
      })
    ));
    if (error instanceof ImageUploadError) return res.status(400).json({ message: error.message });
    if (error instanceof ImageStorageError) return res.status(502).json({ message: error.message });
    if (error.name === "CastError") return res.status(400).json({ message: "شناسه محصول معتبر نیست." });
    console.error("Error updating product", error.message);
    return res.status(500).json({ message: "به‌روزرسانی محصول ناموفق بود." });
  }
};

export const setProductActive = async (req, res) => {
  if (typeof req.body?.isActive !== "boolean") return res.status(400).json({ message: "وضعیت انتشار معتبر نیست." });
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const previous = product.isActive !== false;
    const next = req.body.isActive;
    if (previous === next) return res.json(product);
    product.isActive = next;
    await product.save();
    await updateFeaturedProductsCache();
    await invalidateProductDerivedCaches();
    await recordAuditEvent(req, {
      action: next ? "product.restored" : "product.archived",
      targetType: "product",
      targetId: product._id,
      summary: (next ? "Product restored: " : "Product archived: ") + product.name,
      metadata: {
        productName: product.name,
        before: { isActive: previous },
        after: { isActive: next },
        changes: { isActive: { before: previous, after: next } },
      },
    });
    return res.json(product);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "شناسه محصول معتبر نیست." });
    console.error("Error changing product publication state", error.message);
    return res.status(500).json({ message: "تغییر وضعیت انتشار ناموفق بود." });
  }
};

export const updateProductStock = async (req, res) => {
  const stock = Number(req.body.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ message: "Stock must be a non-negative whole number" });
  }
  try {
    const beforeProduct = await Product.findById(req.params.id).select("name category stock").lean();
    if (!beforeProduct) return res.status(404).json({ message: "Product not found" });
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { stock } },
      { new: true, runValidators: true }
    ).select("_id stock");
    if (!product) return res.status(404).json({ message: "Product not found" });
    await updateFeaturedProductsCache();
    await invalidateProductDerivedCaches();
    await recordAuditEvent(req, {
      action: "product.stock_updated",
      targetType: "product",
      targetId: product._id,
      summary: "Product stock updated: " + beforeProduct.name,
      metadata: {
        productName: beforeProduct.name,
        category: beforeProduct.category,
        before: { stock: beforeProduct.stock },
        after: { stock: product.stock },
        changes: { stock: { before: beforeProduct.stock, after: product.stock } },
      },
    });
    return res.json({ _id: product._id, stock: product.stock });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid product ID" });
    console.error("Error updating product stock", error.message);
    return res.status(500).json({ message: "Unable to update stock" });
  }
};


export const updateProductVariantStock = async (req, res) => {
  const size = typeof req.body.size === "string" ? req.body.size.trim() : "";
  const color = typeof req.body.color === "string" ? req.body.color.trim() : "";
  const stock = Number(req.body.stock);
  if (!Number.isInteger(stock) || stock < 0 || (req.body.size !== undefined && typeof req.body.size !== "string") ||
      (req.body.color !== undefined && typeof req.body.color !== "string")) {
    return res.status(400).json({ message: "Variant stock must be a non-negative whole number" });
  }
  try {
    const beforeProduct = await Product.findOne({
      _id: req.params.id,
      variants: { $elemMatch: { size, color } },
    }).select("name category variants").lean();
    if (!beforeProduct) return res.status(404).json({ message: "Product variant not found" });
    const beforeVariant = (beforeProduct.variants || []).find((variant) => variant.size === size && variant.color === color);
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, variants: { $elemMatch: { size, color } } },
      { $set: { "variants.$.stock": stock } },
      { new: true, runValidators: true }
    ).select("_id variants");
    if (!product) return res.status(404).json({ message: "Product variant not found" });
    await updateFeaturedProductsCache();
    await invalidateProductDerivedCaches();
    await recordAuditEvent(req, {
      action: "product.variant_stock_updated",
      targetType: "product",
      targetId: product._id,
      summary: "Variant stock updated: " + beforeProduct.name,
      metadata: {
        productName: beforeProduct.name,
        category: beforeProduct.category,
        variant: { size, color },
        before: { stock: beforeVariant?.stock ?? null },
        after: { stock },
        changes: { stock: { before: beforeVariant?.stock ?? null, after: stock } },
        variantCount: product.variants.length,
      },
    });
    return res.json({ _id: product._id, variants: product.variants });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid product ID" });
    console.error("Error updating variant stock", error.message);
    return res.status(500).json({ message: "Unable to update variant stock" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.isActive !== false) return res.status(409).json({ message: "ابتدا محصول را بایگانی کنید و سپس حذف دائمی را انجام دهید." });
    const productImageReferences = [...new Set([product.image, ...(product.images || [])]
      .filter((value) => typeof value === "string" && value))];
    await Product.findByIdAndDelete(req.params.id);
    await Promise.all(productImageReferences.map((image) =>
      deleteManagedImage(image, { folder: "products" }).catch((error) => {
        console.error("Error deleting local product image", { name: error?.name || "Error" });
      })
    ));
    await updateFeaturedProductsCache();
    await invalidateProductDerivedCaches();
    await recordAuditEvent(req, {
      action: "product.deleted",
      targetType: "product",
      targetId: product._id,
      summary: "Product deleted: " + product.name,
      metadata: {
        before: {
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          categoryId: product.categoryId ? String(product.categoryId) : null,
          imageCount: (product.images || []).length,
          primaryImage: product.image,
          images: product.images || [],
          sizes: product.sizes,
          colors: product.colors,
          variants: (product.variants || []).map(({ size, color, stock }) => ({ size, color, stock })),
          attributes: product.attributes instanceof Map ? Object.fromEntries(product.attributes) : (product.attributes || {}),
          customSpecifications: product.customSpecifications || [],
          fit: product.fit,
          sizeChart: product.sizeChart,
          stock: product.stock,
          isFeatured: product.isFeatured,
          isActive: product.isActive,
        },
      },
    });
    return res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error in deleteProduct controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const setProductsDiscount = async (req, res) => {
  const inputIds = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
  const productIds = [...new Set(inputIds.map((id) => String(id || "").trim()))];
  const discountPercent = Number(req.body?.discountPercent);

  if (!productIds.length || productIds.length > 100 ||
      productIds.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
    return res.status(400).json({ message: "یک تا ۱۰۰ محصول معتبر برای اعمال تخفیف انتخاب کنید." });
  }
  if (!Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > 99) {
    return res.status(400).json({ message: "درصد تخفیف باید عدد صحیحی بین صفر تا ۹۹ باشد." });
  }

  try {
    const beforeProducts = await Product.find({ _id: { $in: productIds } })
      .select("_id name price discountPercent isActive")
      .lean();
    if (beforeProducts.length !== productIds.length) {
      return res.status(404).json({ message: "یک یا چند محصول انتخاب‌شده پیدا نشد." });
    }
    const archived = beforeProducts.filter((product) => product.isActive === false);
    if (archived.length) {
      return res.status(409).json({ message: "برای محصول بایگانی‌شده تخفیف ثبت نمی‌شود؛ ابتدا آن را بازیابی کنید." });
    }

    const updatedCount = await prisma.$transaction(async tx => {
      const current = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true, price: true },
      });
      if (current.length !== productIds.length) return 0;
      for (const product of current) {
        const effectivePrice = Math.max(0, Number(product.price) - Math.min(Number(product.price), Math.round(Number(product.price) * discountPercent / 100)));
        const changed = await tx.product.updateMany({
          where: { id: product.id, isActive: true },
          data: { discountPercent, effectivePrice },
        });
        if (changed.count !== 1) throw new Error("PRODUCT_DISCOUNT_CONCURRENT_CHANGE");
      }
      return current.length;
    }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
    if (updatedCount !== productIds.length) {
      return res.status(409).json({ message: "وضعیت بعضی محصولات هم‌زمان تغییر کرده است؛ فهرست را تازه‌سازی و دوباره تلاش کنید." });
    }

    const afterProducts = await Product.find({ _id: { $in: productIds } })
      .select("_id name price discountPercent")
      .lean();
    const beforeById = new Map(beforeProducts.map((product) => [String(product._id), product]));

    await Promise.all(afterProducts.map((product) => {
      const before = beforeById.get(String(product._id));
      const previousPercent = normalizeProductDiscountPercent(before?.discountPercent);
      const nextPercent = normalizeProductDiscountPercent(product.discountPercent);
      return recordAuditEvent(req, {
        action: nextPercent ? "product.discount_updated" : "product.discount_removed",
        targetType: "product",
        targetId: product._id,
        summary: (nextPercent ? "Product discount set to " + nextPercent + "%: " : "Product discount removed: ") + product.name,
        metadata: {
          before: {
            price: before?.price ?? null,
            discountPercent: previousPercent,
            discountedPrice: getProductDiscountedPrice({ price: before?.price, discountPercent: previousPercent }),
          },
          after: {
            price: product.price,
            discountPercent: nextPercent,
            discountAmount: getProductDiscountAmount(product),
            discountedPrice: getProductDiscountedPrice(product),
          },
        },
      });
    }));

    await updateFeaturedProductsCache();
    await invalidateProductDerivedCaches();

    return res.json({
      message: discountPercent
        ? "تخفیف " + discountPercent + " درصدی روی " + afterProducts.length + " محصول اعمال شد."
        : "تخفیف " + afterProducts.length + " محصول حذف شد.",
      updatedCount: afterProducts.length,
      products: afterProducts.map((product) => ({
        _id: product._id,
        discountPercent: normalizeProductDiscountPercent(product.discountPercent),
        discountedPrice: getProductDiscountedPrice(product),
      })),
    });
  } catch (error) {
    console.error("Unable to update product discounts", error.message);
    return res.status(500).json({ message: "ذخیره تخفیف محصولات ناموفق بود." });
  }
};

export const getRecommendedProducts = async (_req, res) => {
  try {
    const cached = await readJsonCache("recommended_products_v2");
    if (Array.isArray(cached)) return res.json(cached);
    const sampled = await prisma.$queryRaw`SELECT "id" AS "_id", "name", "description", "image", "price", "discountPercent", "category", "stock"
      FROM "products" WHERE "isActive" = TRUE ORDER BY RANDOM() LIMIT 4`;
    const products = sampled.map(product => ({ ...product, price: Number(product.price), _id: product._id }));
    await writeJsonCache("recommended_products_v2", products, 60);
    return res.json(products);
  } catch (error) {
    console.error("Error in getRecommendedProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const slug = String(req.params.category || "").trim().slice(0, 96);
    if (!slug) return res.status(400).json({ message: "دسته‌بندی معتبر نیست." });

    const scope = await getCategoryProductScope(slug);
    if (!scope) return res.status(404).json({ message: "دسته‌بندی پیدا نشد." });
    const baseClauses = [
      { isActive: { $ne: false } },
      {
        $or: [
          { categoryId: { $in: scope.ids } },
          { category: { $in: scope.slugs } },
        ],
      },
    ];

    const clauses = [...baseClauses];
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    if (rawQuery) {
      const searchClause = buildProductSearchClause(rawQuery);
      if (searchClause) clauses.push(searchClause);
    }

    const parsePriceBound = (value) => {
      if (value === undefined || value === null || String(value).trim() === "") return { valid: true, value: null };
      const text = String(value)
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[,\u060C\u066C\u2009\s]/g, "");
      if (!/^\d+$/.test(text)) return { valid: false, value: null };
      const number = Number(text);
      return { valid: Number.isSafeInteger(number) && number >= 0, value: number };
    };
    const minPrice = parsePriceBound(req.query.minPrice);
    const maxPrice = parsePriceBound(req.query.maxPrice);
    if (!minPrice.valid || !maxPrice.valid || (minPrice.value !== null && maxPrice.value !== null && minPrice.value > maxPrice.value)) {
      return res.status(400).json({ message: "بازه قیمت معتبر نیست." });
    }
    if (minPrice.value !== null || maxPrice.value !== null) {
      clauses.push(buildEffectivePriceRangeClause(minPrice.value, maxPrice.value));
    }

    const readValues = (input, maxItems, maxLength = 80) => {
      const source = input === undefined ? [] : Array.isArray(input) ? input : [input];
      return source
        .filter((value) => typeof value === "string")
        .map((value) => value.trim().slice(0, maxLength))
        .filter(Boolean)
        .slice(0, maxItems);
    };
    const sizes = readValues(req.query.size, 24, 24);
    const colors = readValues(req.query.color, 24, 40);
    const fits = readValues(req.query.fit, 12, 40);
    const brands = readValues(req.query.brand, 24, 80);
    if (sizes.length) clauses.push({ $or: [{ sizes: { $in: sizes } }, { "variants.size": { $in: sizes } }] });
    if (colors.length) clauses.push({ $or: [{ "colors.name": { $in: colors } }, { "variants.color": { $in: colors } }] });
    if (fits.length) clauses.push({ "fit.type": { $in: fits } });
    if (brands.length) {
      clauses.push({
        $or: [
          { brand: { $in: brands } },
          { brandName: { $in: brands } },
          { "brand.name": { $in: brands } },
          { "attributes.brand": { $in: brands } },
          { "attributes.brandName": { $in: brands } },
        ],
      });
    }

    if (["1", "true"].includes(String(req.query.inStock || "").toLowerCase())) {
      clauses.push({
        $or: [
          { variants: { $elemMatch: { stock: { $gt: 0 } } } },
          {
            $and: [
              { $or: [{ variants: { $size: 0 } }] },
              { $or: [{ stock: { $gt: 0 } }, { stock: null }, { stock: { $exists: false } }] },
            ],
          },
        ],
      });
    }

    if (req.query.attributes !== undefined) {
      if (typeof req.query.attributes !== "string" || req.query.attributes.length > 2400) {
        return res.status(400).json({ message: "فیلتر ویژگی‌ها معتبر نیست." });
      }
      let selectedAttributes;
      try { selectedAttributes = JSON.parse(req.query.attributes); }
      catch { return res.status(400).json({ message: "فیلتر ویژگی‌ها معتبر نیست." }); }
      if (!selectedAttributes || typeof selectedAttributes !== "object" || Array.isArray(selectedAttributes)) {
        return res.status(400).json({ message: "فیلتر ویژگی‌ها معتبر نیست." });
      }
      const entries = Object.entries(selectedAttributes).slice(0, 20);
      for (const [key, selected] of entries) {
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(key)) {
          return res.status(400).json({ message: "کلید یکی از ویژگی‌های فیلتر معتبر نیست." });
        }
        if (selected === "" || selected === null || selected === undefined ||
            (Array.isArray(selected) && selected.length === 0)) continue;
        const field = "attributes." + key;
        if (Array.isArray(selected)) {
          const safeValues = selected.filter((value) => typeof value === "string").slice(0, 24);
          if (safeValues.length) clauses.push({ [field]: { $in: safeValues } });
        } else if (typeof selected === "string") {
          clauses.push({ [field]: new RegExp(escapeSearchRegex(selected.slice(0, 120)), "i") });
        } else if (typeof selected === "boolean" || (typeof selected === "number" && Number.isFinite(selected))) {
          clauses.push({ [field]: selected });
        } else {
          return res.status(400).json({ message: "مقدار یکی از ویژگی‌های فیلتر معتبر نیست." });
        }
      }
    }

    const filter = { $and: clauses };
    const page = clampInteger(req.query.page, 1, 1, 100000);
    const limit = clampInteger(req.query.limit, 24, 1, 60);
    const offset = (page - 1) * limit;
    const countOnly = ["1", "true"].includes(String(req.query.countOnly || "").toLowerCase());
    if (countOnly) {
      const total = await Product.countDocuments(filter).maxTimeMS(1500);
      return res.json({ pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    }

    const sortKey = typeof req.query.sort === "string" ? req.query.sort : "newest";
    const sort = sortKey === "priceAsc" ? { effectivePrice: 1, _id: 1 }
      : sortKey === "priceDesc" ? { effectivePrice: -1, _id: -1 }
      : sortKey === "nameAsc" ? { name: 1, _id: 1 }
      : sortKey === "oldest" ? { createdAt: 1, _id: 1 }
      : { createdAt: -1, _id: -1 };

    const facetCacheVersion = await getProductDerivedCacheVersion();
    const facetCacheKey = "category_filter_facets_v4:" + slug + ":" + facetCacheVersion;
    let filterOptions = await readJsonCache(facetCacheKey);
    if (!filterOptions || !Array.isArray(filterOptions.sizes) || !Array.isArray(filterOptions.colors)) {
      const facetProducts = await Product.find({ $and: baseClauses })
        .select("sizes colors variants fit attributes brand brandName")
        .lean();
      const sizesSet = new Set();
      const colorMap = new Map();
      const fitSet = new Set();
      const brandsSet = new Set();
      for (const item of facetProducts) {
        for (const value of [...(item.sizes || []), ...(item.variants || []).map(variant => variant?.size)]) {
          if (typeof value === "string" && value.trim()) sizesSet.add(value.trim());
        }
        for (const color of item.colors || []) {
          if (typeof color?.name === "string" && color.name.trim()) colorMap.set(color.name, { name: color.name, hex: typeof color.hex === "string" ? color.hex : "" });
        }
        for (const variant of item.variants || []) {
          if (typeof variant?.color === "string" && variant.color.trim() && !colorMap.has(variant.color)) colorMap.set(variant.color, { name: variant.color, hex: "" });
        }
        if (typeof item.fit?.type === "string" && item.fit.type.trim()) fitSet.add(item.fit.type);
        const brandValues = [item.brand, item.brandName, item.brand?.name, item.attributes?.brand, item.attributes?.brandName];
        for (const value of brandValues) if (typeof value === "string" && value.trim()) brandsSet.add(value.trim());
      }
      filterOptions = {
        sizes: [...sizesSet].sort((a, b) => a.localeCompare(b, "fa")).slice(0, 100),
        colors: [...colorMap.values()].sort((a, b) => a.name.localeCompare(b.name, "fa")).slice(0, 100),
        fits: [...fitSet].sort((a, b) => a.localeCompare(b, "fa")).slice(0, 30),
        brands: [...brandsSet].sort((a, b) => a.localeCompare(b, "fa")).slice(0, 100),
      };
      await writeJsonCache(facetCacheKey, filterOptions, 120);
    }

    const priceDirection = sortKey === "priceAsc" ? 1 : sortKey === "priceDesc" ? -1 : 0;
    const productsQuery = priceDirection
      ? findProductsSortedByEffectivePrice(filter, priceDirection, offset, limit)
      : Product.find(filter).sort(sort).skip(offset).limit(limit).maxTimeMS(1500).lean();
    const basePriceFilter = { $and: baseClauses };
    const [products, total, priceBounds] = await Promise.all([
      productsQuery,
      Product.countDocuments(filter).maxTimeMS(1500),
      getCachedProductPriceBounds(basePriceFilter, "category:" + slug),
    ]);

    return res.json({
      products,
      priceBounds,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      filterOptions,
    });
  } catch (error) {
    console.error("Error in getProductsByCategory controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const wasFeatured = product.isFeatured;
    product.isFeatured = !product.isFeatured;
    await product.save();
    await updateFeaturedProductsCache();
    await recordAuditEvent(req, {
      action: "product.featured_toggled",
      targetType: "product",
      targetId: product._id,
      summary: "Featured setting updated: " + product.name,
      metadata: {
        productName: product.name,
        before: { isFeatured: wasFeatured },
        after: { isFeatured: product.isFeatured },
        changes: { isFeatured: { before: wasFeatured, after: product.isFeatured } },
      },
    });
    return res.json(product);
  } catch (error) {
    console.error("Error in toggleFeaturedProduct controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

async function updateFeaturedProductsCache() {
  try {
    const products = await Product.find({ isFeatured: true, isActive: { $ne: false } })
      .sort({ createdAt: -1, _id: -1 }).limit(100).maxTimeMS(1500).lean();
    await writeJsonCache("featured_products_v3", products, 300);
  } catch (error) {
    console.error("Unable to refresh featured-products cache", error.message);
  }
}


export const getBestsellingProducts = async (req, res) => {
  const limit = clampInteger(req.query.limit, 8, 1, 24);
  const cacheKey = `bestselling_products_v2:${limit}`;
  const cached = await readJsonCache(cacheKey);
  if (Array.isArray(cached)) return res.json({ products: cached });
  try {
    const paidOrders = await prisma.order.findMany({
      where: { paymentStatus: "paid", status: "paid" },
      select: { id: true, products: true },
    });
    const salesByProduct = new Map();
    for (const order of paidOrders) {
      for (const line of Array.isArray(order.products) ? order.products : []) {
        const id = String(line?.product || "");
        const quantity = Number(line?.quantity || 0);
        if (!id || !Number.isFinite(quantity) || quantity <= 0) continue;
        const current = salesByProduct.get(id) || { soldQuantity: 0, orderIds: new Set() };
        current.soldQuantity += quantity;
        current.orderIds.add(order.id);
        salesByProduct.set(id, current);
      }
    }
    const top = [...salesByProduct.entries()]
      .map(([id, value]) => ({ id, soldQuantity: value.soldQuantity, orderCount: value.orderIds.size }))
      .sort((a, b) => b.soldQuantity - a.soldQuantity || b.orderCount - a.orderCount || a.id.localeCompare(b.id))
      .slice(0, limit);
    const productRows = top.length ? await prisma.product.findMany({
      where: { id: { in: top.map(item => item.id) }, isActive: true },
      // Keep Prisma's default all-fields behavior from exposing fields that the
      // former Mongoose schema deliberately marked select:false.
      select: {
        id: true, name: true, brand: true, brandName: true, description: true,
        price: true, discountPercent: true, image: true, images: true, category: true,
        categoryId: true, attributes: true, customSpecifications: true, sizes: true,
        colors: true, variants: true, fit: true, sizeChart: true, isFeatured: true,
        stock: true, isActive: true, createdAt: true, updatedAt: true,
      },
    }) : [];
    const productById = new Map(productRows.map(item => [item.id, item]));
    const products = top.map(item => {
      const product = productById.get(item.id);
      return product ? { ...product, _id: product.id, price: Number(product.price), effectivePrice: product.effectivePrice == null ? null : Number(product.effectivePrice), soldQuantity: item.soldQuantity, orderCount: item.orderCount } : null;
    }).filter(Boolean);
    await writeJsonCache(cacheKey, products, 60);
    return res.json({ products });
  } catch (error) {
    console.error("Error loading best-selling products", error.message);
    return res.status(500).json({ message: "Unable to load best-selling products" });
  }
};
