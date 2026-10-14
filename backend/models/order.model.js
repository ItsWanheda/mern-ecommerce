import mongoose from "mongoose";

const orderProductSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    size: { type: String, trim: true, default: "" },
    color: { type: String, trim: true, default: "" },
    productName: { type: String, trim: true, maxlength: 160, default: "" },
    image: { type: String, trim: true, maxlength: 2048, default: "" },
    hasVariant: { type: Boolean, default: false },
    stockReserved: { type: Boolean, default: false },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    recipientName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, match: /^09\d{9}$/ },
    province: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    district: { type: String, trim: true, maxlength: 80, default: "" },
    addressLine: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
    postalCode: { type: String, required: true, match: /^\d{10}$/ },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { _id: false }
);

const shipmentEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["processing", "packed", "shipped", "delivered", "returned"], required: true },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    products: { type: [orderProductSchema], required: true },
    shippingAddress: { type: shippingAddressSchema, default: undefined },
    shipmentStatus: { type: String, enum: ["not_ready", "processing", "packed", "shipped", "delivered", "returned"] },
    shippingCarrier: { type: String, trim: true, maxlength: 100, default: "" },
    trackingCode: { type: String, trim: true, maxlength: 120, default: "" },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    shipmentEvents: { type: [shipmentEventSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, min: 0, default: 0 },
    // Legacy Stripe orders have no currency/provider fields. Do not infer Toman for them.
    currency: { type: String, default: undefined },
    paymentProvider: { type: String, default: undefined },
    // Keep the old session identifier readable for historical order display and migration.
    // The legacy unique index must be handled by scripts/migrate-legacy-stripe-index.mjs.
    stripeSessionId: { type: String, default: undefined },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "expired"] },
    paymentRequestStatus: { type: String, enum: ["not_started", "in_flight", "accepted", "unknown", "rejected", "expired"] },
    paymentRequestAttemptedAt: { type: Date, default: null },
    status: { type: String, enum: ["pending", "paid", "failed", "cancelled", "expired"] },
    couponCode: { type: String, default: "" },
    zarinpalAuthority: { type: String, unique: true, sparse: true },
    zarinpalRefId: { type: String, default: "" },
    expiresAt: { type: Date, default: null },
    // Set only after post-payment cleanup (coupon/cart) is successfully completed.
    finalizedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, paymentProvider: 1, createdAt: 1 });
orderSchema.index({ paymentProvider: 1, paymentStatus: 1, expiresAt: 1 });
orderSchema.index({ paymentProvider: 1, paymentRequestStatus: 1, expiresAt: 1 });
orderSchema.index({ paymentProvider: 1, paymentStatus: 1, finalizedAt: 1 });
orderSchema.index({ paymentStatus: 1, shipmentStatus: 1, createdAt: -1 });

export default mongoose.model("Order", orderSchema);
