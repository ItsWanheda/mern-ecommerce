import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";

export const normalizeCouponCode = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

export const calculateCouponDiscount = (coupon, subtotal) => {
  const base = Number(subtotal);
  const percentage = Number(coupon?.discountPercentage);
  if (!Number.isSafeInteger(base) || base < 0 || !Number.isFinite(percentage) || percentage <= 0) return 0;
  const rawDiscount = Math.round(base * percentage / 100);
  const cap = coupon?.maxDiscountAmount == null ? null : Number(coupon.maxDiscountAmount);
  return Math.min(rawDiscount, Number.isSafeInteger(cap) && cap >= 0 ? cap : Number.MAX_SAFE_INTEGER, base);
};

export const couponEligibilityError = (coupon, subtotal, now = new Date()) => {
  if (!coupon) return "کد تخفیف معتبر نیست.";
  if (!coupon.isActive) return "این کد تخفیف غیرفعال است.";
  const startsAt = coupon.startsAt ? new Date(coupon.startsAt) : null;
  const expiresAt = coupon.expiresAt ? new Date(coupon.expiresAt) : null;
  if (startsAt && startsAt > now) return "زمان استفاده از این کد تخفیف هنوز نرسیده است.";
  if (!expiresAt || !Number.isFinite(expiresAt.getTime()) || expiresAt <= now) return "این کد تخفیف منقضی شده است.";
  if (Number(coupon.minOrderAmount || 0) > Number(subtotal)) return "مبلغ سبد خرید برای استفاده از این کد تخفیف کافی نیست.";
  const limit = coupon.usageLimit == null ? null : Number(coupon.usageLimit);
  const used = Math.max(0, Number(coupon.usageCount) || 0);
  const reserved = Math.max(0, Number(coupon.reservedCount) || 0);
  if (limit !== null && used + reserved >= limit) return "ظرفیت استفاده از این کد تخفیف تکمیل شده است.";
  return "";
};

export const reserveCoupon = async (codeInput, subtotal, now = new Date()) => {
  const code = normalizeCouponCode(codeInput);
  if (!code) return { coupon: null, discountAmount: 0, error: "" };

  let coupon = await Coupon.findOne({ code }).lean();
  const error = couponEligibilityError(coupon, subtotal, now);
  if (error) return { coupon: null, discountAmount: 0, error };

  const filter = {
    code,
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gt: now },
    minOrderAmount: { $lte: subtotal },
  };
  filter.$expr = {
    $or: [
      { $eq: [{ $ifNull: ["$usageLimit", null] }, null] },
      {
        $lt: [
          { $add: [{ $ifNull: ["$usageCount", 0] }, { $ifNull: ["$reservedCount", 0] }] },
          "$usageLimit",
        ],
      },
    ],
  };

  coupon = await Coupon.findOneAndUpdate(filter, { $inc: { reservedCount: 1 } }, { new: true });
  if (!coupon) {
    const current = await Coupon.findOne({ code }).lean();
    return {
      coupon: null,
      discountAmount: 0,
      error: couponEligibilityError(current, subtotal, now) || "امکان رزرو این کد تخفیف وجود ندارد؛ دوباره تلاش کنید.",
    };
  }
  return { coupon, discountAmount: calculateCouponDiscount(coupon, subtotal), error: "" };
};

export const releaseCouponReservationForOrder = async (orderId) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, couponReservationStatus: "reserved" },
    { $set: { couponReservationStatus: "released" } },
    { new: true }
  ).select("couponCode").lean();
  if (!order?.couponCode) return false;

  const result = await Coupon.updateOne(
    { code: order.couponCode, reservedCount: { $gt: 0 } },
    { $inc: { reservedCount: -1 } }
  );
  if (!result.modifiedCount) {
    throw new Error("Coupon reservation counter could not be released");
  }
  return true;
};

export const redeemCouponReservationForOrder = async (orderId) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: "paid", couponReservationStatus: "reserved" },
    { $set: { couponReservationStatus: "redeemed" } },
    { new: true }
  ).select("couponCode").lean();
  if (!order?.couponCode) return false;

  const result = await Coupon.updateOne(
    { code: order.couponCode, reservedCount: { $gt: 0 } },
    { $inc: { reservedCount: -1, usageCount: 1 } }
  );
  if (!result.modifiedCount) {
    await Order.updateOne(
      { _id: orderId, couponReservationStatus: "redeemed" },
      { $set: { couponReservationStatus: "reserved" } }
    );
    throw new Error("Coupon redemption counter could not be updated");
  }
  return true;
};

export const releaseCouponReservationByCode = async (codeInput) => {
  const code = normalizeCouponCode(codeInput);
  if (!code) return false;
  const result = await Coupon.updateOne(
    { code, reservedCount: { $gt: 0 } },
    { $inc: { reservedCount: -1 } }
  );
  return result.modifiedCount === 1;
};
