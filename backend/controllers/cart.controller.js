import Product from "../models/product.model.js";

const getCartProductId = (item) => item.product?.toString() || item._id?.toString();
const isStockTracked = (product) => typeof product.stock === "number" && Number.isFinite(product.stock);

export const getCartProducts = async (req, res) => {
  try {
    const cartItems = req.user.cartItems || [];
    const productIds = cartItems.map(getCartProductId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds }, isActive: { $ne: false } }).lean();
    const productsById = new Map(products.map((product) => [product._id.toString(), product]));
    return res.json(cartItems.map((item) => {
      const id = getCartProductId(item);
      const product = id && productsById.get(id);
      return product ? { ...product, quantity: item.quantity } : null;
    }).filter(Boolean));
  } catch (error) {
    console.error("Error in getCartProducts controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId || typeof productId !== "string") {
      return res.status(400).json({ message: "Product ID is required" });
    }
    const product = await Product.findOne({ _id: productId, isActive: { $ne: false } }).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    const user = req.user;
    const existingItem = user.cartItems.find((item) => getCartProductId(item) === productId);
    const nextQuantity = (existingItem?.quantity || 0) + 1;
    if (isStockTracked(product) && nextQuantity > product.stock) {
      return res.status(409).json({ message: product.stock === 0 ? "این محصول موجود نیست" : "تعداد درخواستی بیشتر از موجودی محصول است" });
    }

    if (existingItem) existingItem.quantity = nextQuantity;
    else user.cartItems.push({ product: productId, quantity: 1 });
    await user.save();
    return res.json(user.cartItems);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid product ID" });
    console.error("Error in addToCart controller", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;
    if (!productId) user.cartItems = [];
    else user.cartItems = user.cartItems.filter((item) => getCartProductId(item) !== productId);
    await user.save();
    return res.json(user.cartItems);
  } catch (error) {
    console.error("Error removing cart items", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100) {
      return res.status(400).json({ message: "Quantity must be an integer between 0 and 100" });
    }

    const user = req.user;
    const existingItem = user.cartItems.find((item) => getCartProductId(item) === productId);
    if (!existingItem) return res.status(404).json({ message: "Product not found in cart" });

    if (quantity > 0) {
      const product = await Product.findOne({ _id: productId, isActive: { $ne: false } }).lean();
      if (!product) return res.status(404).json({ message: "Product not found" });
      if (isStockTracked(product) && quantity > product.stock) {
        return res.status(409).json({ message: "تعداد درخواستی بیشتر از موجودی محصول است" });
      }
    }

    if (quantity === 0) user.cartItems = user.cartItems.filter((item) => getCartProductId(item) !== productId);
    else existingItem.quantity = quantity;
    await user.save();
    return res.json(user.cartItems);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid product ID" });
    console.error("Error updating cart quantity", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
