import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import { normalizePersianText, escapeSearchRegex } from "../lib/persian-search.js";

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

export const getAllProducts = async (_req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ products });
  } catch (error) {
    console.error("Error in getAllProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: { $ne: false } }).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json(product);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid product ID" });
    console.error("Error in getProductById controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getFeaturedProducts = async (_req, res) => {
  const cached = await readJsonCache("featured_products_v2");
  if (Array.isArray(cached)) return res.json(cached);
  try {
    const featuredProducts = await Product.find({ isFeatured: true, isActive: { $ne: false } })
      .sort({ createdAt: -1, _id: -1 }).limit(100).maxTimeMS(1500).lean();
    await writeJsonCache("featured_products_v2", featuredProducts, 300);
    return res.json(featuredProducts);
  } catch (error) {
    console.error("Error in getFeaturedProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getNewestProducts = async (req, res) => {
  try {
    const limit = clampInteger(req.query.limit, 8, 1, 24);
    const products = await Product.find({ isActive: { $ne: false } })
      .sort({ createdAt: -1, _id: -1 }).limit(limit).lean();
    return res.json({ products });
  } catch (error) {
    console.error("Error in getNewestProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
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
    if (category) filter.category = category;
    if (q) {
      // Match each normalized token so word order is flexible in Persian and Latin queries.
      const tokens = [...new Set(q.split(" ").filter(Boolean))].slice(0, 8);
      filter.$and = tokens.map((token) => {
        const expression = new RegExp(escapeSearchRegex(token));
        return {
          $or: [
            { searchTextNormalized: expression },
            // Compatibility while existing catalogue documents are being backfilled.
            { name: new RegExp(escapeSearchRegex(rawQuery), "i") },
            { description: new RegExp(escapeSearchRegex(rawQuery), "i") },
            { category: new RegExp(escapeSearchRegex(rawQuery), "i") },
          ],
        };
      });
    }
    if (minPrice !== null || maxPrice !== null) {
      filter.price = {};
      if (minPrice !== null) filter.price.$gte = minPrice;
      if (maxPrice !== null) filter.price.$lte = maxPrice;
    }

    const sortMap = {
      newest: { createdAt: -1, _id: -1 },
      oldest: { createdAt: 1, _id: 1 },
      priceAsc: { price: 1, _id: 1 },
      priceDesc: { price: -1, _id: -1 },
      nameAsc: { name: 1, _id: 1 },
    };
    const sort = sortMap[req.query.sort] || sortMap.newest;
    const [total, products] = await Promise.all([
      Product.countDocuments(filter).maxTimeMS(1500),
      Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).maxTimeMS(1500).lean(),
    ]);
    return res.json({ products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Error in getSearchedProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name, description, price, image, images, category, stock,
      sizes, colors, variants, fit, sizeChart,
    } = req.body;
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
        typeof category !== "string" || !category.trim() ||
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

    const imageInputs = (Array.isArray(images) ? images : image ? [image] : [])
      .filter((value) => typeof value === "string" && value.trim())
      .slice(0, 8);
    const uploadedImages = [];
    for (const imageInput of imageInputs) {
      if (/^https:\/\//i.test(imageInput)) {
        uploadedImages.push(imageInput);
      } else {
        const response = await cloudinary.uploader.upload(imageInput, { folder: "products" });
        if (response.secure_url) uploadedImages.push(response.secure_url);
      }
    }

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price: numericPrice,
      image: uploadedImages[0] || "",
      images: uploadedImages,
      category: category.trim(),
      sizes: normalizedSizes,
      colors: normalizedColors,
      variants: normalizedVariants,
      fit: normalizedFit,
      sizeChart: normalizedSizeChart,
      stock: normalizedVariants.length ? null : numericStock,
    });
    return res.status(201).json(product);
  } catch (error) {
    console.error("Error in createProduct controller", error.message);
    return res.status(500).json({ message: "Unable to create product" });
  }
};

export const updateProductStock = async (req, res) => {
  const stock = Number(req.body.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ message: "Stock must be a non-negative whole number" });
  }
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { stock } },
      { new: true, runValidators: true }
    ).select("_id stock");
    if (!product) return res.status(404).json({ message: "Product not found" });
    await updateFeaturedProductsCache();
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
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, variants: { $elemMatch: { size, color } } },
      { $set: { "variants.$.stock": stock } },
      { new: true, runValidators: true }
    ).select("_id variants");
    if (!product) return res.status(404).json({ message: "Product variant not found" });
    await updateFeaturedProductsCache();
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
    if (product.image) {
      try {
        const publicId = product.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`products/${publicId}`);
      } catch (error) {
        console.error("Error deleting product image", error.message);
      }
    }
    await Product.findByIdAndDelete(req.params.id);
    await updateFeaturedProductsCache();
    return res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error in deleteProduct controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getRecommendedProducts = async (_req, res) => {
  try {
    const cached = await readJsonCache("recommended_products_v1");
    if (Array.isArray(cached)) return res.json(cached);
    const products = await Product.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $sample: { size: 4 } },
      { $project: { _id: 1, name: 1, description: 1, image: 1, price: 1, category: 1, stock: 1 } },
    ]).option({ maxTimeMS: 1500 });
    await writeJsonCache("recommended_products_v1", products, 60);
    return res.json(products);
  } catch (error) {
    console.error("Error in getRecommendedProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    // Keep the public category endpoint bounded while preserving its response shape.
    const products = await Product.find({ category: req.params.category, isActive: { $ne: false } })
      .sort({ createdAt: -1, _id: -1 }).limit(200).maxTimeMS(1500).lean();
    return res.json({ products });
  } catch (error) {
    console.error("Error in getProductsByCategory controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    product.isFeatured = !product.isFeatured;
    await product.save();
    await updateFeaturedProductsCache();
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
    await writeJsonCache("featured_products_v2", products, 300);
  } catch (error) {
    console.error("Unable to refresh featured-products cache", error.message);
  }
}


export const getBestsellingProducts = async (req, res) => {
  const limit = clampInteger(req.query.limit, 8, 1, 24);
  const cacheKey = `bestselling_products_v1:${limit}`;
  const cached = await readJsonCache(cacheKey);
  if (Array.isArray(cached)) return res.json({ products: cached });
  try {
    const products = await Order.aggregate([
      { $match: { paymentStatus: "paid", status: "paid" } },
      { $unwind: "$products" },
      { $group: {
        _id: "$products.product",
        soldQuantity: { $sum: "$products.quantity" },
        orderIds: { $addToSet: "$_id" },
      } },
      { $addFields: { orderCount: { $size: "$orderIds" } } },
      { $lookup: {
        from: Product.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "product",
      } },
      { $unwind: "$product" },
      { $match: { "product.isActive": { $ne: false } } },
      { $sort: { soldQuantity: -1, orderCount: -1, _id: 1 } },
      { $limit: limit },
      { $replaceRoot: { newRoot: {
        $mergeObjects: [
          "$product",
          { soldQuantity: "$soldQuantity", orderCount: "$orderCount" },
        ],
      } } },
    ]).option({ maxTimeMS: 2500 });
    await writeJsonCache(cacheKey, products, 60);
    return res.json({ products });
  } catch (error) {
    console.error("Error loading best-selling products", error.message);
    return res.status(500).json({ message: "Unable to load best-selling products" });
  }
};
