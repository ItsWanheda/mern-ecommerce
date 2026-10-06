import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { stripe } from "../lib/stripe.js";

const getCartProductId = (item) => item.product?.toString() || item._id?.toString();

export const createCheckoutSession = async (req, res) => {
	try {
		const cartItems = req.user.cartItems || [];
		if (cartItems.length === 0) {
			return res.status(400).json({ message: "Your cart is empty" });
		}

		const productIds = cartItems.map(getCartProductId).filter(Boolean);
		const products = await Product.find({ _id: { $in: productIds } }).lean();
		const productsById = new Map(products.map((product) => [product._id.toString(), product]));
		const checkoutProducts = cartItems.map((item) => {
			const id = getCartProductId(item);
			const product = id && productsById.get(id);
			const quantity = Number(item.quantity);
			if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return null;
			return { product, quantity };
		});

		if (checkoutProducts.some((item) => !item)) {
			return res.status(400).json({ message: "Your cart contains invalid or unavailable products" });
		}

		const lineItems = checkoutProducts.map(({ product, quantity }) => ({
			price_data: {
				currency: "usd",
				product_data: { name: product.name, images: product.image ? [product.image] : [] },
				unit_amount: Math.round(product.price * 100),
			},
			quantity,
		}));

		const couponCode = typeof req.body.couponCode === "string" ? req.body.couponCode.trim() : null;
		const coupon = couponCode
			? await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true })
			: null;
		if (coupon && coupon.expirationDate < new Date()) {
			coupon.isActive = false;
			await coupon.save();
			return res.status(400).json({ message: "Coupon expired" });
		}

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items: lineItems,
			mode: "payment",
			success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
			discounts: coupon ? [{ coupon: await createStripeCoupon(coupon.discountPercentage) }] : [],
			metadata: {
				userId: req.user._id.toString(),
				couponCode: coupon?.code || "",
				products: JSON.stringify(
					checkoutProducts.map(({ product, quantity }) => ({
						id: product._id.toString(),
						quantity,
						price: product.price,
					}))
				),
			},
		});

		res.status(200).json({ id: session.id, totalAmount: session.amount_total / 100 });
	} catch (error) {
		console.error("Error processing checkout:", error);
		res.status(500).json({ message: "Error processing checkout" });
	}
};

export const checkoutSuccess = async (req, res) => {
	try {
		const { sessionId } = req.body;
		if (!sessionId || typeof sessionId !== "string") {
			return res.status(400).json({ message: "A valid session ID is required" });
		}

		const session = await stripe.checkout.sessions.retrieve(sessionId);
		if (session.metadata?.userId !== req.user._id.toString()) {
			return res.status(403).json({ message: "This checkout does not belong to you" });
		}
		if (session.payment_status !== "paid") {
			return res.status(400).json({ message: "Payment has not been completed" });
		}

		const existingOrder = await Order.findOne({ stripeSessionId: session.id });
		if (existingOrder) {
			return res.status(200).json({ success: true, orderId: existingOrder._id });
		}

		const products = JSON.parse(session.metadata.products);
		const newOrder = await Order.create({
			user: req.user._id,
			products: products.map((product) => ({
				product: product.id,
				quantity: product.quantity,
				price: product.price,
			})),
			totalAmount: session.amount_total / 100,
			stripeSessionId: session.id,
		});

		if (session.metadata.couponCode) {
			await Coupon.findOneAndUpdate(
				{ code: session.metadata.couponCode, userId: req.user._id, isActive: true },
				{ isActive: false }
			);
		}
		req.user.cartItems = [];
		await req.user.save();

		res.status(200).json({ success: true, orderId: newOrder._id });
	} catch (error) {
		console.error("Error processing successful checkout:", error);
		res.status(500).json({ message: "Error processing successful checkout" });
	}
};

async function createStripeCoupon(discountPercentage) {
	const coupon = await stripe.coupons.create({ percent_off: discountPercentage, duration: "once" });
	return coupon.id;
}
