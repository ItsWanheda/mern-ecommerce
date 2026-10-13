import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { getStripe } from "../lib/stripe.js";
import { calculateShippingFee, getShippingSettings } from "../lib/shipping.js";
import { createZarinpalCheckout } from "./zarinpal.controller.js";

const getCartProductId = (item) => item.product?.toString() || item._id?.toString();
const optionValue = (value) => typeof value === "string" ? value.trim() : "";
const findVariant = (product, size, color) => (product.variants || []).find((variant) =>
  optionValue(variant.size) === optionValue(size) && optionValue(variant.color) === optionValue(color)
);
const sameCartLine = (item, productId, size, color) =>
  getCartProductId(item) === productId &&
  optionValue(item.size) === optionValue(size) &&
  optionValue(item.color) === optionValue(color);
const getProvider = () => (process.env.PAYMENT_PROVIDER || "stripe").toLowerCase();
const getCurrency = () => (process.env.STORE_CURRENCY || "USD").toUpperCase();

export const createCheckoutSession = async (req, res) => {
  if (getProvider() === "zarinpal") return createZarinpalCheckout(req, res);
  if (getCurrency() !== "USD") {
    return res.status(503).json({ message: "Stripe checkout requires STORE_CURRENCY=USD. For Iranian Toman prices, configure Zarinpal." });
  }

  try {
    const cartItems = req.user.cartItems || [];
    if (!cartItems.length) return res.status(400).json({ message: "Your cart is empty" });

    const productIds = cartItems.map(getCartProductId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds }, isActive: { $ne: false } }).lean();
    const productsById = new Map(products.map((product) => [product._id.toString(), product]));
    const checkoutProducts = cartItems.map((item) => {
      const id = getCartProductId(item);
      const product = id && productsById.get(id);
      const quantity = Number(item.quantity);
      const size = optionValue(item.size);
      const color = optionValue(item.color);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return null;
      const hasVariant = (product.variants || []).length > 0;
      const selectedVariant = hasVariant ? findVariant(product, size, color) : null;
      if (hasVariant && !selectedVariant) return null;
      const availableStock = selectedVariant ? selectedVariant.stock : product.stock;
      if (typeof availableStock === "number" && availableStock < quantity) return null;
      if (!Number.isFinite(product.price) || product.price < 0) return null;
      return { product, quantity, size, color, hasVariant };
    });

    if (checkoutProducts.some((item) => !item)) {
      return res.status(409).json({ message: "Your cart includes an unavailable product or a quantity that exceeds stock. Refresh your cart and try again." });
    }

    const subtotal = checkoutProducts.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const couponCode = typeof req.body.couponCode === "string" ? req.body.couponCode.trim() : "";
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
      if (!coupon) return res.status(400).json({ message: "Coupon is invalid or unavailable" });
      if (coupon.expirationDate <= new Date()) {
        coupon.isActive = false;
        await coupon.save();
        return res.status(400).json({ message: "Coupon expired" });
      }
    }

    const discountedSubtotal = coupon
      ? subtotal * (1 - Number(coupon.discountPercentage) / 100)
      : subtotal;
    const shippingSettings = await getShippingSettings();
    const shippingFee = calculateShippingFee(discountedSubtotal, shippingSettings);
    const lineItems = checkoutProducts.map(({ product, quantity, size, color }) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: [product.name, size && "Size: " + size, color && "Color: " + color].filter(Boolean).join(" / "),
          images: product.image ? [product.image] : [],
        },
        unit_amount: Math.round(product.price * 100),
      },
      quantity,
    }));

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
      ...(shippingFee > 0 ? {
        shipping_options: [{
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: Math.round(shippingFee * 100), currency: "usd" },
            display_name: "Shipping",
          },
        }],
      } : {}),
      ...(coupon && Number(coupon.discountPercentage) > 0
        ? { discounts: [{ coupon: await createStripeCoupon(coupon.discountPercentage) }] }
        : {}),
      metadata: {
        userId: req.user._id.toString(),
        couponCode: coupon?.code || "",
        products: JSON.stringify(checkoutProducts.map(({ product, quantity, size, color, hasVariant }) => ({
          id: product._id.toString(),
          quantity,
          price: product.price,
          size,
          color,
          hasVariant,
        }))),
      },
    });

    return res.status(200).json({ id: session.id, totalAmount: session.amount_total / 100 });
  } catch (error) {
    console.error("Error processing checkout:", error.message);
    return res.status(500).json({ message: "Unable to start checkout" });
  }
};

const decrementInventory = async (items) => {
  const ids = items.map((item) => item.id);
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((product) => [product._id.toString(), product]));
  const changed = [];

  for (const item of items) {
    const product = byId.get(item.id);
    if (!product) {
      await restoreInventory(changed);
      return { ok: false };
    }
    const hasVariant = item.hasVariant || (product.variants || []).length > 0;
    if (hasVariant) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.id,
          variants: { $elemMatch: {
            size: optionValue(item.size),
            color: optionValue(item.color),
            stock: { $gte: item.quantity },
          } },
        },
        { $inc: { "variants.$.stock": -item.quantity } },
        { new: true }
      ).lean();
      if (!updated) {
        await restoreInventory(changed);
        return { ok: false };
      }
      changed.push({ id: item.id, quantity: item.quantity, size: optionValue(item.size), color: optionValue(item.color), hasVariant: true });
      continue;
    }
    if (typeof product.stock !== "number") continue; // legacy product without tracked stock
    const updated = await Product.findOneAndUpdate(
      { _id: item.id, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { new: true }
    ).lean();
    if (!updated) {
      await restoreInventory(changed);
      return { ok: false };
    }
    changed.push({ id: item.id, quantity: item.quantity, hasVariant: false });
  }
  return { ok: true, changed };
};

const restoreInventory = async (items) => {
  for (const item of items) {
    if (item.hasVariant) {
      await Product.updateOne(
        { _id: item.id, variants: { $elemMatch: { size: optionValue(item.size), color: optionValue(item.color) } } },
        { $inc: { "variants.$.stock": item.quantity } }
      );
    } else {
      await Product.updateOne({ _id: item.id }, { $inc: { stock: item.quantity } });
    }
  }
};

const removePurchasedItemsFromCart = async (user, purchasedItems) => {
  user.cartItems = user.cartItems.filter((item) =>
    !purchasedItems.some((purchased) =>
      sameCartLine(item, purchased.id, purchased.size, purchased.color)
    )
  );
  await user.save();
};

export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ message: "A valid session ID is required" });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.userId !== req.user._id.toString()) {
      return res.status(403).json({ message: "This checkout does not belong to you" });
    }
    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment has not been completed" });
    }

    const existingOrder = await Order.findOne({ stripeSessionId: session.id });
    if (existingOrder) return res.status(200).json({ success: true, orderId: existingOrder._id });

    const items = JSON.parse(session.metadata.products || "[]");
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Checkout product details are missing" });
    }
    const safeItems = items.map((item) => ({
      id: String(item.id || ""),
      quantity: Number(item.quantity),
      price: Number(item.price),
      size: optionValue(item.size),
      color: optionValue(item.color),
      hasVariant: item.hasVariant === true,
    }));
    if (safeItems.some((item) => !item.id || !Number.isInteger(item.quantity) || item.quantity < 1 ||
        !Number.isFinite(item.price) || item.price < 0)) {
      return res.status(400).json({ message: "Checkout product details are invalid" });
    }

    const inventory = await decrementInventory(safeItems);
    if (!inventory.ok) {
      if (session.payment_intent) {
        try {
          await getStripe().refunds.create({ payment_intent: session.payment_intent });
        } catch (refundError) {
          console.error("Automatic refund failed after inventory conflict", refundError.message);
          return res.status(502).json({ message: "Payment completed but inventory needs manual review. Contact support with your checkout session ID." });
        }
      }
      return res.status(409).json({ message: "Stock changed during checkout. The payment has been refunded; please refresh your cart." });
    }

    let newOrder;
    try {
      newOrder = await Order.create({
        user: req.user._id,
        products: safeItems.map((item) => ({
          product: item.id,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
          stockReserved: false,
        })),
        totalAmount: Number(session.amount_total || 0) / 100,
        shippingFee: Number(session.total_details?.amount_shipping || 0) / 100,
        currency: "USD",
        paymentProvider: "stripe",
        paymentStatus: "paid",
        status: "paid",
        couponCode: session.metadata.couponCode || "",
        stripeSessionId: session.id,
      });
    } catch (orderError) {
      await restoreInventory(inventory.changed);
      throw orderError;
    }

    if (session.metadata.couponCode) {
      await Coupon.findOneAndUpdate(
        { code: session.metadata.couponCode, userId: req.user._id, isActive: true },
        { $set: { isActive: false } }
      );
    }
    await removePurchasedItemsFromCart(req.user, safeItems);
    return res.status(200).json({ success: true, orderId: newOrder._id });
  } catch (error) {
    console.error("Error processing successful checkout:", error.message);
    return res.status(500).json({ message: "Unable to finalize paid checkout" });
  }
};

async function createStripeCoupon(discountPercentage) {
  const coupon = await getStripe().coupons.create({ percent_off: discountPercentage, duration: "once" });
  return coupon.id;
}
