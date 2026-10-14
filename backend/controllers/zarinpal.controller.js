import mongoose from "mongoose";
import { timingSafeEqual } from "node:crypto";
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import { calculateShippingFee, getShippingSettings } from "../lib/shipping.js";

const isSandbox = () => process.env.ZARINPAL_SANDBOX === "true";
const isTomanCatalogConfirmed = () => process.env.IRT_CATALOG_PRICES_CONFIRMED === "true";
const apiBase = () => isSandbox()
  ? "https://sandbox.zarinpal.com/pg/v4/payment"
  : "https://api.zarinpal.com/pg/v4/payment";
const startPayBase = () => isSandbox()
  ? "https://sandbox.zarinpal.com/pg/StartPay"
  : "https://www.zarinpal.com/pg/StartPay";
const isTracked = (product) => typeof product.stock === "number" && Number.isFinite(product.stock);
const cartProductId = (item) => item.product?.toString() || item._id?.toString();
const optionValue = (value) => typeof value === "string" ? value.trim() : "";
const findVariant = (product, size, color) => (product.variants || []).find((variant) =>
  optionValue(variant.size) === optionValue(size) && optionValue(variant.color) === optionValue(color)
);
const sameCartLine = (item, productId, size, color) =>
  cartProductId(item) === productId &&
  optionValue(item.size) === optionValue(size) &&
  optionValue(item.color) === optionValue(color);
const safeClientUrl = () => (process.env.CLIENT_URL || "").replace(/\/$/, "");

export const getPaymentConfiguration = (_req, res) => {
  const configured = Boolean(
    process.env.ZARINPAL_MERCHANT_ID &&
    process.env.API_URL &&
    safeClientUrl() &&
    isTomanCatalogConfirmed()
  );
  return res.json({
    provider: "zarinpal",
    currency: "IRT",
    configured,
    message: configured
      ? ""
      : "برای پرداخت، شناسه پذیرنده زرین‌پال، API_URL و CLIENT_URL را تنظیم کنید؛ پس از بازبینی قیمت‌های واقعی، IRT_CATALOG_PRICES_CONFIRMED=true را فعال کنید.",
  });
};

const releaseReservedInventoryDirect = async (items = []) => {
  for (const item of items) {
    if (!item.stockReserved || !item.product || item.quantity <= 0) continue;
    if (item.hasVariant || item.size || item.color) {
      await Product.updateOne(
        { _id: item.product, variants: { $elemMatch: { size: optionValue(item.size), color: optionValue(item.color) } } },
        { $inc: { "variants.$.stock": item.quantity } }
      );
    } else {
      await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
    }
  }
};

const isTransactionUnsupported = (error) =>
  /Transaction numbers are only allowed|replica set|mongos|does not support transactions/i.test(error?.message || "");

const releaseReservedInventory = async (items = [], orderId = null) => {
  if (!orderId) return releaseReservedInventoryDirect(items);

  const session = await mongoose.startSession();
  let transactionUnsupported = false;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) return;
      let changed = false;
      for (let index = 0; index < order.products.length; index += 1) {
        const item = order.products[index];
        if (!item.stockReserved || !item.product || item.quantity <= 0) continue;
        const productExists = await Product.exists({ _id: item.product }).session(session);
        if (productExists) {
          let result;
          if (item.hasVariant || item.size || item.color) {
            result = await Product.updateOne(
              { _id: item.product, variants: { $elemMatch: { size: optionValue(item.size), color: optionValue(item.color) } } },
              { $inc: { "variants.$.stock": item.quantity } },
              { session }
            );
          } else {
            result = await Product.updateOne(
              { _id: item.product },
              { $inc: { stock: item.quantity } },
              { session }
            );
          }
          if (!result.matchedCount) throw new Error("RESERVED_INVENTORY_TARGET_NOT_FOUND");
        }
        item.stockReserved = false;
        changed = true;
      }
      if (changed) await order.save({ session });
    });
  } catch (error) {
    if (!isTransactionUnsupported(error)) throw error;
    transactionUnsupported = true;
    console.warn("MongoDB transactions are unavailable; using compatibility inventory release:", error.message);
  } finally {
    await session.endSession();
  }

  if (transactionUnsupported) {
    // Standalone local MongoDB has no transactions. Preserve local development;
    // production recovery is atomic on MongoDB Atlas/replica sets.
    await releaseReservedInventoryDirect(items);
    const updates = {};
    items.forEach((item, index) => {
      if (item.stockReserved) updates[`products.${index}.stockReserved`] = false;
    });
    if (Object.keys(updates).length) await Order.updateOne({ _id: orderId }, { $set: updates });
  }
};

const finalizePaidOrder = async (paidOrder) => {
  if (!paidOrder || paidOrder.finalizedAt) return;
  if (paidOrder.couponCode) {
    await Coupon.findOneAndUpdate(
      { code: paidOrder.couponCode, userId: paidOrder.user, isActive: true },
      { $set: { isActive: false } }
    );
  }
  const user = await User.findById(paidOrder.user);
  if (user) {
    user.cartItems = (user.cartItems || []).filter((item) =>
      !(paidOrder.products || []).some((purchased) =>
        sameCartLine(item, purchased.product.toString(), purchased.size, purchased.color)
      )
    );
    await user.save();
  }
  await Order.updateOne(
    { _id: paidOrder._id, paymentStatus: "paid", finalizedAt: null },
    { $set: { finalizedAt: new Date() } }
  );
};

const reserveInventory = async (items, productsById) => {
  const reserved = [];
  const orderItems = [];
  try {
    for (const item of items) {
      const id = cartProductId(item);
      const product = id && productsById.get(id);
      const quantity = Number(item.quantity);
      const size = optionValue(item.size);
      const color = optionValue(item.color);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 100 || product.isActive === false) {
        throw new Error("INVALID_CART");
      }
      const hasVariant = (product.variants || []).length > 0;
      const selectedVariant = hasVariant ? findVariant(product, size, color) : null;
      if (hasVariant && !selectedVariant) throw new Error("INVALID_CART");

      if (hasVariant) {
        const updated = await Product.findOneAndUpdate(
          {
            _id: product._id,
            isActive: { $ne: false },
            variants: { $elemMatch: { size, color, stock: { $gte: quantity } } },
          },
          { $inc: { "variants.$.stock": -quantity } },
          { new: true }
        ).lean();
        if (!updated) throw new Error("INSUFFICIENT_STOCK");
        reserved.push({ product: product._id, quantity, size, color, hasVariant: true, stockReserved: true });
        orderItems.push({ product: product._id, quantity, price: product.price, size, color, hasVariant: true, stockReserved: true });
      } else if (isTracked(product)) {
        const updated = await Product.findOneAndUpdate(
          { _id: product._id, isActive: { $ne: false }, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: true }
        ).lean();
        if (!updated) throw new Error("INSUFFICIENT_STOCK");
        reserved.push({ product: product._id, quantity, hasVariant: false, stockReserved: true });
        orderItems.push({ product: product._id, quantity, price: product.price, size, color, hasVariant: false, stockReserved: true });
      } else {
        orderItems.push({ product: product._id, quantity, price: product.price, size, color, hasVariant: false, stockReserved: false });
      }
    }
    return { orderItems, reserved };
  } catch (error) {
    await releaseReservedInventory(reserved);
    throw error;
  }
};
export const createZarinpalCheckout = async (req, res) => {
  if (!isTomanCatalogConfirmed()) {
    return res.status(503).json({ message: "پرداخت تا زمان تأیید قیمت‌های واقعی کاتالوگ به تومان غیرفعال است." });
  }
  if (!process.env.ZARINPAL_MERCHANT_ID || !process.env.API_URL || !safeClientUrl()) {
    return res.status(503).json({ message: "Zarinpal is not configured on the server" });
  }

  let reserved = [];
  let order = null;
  let gatewayRequestStarted = false;
  let gatewayRequestRejected = false;
  let receivedAuthority = "";
  try {
    const cartItems = req.user.cartItems || [];
    if (!cartItems.length) return res.status(400).json({ message: "سبد خرید خالی است" });

    const productIds = cartItems.map(cartProductId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds }, isActive: { $ne: false } }).lean();
    const productsById = new Map(products.map((product) => [product._id.toString(), product]));
    const validated = cartItems.map((item) => {
      const id = cartProductId(item);
      const product = id && productsById.get(id);
      const quantity = Number(item.quantity);
      const size = optionValue(item.size);
      const color = optionValue(item.color);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 100 ||
          !Number.isFinite(product.price) || product.price < 0 || !Number.isInteger(product.price)) return null;
      const hasVariant = (product.variants || []).length > 0;
      const selectedVariant = hasVariant ? findVariant(product, size, color) : null;
      if (hasVariant && (!selectedVariant || selectedVariant.stock < quantity)) return null;
      if (!hasVariant && isTracked(product) && product.stock < quantity) return null;
      return { productId: id, quantity, product, size, color, hasVariant };
    });
    if (validated.some((item) => !item)) {
      return res.status(409).json({ message: "موجودی یا اطلاعات یکی از کالاهای سبد خرید معتبر نیست؛ سبد خرید را به‌روزرسانی کنید." });
    }

    const subtotal = validated.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const couponCode = typeof req.body.couponCode === "string" ? req.body.couponCode.trim().toUpperCase() : "";
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
      if (!coupon) return res.status(400).json({ message: "کد تخفیف معتبر نیست" });
      if (coupon.expirationDate <= new Date()) {
        coupon.isActive = false;
        await coupon.save();
        return res.status(400).json({ message: "کد تخفیف منقضی شده است" });
      }
    }

    const discountedSubtotal = coupon
      ? Math.round(subtotal * (1 - Number(coupon.discountPercentage) / 100))
      : subtotal;
    const shippingSettings = await getShippingSettings();
    const shippingFee = calculateShippingFee(discountedSubtotal, shippingSettings);
    const totalToman = discountedSubtotal + shippingFee;
    if (!Number.isSafeInteger(totalToman) || totalToman <= 0) {
      return res.status(400).json({ message: "مبلغ سفارش باید مبلغی صحیح و بزرگ‌تر از صفر به تومان باشد" });
    }

    const reservations = await reserveInventory(validated.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
    })), productsById);
    reserved = reservations.reserved;
    const orderItems = reservations.orderItems;

    order = await Order.create({
      user: req.user._id,
      products: orderItems,
      totalAmount: totalToman,
      shippingFee,
      currency: "IRT",
      paymentProvider: "zarinpal",
      paymentStatus: "pending",
      status: "pending",
      couponCode: coupon?.code || "",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      paymentRequestStatus: "not_started",
    });

    order.paymentRequestStatus = "in_flight";
    order.paymentRequestAttemptedAt = new Date();
    await order.save();

    const callbackUrl = new URL("/api/payments/zarinpal/verify", process.env.API_URL);
    callbackUrl.searchParams.set("order_id", order._id.toString());
    gatewayRequestStarted = true;
    const gatewayResponse = await fetch(`${apiBase()}/request.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: process.env.ZARINPAL_MERCHANT_ID,
        amount: totalToman * 10,
        description: `Store order ${order._id}`,
        callback_url: callbackUrl.toString(),
        metadata: { email: req.user.email },
      }),
      signal: AbortSignal.timeout(12000),
    });

    let payload;
    try {
      payload = await gatewayResponse.json();
    } catch {
      throw new Error("ZARINPAL_REQUEST_AMBIGUOUS");
    }

    receivedAuthority = gatewayResponse.ok && payload?.data?.code === 100 && typeof payload?.data?.authority === "string"
      ? payload.data.authority
      : "";
    if (gatewayResponse.ok && payload?.data?.code === 100 && receivedAuthority) {
      order.zarinpalAuthority = receivedAuthority;
      order.paymentRequestStatus = "accepted";
      await order.save();
      reserved = [];
      return res.status(200).json({
        provider: "zarinpal",
        orderId: order._id,
        totalAmount: totalToman,
        redirectUrl: `${startPayBase()}/${encodeURIComponent(receivedAuthority)}`,
      });
    }

    // A structured provider validation/business error confirms rejection.
    // HTTP errors, timeouts, malformed responses, and unknown payloads do not.
    if (gatewayResponse.ok && Number.isInteger(payload?.errors?.code)) {
      gatewayRequestRejected = true;
      throw new Error("ZARINPAL_REQUEST_REJECTED");
    }
    throw new Error("ZARINPAL_REQUEST_AMBIGUOUS");
  } catch (error) {
    if (order && gatewayRequestStarted && !gatewayRequestRejected) {
      // The provider may have accepted the request even though our response or
      // local persistence failed. Never release inventory on this uncertain path.
      if (receivedAuthority) {
        const recovered = await Order.findOneAndUpdate(
          { _id: order._id, paymentStatus: "pending" },
          { $set: { zarinpalAuthority: receivedAuthority, paymentRequestStatus: "accepted" } },
          { new: true }
        ).catch(() => null);
        if (recovered?.zarinpalAuthority) {
          reserved = [];
          return res.status(200).json({
            provider: "zarinpal",
            orderId: order._id,
            totalAmount: order.totalAmount,
            redirectUrl: `${startPayBase()}/${encodeURIComponent(recovered.zarinpalAuthority)}`,
          });
        }
      }

      await Order.updateOne(
        { _id: order._id, paymentStatus: "pending" },
        { $set: { paymentRequestStatus: "unknown" } }
      ).catch((persistenceError) => {
        console.error("Unable to record ambiguous Zarinpal request state", persistenceError.message);
      });
      console.error("Zarinpal request outcome is ambiguous; keeping order pending", String(order._id), error.message);
      return res.status(202).json({
        status: "pending",
        orderId: order._id,
        message: "وضعیت درخواست پرداخت قطعی نیست؛ تا مشخص‌شدن وضعیت این سفارش، دوباره پرداخت نکنید.",
      });
    }

    if (order) {
      await Order.updateOne(
        { _id: order._id, paymentStatus: "pending" },
        {
          $set: {
            paymentStatus: "failed",
            status: "failed",
            paymentRequestStatus: gatewayRequestRejected ? "rejected" : "not_started",
          },
        }
      ).catch(() => {});
      await releaseReservedInventory(order.products, order._id).catch(() => {});
    } else {
      await releaseReservedInventory(reserved).catch(() => {});
    }
    console.error("Error creating Zarinpal checkout", error.message);
    if (error.message === "INSUFFICIENT_STOCK" || error.message === "INVALID_CART") {
      return res.status(409).json({ message: "موجودی یکی از کالاها تغییر کرده است؛ سبد خرید را دوباره بررسی کنید." });
    }
    if (gatewayRequestRejected) {
      return res.status(502).json({ message: "درگاه پرداخت درخواست را نپذیرفت؛ موجودی آزاد شد. لطفاً کمی بعد دوباره تلاش کنید." });
    }
    return res.status(502).json({ message: "شروع پرداخت ناموفق بود. لطفاً دوباره تلاش کنید." });
  }
};

export const verifyZarinpalPayment = async (req, res) => {
  const authority = typeof req.query.Authority === "string" ? req.query.Authority : "";
  const orderId = typeof req.query.order_id === "string" ? req.query.order_id : "";
  const resultBase = safeClientUrl();

  if (!resultBase) return res.status(503).send("CLIENT_URL is not configured");
  if (!mongoose.isValidObjectId(orderId) || !authority) {
    return res.redirect(`${resultBase}/purchase-cancel?provider=zarinpal&reason=invalid-callback`);
  }

  try {
    const order = await Order.findOne({
      _id: orderId,
      paymentProvider: "zarinpal",
      zarinpalAuthority: authority,
    });
    if (!order) return res.redirect(`${resultBase}/purchase-cancel?provider=zarinpal&reason=order-not-found`);
    if (order.paymentStatus === "paid") {
      await finalizePaidOrder(order);
      return res.redirect(`${resultBase}/purchase-success?provider=zarinpal&order_id=${order._id}`);
    }
    if (order.paymentStatus !== "pending") {
      return res.redirect(`${resultBase}/purchase-cancel?provider=zarinpal&order_id=${order._id}`);
    }

    const response = await fetch(`${apiBase()}/verify.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: process.env.ZARINPAL_MERCHANT_ID,
        amount: order.totalAmount * 10,
        authority,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const payload = await response.json().catch(() => ({}));
    const code = payload?.data?.code;
    if (!response.ok || !Number.isInteger(code)) {
      // An HTTP/network/provider response that cannot be classified is not
      // proof of a failed payment. Leave it pending for the reconciler.
      return res.redirect(`${resultBase}/purchase-cancel?provider=zarinpal&reason=verification-pending&order_id=${order._id}`);
    }
    if (code !== 100 && code !== 101) {
      if (!reconciliationTerminalUnpaidCodes.has(code)) {
        return res.redirect(`${resultBase}/purchase-cancel?provider=zarinpal&reason=verification-pending&order_id=${order._id}`);
      }
      const failed = await Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: "pending" },
        { $set: { paymentStatus: "failed", status: "failed" } },
        { new: true }
      );
      if (failed) await releaseReservedInventory(failed.products, failed._id);
      return res.redirect(`${resultBase}/purchase-cancel?provider=zarinpal&order_id=${order._id}`);
    }

    const paid = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: "pending" },
      {
        $set: {
          paymentStatus: "paid",
          status: "paid",
          paymentRequestStatus: "accepted",
          zarinpalRefId: String(payload?.data?.ref_id ?? ""),
        },
      },
      { new: true }
    );
    if (!paid) {
      const latest = await Order.findById(order._id).lean();
      if (latest?.paymentStatus === "paid") {
        return res.redirect(`${resultBase}/purchase-success?provider=zarinpal&order_id=${order._id}`);
      }
      return res.redirect(`${resultBase}/purchase-cancel?provider=zarinpal&order_id=${order._id}`);
    }

    await finalizePaidOrder(paid);
    return res.redirect(`${resultBase}/purchase-success?provider=zarinpal&order_id=${order._id}`);
  } catch (error) {
    console.error("Error verifying Zarinpal payment", error.message);
    return res.redirect(`${resultBase}/purchase-cancel?provider=zarinpal&reason=verification-error`);
  }
};


export const getZarinpalOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  if (!mongoose.isValidObjectId(orderId)) {
    return res.status(400).json({ message: "Invalid order ID" });
  }
  try {
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      paymentProvider: "zarinpal",
    }).select("_id paymentStatus status totalAmount currency createdAt").lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json({
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      status: order.status,
      currency: order.currency,
      totalAmount: order.totalAmount,
      paid: order.paymentStatus === "paid",
    });
  } catch (error) {
    console.error("Error loading Zarinpal order status", error.message);
    return res.status(500).json({ message: "Unable to load order status" });
  }
};


const reconciliationTerminalUnpaidCodes = new Set([-11, -12, -21, -22, -42]);

export const reconcilePendingZarinpalOrders = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return res.status(503).json({ message: "CRON_SECRET is not configured" });

  const authorization = typeof req.headers?.authorization === "string" ? req.headers.authorization : "";
  const suppliedBuffer = Buffer.from(authorization.replace(/^Bearer\s+/i, ""));
  const expectedBuffer = Buffer.from(cronSecret);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const summary = {
    stockReservationsRecovered: 0,
    paidOrdersFinalized: 0,
    paymentsRecovered: 0,
    ordersExpired: 0,
    deferredForRetry: 0,
    failures: 0,
  };

  try {
    const strandedOrders = await Order.find({
      paymentProvider: "zarinpal",
      paymentStatus: { $in: ["failed", "expired"] },
      products: { $elemMatch: { stockReserved: true } },
    }).sort({ updatedAt: 1 }).limit(10).lean();

    for (const order of strandedOrders) {
      try {
        await releaseReservedInventory(order.products, order._id);
        summary.stockReservationsRecovered += 1;
      } catch (error) {
        summary.failures += 1;
        console.error("Pending inventory restoration needs retry", String(order._id), error.message);
      }
    }

    const unfinalizedPaidOrders = await Order.find({
      paymentProvider: "zarinpal", paymentStatus: "paid", finalizedAt: null,
    }).sort({ updatedAt: 1 }).limit(10).lean();

    for (const order of unfinalizedPaidOrders) {
      try {
        await finalizePaidOrder(order);
        summary.paidOrdersFinalized += 1;
      } catch (error) {
        summary.failures += 1;
        console.error("Paid order finalization needs retry", String(order._id), error.message);
      }
    }

    const expiredPendingOrders = await Order.find({
      paymentProvider: "zarinpal",
      paymentStatus: "pending",
      expiresAt: { $lte: new Date() },
    }).sort({ expiresAt: 1, createdAt: 1 }).limit(10).lean();

    for (const order of expiredPendingOrders) {
      try {
        if (!order.zarinpalAuthority) {
          const expired = await Order.findOneAndUpdate(
            { _id: order._id, paymentStatus: "pending", zarinpalAuthority: { $in: [null, ""] } },
            { $set: { paymentStatus: "expired", status: "expired", paymentRequestStatus: "expired" } },
            { new: true }
          );
          if (expired) {
            summary.ordersExpired += 1;
            await releaseReservedInventory(expired.products, expired._id);
          }
          continue;
        }

        const response = await fetch(`${apiBase()}/verify.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: process.env.ZARINPAL_MERCHANT_ID,
            amount: order.totalAmount * 10,
            authority: order.zarinpalAuthority,
          }),
          signal: AbortSignal.timeout(5000),
        });
        const payload = await response.json().catch(() => null);
        const code = payload?.data?.code;

        if (!response.ok || !Number.isInteger(code)) {
          summary.deferredForRetry += 1;
          continue;
        }

        if (code === 100 || code === 101) {
          const paid = await Order.findOneAndUpdate(
            { _id: order._id, paymentStatus: "pending" },
            { $set: {
              paymentStatus: "paid",
              status: "paid",
              paymentRequestStatus: "accepted",
              zarinpalRefId: String(payload?.data?.ref_id ?? order.zarinpalRefId ?? ""),
            } },
            { new: true }
          );
          if (paid) {
            await finalizePaidOrder(paid);
            summary.paymentsRecovered += 1;
          } else {
            const current = await Order.findById(order._id).lean();
            if (current?.paymentStatus === "paid" && !current.finalizedAt) {
              await finalizePaidOrder(current);
              summary.paidOrdersFinalized += 1;
            }
          }
          continue;
        }

        // Unknown/provider-configuration errors are deferred so stock is never
        // released solely because verification timed out or returned an unknown code.
        if (reconciliationTerminalUnpaidCodes.has(code)) {
          const expired = await Order.findOneAndUpdate(
            { _id: order._id, paymentStatus: "pending" },
            { $set: { paymentStatus: "expired", status: "expired" } },
            { new: true }
          );
          if (expired) {
            summary.ordersExpired += 1;
            await releaseReservedInventory(expired.products, expired._id);
          }
        } else {
          summary.deferredForRetry += 1;
        }
      } catch (error) {
        summary.failures += 1;
        console.error("Payment reconciliation item needs retry", String(order._id), error.message);
      }
    }

    return res.status(200).json({ success: summary.failures === 0, ...summary });
  } catch (error) {
    console.error("Payment reconciliation failed", error.message);
    return res.status(500).json({ message: "Payment reconciliation failed" });
  }
};
