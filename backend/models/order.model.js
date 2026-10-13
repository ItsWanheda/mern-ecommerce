import mongoose from "mongoose";

const orderProductSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    size: { type: String, trim: true, default: "" },
    color: { type: String, trim: true, default: "" },
    hasVariant: { type: Boolean, default: false },
    stockReserved: { type: Boolean, default: false },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    products: { type: [orderProductSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: "IRT", enum: ["USD", "IRT", "IRR"] },
    paymentProvider: { type: String, enum: ["stripe", "zarinpal"], default: "zarinpal" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "expired"], default: "pending" },
    paymentRequestStatus: { type: String, enum: ["not_started", "in_flight", "accepted", "unknown", "rejected", "expired"], default: "not_started" },
    paymentRequestAttemptedAt: { type: Date, default: null },
    status: { type: String, enum: ["pending", "paid", "failed", "cancelled", "expired"], default: "pending" },
    couponCode: { type: String, default: "" },
    stripeSessionId: { type: String, unique: true, sparse: true },
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

export default mongoose.model("Order", orderSchema);
