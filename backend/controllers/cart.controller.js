import Product from "../models/product.model.js";

const getCartProductId = (item) => item.product?.toString() || item._id?.toString();

export const getCartProducts = async (req, res) => {
	try {
		const cartItems = req.user.cartItems || [];
		const productIds = cartItems.map(getCartProductId).filter(Boolean);
		const products = await Product.find({ _id: { $in: productIds } }).lean();
		const productsById = new Map(products.map((product) => [product._id.toString(), product]));

		const response = cartItems
			.map((item) => {
				const productId = getCartProductId(item);
				const product = productId && productsById.get(productId);
				return product ? { ...product, quantity: item.quantity } : null;
			})
			.filter(Boolean);

		res.json(response);
	} catch (error) {
		console.log("Error in getCartProducts controller", error.message);
		res.status(500).json({ message: "Server error" });
	}
};

export const addToCart = async (req, res) => {
	try {
		const { productId } = req.body;
		if (!productId) return res.status(400).json({ message: "Product ID is required" });

		const product = await Product.exists({ _id: productId });
		if (!product) return res.status(404).json({ message: "Product not found" });

		const user = req.user;
		const existingItem = user.cartItems.find((item) => getCartProductId(item) === productId);
		if (existingItem) {
			existingItem.quantity += 1;
		} else {
			user.cartItems.push({ product: productId, quantity: 1 });
		}

		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		console.log("Error in addToCart controller", error.message);
		res.status(500).json({ message: "Server error" });
	}
};

export const removeAllFromCart = async (req, res) => {
	try {
		const { productId } = req.body;
		const user = req.user;
		if (!productId) {
			user.cartItems = [];
		} else {
			user.cartItems = user.cartItems.filter((item) => getCartProductId(item) !== productId);
		}
		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		res.status(500).json({ message: "Server error" });
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

		if (quantity === 0) {
			user.cartItems = user.cartItems.filter((item) => getCartProductId(item) !== productId);
		} else {
			existingItem.quantity = quantity;
		}

		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		console.log("Error in updateQuantity controller", error.message);
		res.status(500).json({ message: "Server error" });
	}
};
