import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";

const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");

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
  try {
    const cacheKey = "featured_products_v2";
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
    const featuredProducts = await Product.find({ isFeatured: true, isActive: { $ne: false } })
      .sort({ createdAt: -1 }).lean();
    await redis.set(cacheKey, JSON.stringify(featuredProducts), "EX", 300);
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
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim().slice(0, 64) : "";
    const page = clampInteger(req.query.page, 1, 1, 100000);
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
      const expression = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: expression }, { description: expression }, { category: expression }];
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
      Product.countDocuments(filter),
      Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return res.json({ products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Error in getSearchedProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category, stock } = req.body;
    const numericPrice = Number(price);
    const numericStock = stock === "" || stock === undefined || stock === null ? null : Number(stock);
    if (!name?.trim() || !description?.trim() || !category?.trim() ||
        !Number.isFinite(numericPrice) || numericPrice < 0 ||
        (numericStock !== null && (!Number.isInteger(numericStock) || numericStock < 0))) {
      return res.status(400).json({ message: "Provide valid product details, price, and stock" });
    }
    let imageUrl = "";
    if (image) {
      const response = await cloudinary.uploader.upload(image, { folder: "products" });
      imageUrl = response.secure_url || "";
    }
    const product = await Product.create({
      name: name.trim(), description: description.trim(), price: numericPrice,
      image: imageUrl, category: category.trim(), stock: numericStock,
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
    return res.json({ _id: product._id, stock: product.stock });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid product ID" });
    console.error("Error updating product stock", error.message);
    return res.status(500).json({ message: "Unable to update stock" });
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
    const products = await Product.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $sample: { size: 4 } },
      { $project: { _id: 1, name: 1, description: 1, image: 1, price: 1, category: 1, stock: 1 } },
    ]);
    return res.json(products);
  } catch (error) {
    console.error("Error in getRecommendedProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category, isActive: { $ne: false } })
      .sort({ createdAt: -1 }).lean();
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
      .sort({ createdAt: -1 }).lean();
    await redis.set("featured_products_v2", JSON.stringify(products), "EX", 300);
  } catch (error) {
    console.error("Unable to refresh featured-products cache", error.message);
  }
}
