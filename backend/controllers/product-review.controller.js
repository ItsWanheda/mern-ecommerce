import Product from "../models/product.model.js";
import ProductReview from "../models/product-review.model.js";
import Order from "../models/order.model.js";
import { prisma } from "../lib/prisma.js";
import { isValidDatabaseId as isValidObjectId } from "../lib/prisma-model.js";

const eligibility = async (userId, productId) => {
  const prior = await ProductReview.findOne({ user: userId, product: productId }).select("status").lean();
  if (prior) return { eligible: false, reason: prior.status === "pending" ? "دیدگاه قبلی شما در انتظار تأیید مدیریت است." : "برای هر محصول فقط یک دیدگاه قابل ثبت است." };
  const order = await Order.findOne({
    user: userId, paymentProvider: "zarinpal", currency: "IRT", paymentStatus: "paid",
    status: "paid", shipmentStatus: "delivered", products: { $elemMatch: { product: productId } },
  }).select("_id").sort({ deliveredAt: -1, createdAt: -1 }).lean();
  return order ? { eligible: true, orderId: order._id, reason: "" }
    : { eligible: false, reason: "برای ثبت دیدگاه باید سفارش پرداخت‌شده این محصول به شما تحویل شده باشد." };
};

export const getProductReviews = async (req, res) => {
  if (!isValidObjectId(req.params.productId)) return res.status(400).json({ message: "شناسه محصول معتبر نیست." });
  try {
    const product = await Product.findOne({ _id: req.params.productId, isActive: { $ne: false } }).select("_id").lean();
    if (!product) return res.status(404).json({ message: "محصول پیدا نشد." });
    const [reviews, groups] = await Promise.all([
      ProductReview.find({ product: product._id, status: "approved" }).select("rating comment displayName createdAt verifiedPurchase").sort({ createdAt: -1 }).limit(50).lean(),
      prisma.productReview.groupBy({ by: ["rating"], where: { productId: product._id, status: "approved" }, _count: { _all: true }, _sum: { rating: true } }),
    ]);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let count = 0, sum = 0;
    for (const group of groups) {
      distribution[group.rating] = group._count._all;
      count += group._count._all;
      sum += group._sum.rating || 0;
    }
    return res.json({ reviews, summary: { count, average: count ? Number((sum / count).toFixed(2)) : 0, distribution } });
  } catch (error) {
    console.error("Unable to load product reviews", error.message);
    return res.status(500).json({ message: "دریافت دیدگاه‌ها انجام نشد." });
  }
};

export const getProductReviewSummaries = async (req, res) => {
  const rawIds = typeof req.query.ids === "string" ? req.query.ids.split(",").filter(Boolean) : [];
  const ids = [...new Set(rawIds)].slice(0, 48);
  if (rawIds.length > 48 || ids.some(id => !isValidObjectId(id))) return res.status(400).json({ message: "شناسه محصولات برای دریافت امتیاز معتبر نیست." });
  if (!ids.length) return res.json({ summaries: {} });
  try {
    const groups = await prisma.productReview.groupBy({
      by: ["productId"], where: { productId: { in: ids }, status: "approved" },
      _avg: { rating: true }, _count: { _all: true },
    });
    const summaries = Object.fromEntries(ids.map(id => [id, { average: 0, count: 0 }]));
    for (const group of groups) summaries[group.productId] = {
      average: Number((group._avg.rating || 0).toFixed(1)), count: group._count._all,
    };
    return res.json({ summaries });
  } catch (error) {
    console.error("Unable to load product review summaries", error.message);
    return res.status(500).json({ message: "دریافت امتیاز محصولات انجام نشد." });
  }
};

export const getReviewEligibility = async (req, res) => {
  if (!isValidObjectId(req.params.productId)) return res.status(400).json({ message: "شناسه محصول معتبر نیست." });
  try {
    const result = await eligibility(req.user._id, req.params.productId);
    return res.json({ eligible: result.eligible, reason: result.reason });
  } catch (error) {
    console.error("Unable to check review eligibility", error.message);
    return res.status(500).json({ message: "بررسی شرایط ثبت دیدگاه انجام نشد." });
  }
};

export const createProductReview = async (req, res) => {
  const { productId } = req.params;
  const rating = Number(req.body?.rating);
  const comment = typeof req.body?.comment === "string" ? req.body.comment.trim() : "";
  if (!isValidObjectId(productId)) return res.status(400).json({ message: "شناسه محصول معتبر نیست." });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "امتیاز باید بین ۱ تا ۵ باشد." });
  if (req.body?.comment !== undefined && typeof req.body.comment !== "string") return res.status(400).json({ message: "متن دیدگاه معتبر نیست." });
  if (comment.length > 1500) return res.status(400).json({ message: "متن دیدگاه بیش از حد طولانی است." });
  try {
    const product = await Product.findOne({ _id: productId, isActive: { $ne: false } }).select("_id").lean();
    if (!product) return res.status(404).json({ message: "محصول پیدا نشد." });
    const check = await eligibility(req.user._id, productId);
    if (!check.eligible) return res.status(403).json({ message: check.reason });
    const review = await ProductReview.create({ product: productId, user: req.user._id, order: check.orderId, rating, comment, displayName: "خریدار تأییدشده", verifiedPurchase: true, status: "pending" });
    return res.status(201).json({ message: "دیدگاه برای بررسی مدیریت ثبت شد.", review: { _id: review._id, status: review.status } });
  } catch (error) {
    if (error.code === "P2002" || error.code === 11000) return res.status(409).json({ message: "برای این محصول قبلاً دیدگاهی ثبت کرده‌اید." });
    console.error("Unable to create product review", error.message);
    return res.status(500).json({ message: "ثبت دیدگاه انجام نشد." });
  }
};

export const getPendingProductReviews = async (_req, res) => {
  try {
    const reviews = await ProductReview.find({ status: "pending" }).populate("product", "name image").populate("user", "name").sort({ createdAt: 1 }).limit(100).lean();
    return res.json({ reviews });
  } catch (error) {
    console.error("Unable to load pending reviews", error.message);
    return res.status(500).json({ message: "دریافت دیدگاه‌ها انجام نشد." });
  }
};

export const moderateProductReview = async (req, res) => {
  const { reviewId } = req.params;
  const status = req.body?.status;
  if (!isValidObjectId(reviewId)) return res.status(400).json({ message: "شناسه دیدگاه معتبر نیست." });
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "وضعیت بررسی معتبر نیست." });
  try {
    const review = await ProductReview.findOneAndUpdate({ _id: reviewId, status: "pending" }, { $set: { status, moderatedBy: req.user._id, moderatedAt: new Date() } }, { new: true });
    if (!review) return res.status(404).json({ message: "دیدگاه در انتظار بررسی پیدا نشد." });
    return res.json({ review: { _id: review._id, status: review.status } });
  } catch (error) {
    console.error("Unable to moderate review", error.message);
    return res.status(500).json({ message: "به‌روزرسانی دیدگاه انجام نشد." });
  }
};
