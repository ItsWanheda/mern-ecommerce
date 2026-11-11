import crypto from "node:crypto";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import ServiceCase from "../models/service-case.model.js";
import AccountSession from "../models/account-session.model.js";
import SecurityNotification from "../models/security-notification.model.js";
import { redis } from "../lib/redis.js";
import { getPasswordPolicyError } from "../lib/password-policy.js";
import { sendVerificationEmail, sendEmailChangeConfirmation } from "../lib/account-email.js";

const hashToken = value => crypto.createHash("sha256").update(value).digest("hex");
const validEmail = value => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const notify = (user, type, title, message, metadata = {}) => SecurityNotification.create({ user, type, title, message, metadata });

const base32 = buffer => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0, output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
};
const decodeBase32 = value => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, buffer = 0;
  const bytes = [];
  for (const char of value) {
    const index = alphabet.indexOf(char);
    if (index < 0) continue;
    buffer = (buffer << 5) | index; bits += 5;
    if (bits >= 8) { bytes.push((buffer >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
};
const createTotp = (secret, timestamp = Date.now()) => {
  const counter = Math.floor(timestamp / 30000);
  const message = Buffer.alloc(8); message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary = ((digest[offset] & 127) << 24) | ((digest[offset + 1] & 255) << 16) | ((digest[offset + 2] & 255) << 8) | (digest[offset + 3] & 255);
  return String(binary % 1000000).padStart(6, "0");
};
const verifyTotp = (secret, code) => {
  if (!secret || !/^\d{6}$/.test(String(code || ""))) return false;
  return [-1, 0, 1].some(step => createTotp(secret, Date.now() + step * 30000) === String(code));
};

export const updateAccountProfile = async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
  const phone = typeof req.body?.primaryPhone === "string" ? req.body.primaryPhone.replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/\D/g, "") : undefined;
  if (name !== undefined && (name.length < 2 || name.length > 100)) return res.status(400).json({ message: "نام باید بین ۲ تا ۱۰۰ نویسه باشد." });
  if (phone !== undefined && phone !== "" && !/^09\d{9}$/.test(phone)) return res.status(400).json({ message: "شماره موبایل باید با 09 شروع شود و ۱۱ رقم داشته باشد." });
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "حساب کاربری پیدا نشد." });
    if (name !== undefined) user.name = name;
    if (phone !== undefined && phone !== user.primaryPhone) { user.primaryPhone = phone; user.phoneVerifiedAt = null; }
    await user.save();
    return res.json({ profile: { _id: user._id, name: user.name, email: user.email, primaryPhone: user.primaryPhone, phoneVerifiedAt: user.phoneVerifiedAt, emailVerifiedAt: user.emailVerifiedAt } });
  } catch (error) {
    console.error("Updating account profile failed", error?.message);
    return res.status(500).json({ message: "ذخیره اطلاعات حساب انجام نشد." });
  }
};

export const changePassword = async (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  if (!currentPassword || !newPassword) return res.status(400).json({ message: "رمز عبور فعلی و جدید را وارد کنید." });
  const policyError = getPasswordPolicyError(newPassword);
  if (policyError) return res.status(400).json({ message: policyError, fieldErrors: { newPassword: policyError } });
  try {
    const user = await User.findById(req.user._id);
    if (!user || !(await user.comparePassword(currentPassword))) return res.status(400).json({ message: "رمز عبور فعلی صحیح نیست." });
    user.password = newPassword;
    await user.save();
    await AccountSession.updateMany({ user: user._id, tokenId: { $ne: req.sessionId }, revokedAt: null }, { $set: { revokedAt: new Date() } });
    await notify(user._id, "password_changed", "رمز عبور تغییر کرد", "رمز عبور حساب شما تغییر کرده است.");
    res.clearCookie("accessToken"); res.clearCookie("refreshToken");
    return res.json({ message: "رمز عبور تغییر کرد؛ دوباره وارد شوید." });
  } catch (error) {
    console.error("Account password change failed", error?.message);
    return res.status(500).json({ message: "تغییر رمز عبور انجام نشد." });
  }
};

export const requestEmailVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+emailVerificationTokenHash +emailVerificationExpiresAt");
    if (!user) return res.status(404).json({ message: "حساب کاربری پیدا نشد." });
    if (user.emailVerifiedAt) return res.json({ message: "ایمیل شما قبلاً تأیید شده است." });
    const token = crypto.randomBytes(32).toString("hex");
    user.emailVerificationTokenHash = hashToken(token);
    user.emailVerificationExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    await sendVerificationEmail(user.email, token);
    return res.json({ message: "پیوند تأیید ایمیل ارسال شد." });
  } catch (error) {
    if (error?.code === "EMAIL_NOT_CONFIGURED") return res.status(503).json({ message: "ارسال ایمیل در حال حاضر پیکربندی نشده است." });
    console.error("Email verification request failed", error?.message);
    return res.status(503).json({ message: "ارسال ایمیل تأیید ناموفق بود." });
  }
};

export const verifyEmail = async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ message: "پیوند تأیید نامعتبر یا منقضی شده است." });
  try {
    const user = await User.findOne({ emailVerificationTokenHash: hashToken(token), emailVerificationExpiresAt: { $gt: new Date() } })
      .select("+emailVerificationTokenHash +emailVerificationExpiresAt");
    if (!user) return res.status(400).json({ message: "پیوند تأیید نامعتبر یا منقضی شده است." });
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = undefined; user.emailVerificationExpiresAt = undefined;
    await user.save();
    await notify(user._id, "email_verified", "ایمیل تأیید شد", "نشانی ایمیل حساب شما با موفقیت تأیید شد.");
    return res.json({ message: "ایمیل شما تأیید شد.", emailVerifiedAt: user.emailVerifiedAt });
  } catch (error) {
    console.error("Email verification failed", error?.message);
    return res.status(500).json({ message: "تأیید ایمیل انجام نشد." });
  }
};

export const requestEmailChange = async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!validEmail(email)) return res.status(400).json({ message: "ایمیل جدید معتبر نیست." });
  try {
    const user = await User.findById(req.user._id).select("+emailChangeTokenHash +emailChangeExpiresAt");
    if (!user || !(await user.comparePassword(password))) return res.status(400).json({ message: "رمز عبور صحیح نیست." });
    if (email === user.email) return res.status(400).json({ message: "ایمیل جدید با ایمیل فعلی یکسان است." });
    if (await User.exists({ email })) return res.status(409).json({ message: "این ایمیل قبلاً ثبت شده است." });
    const token = crypto.randomBytes(32).toString("hex");
    user.pendingEmail = email;
    user.emailChangeTokenHash = hashToken(token);
    user.emailChangeExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    await sendEmailChangeConfirmation(email, token);
    return res.json({ message: "پیوند تأیید به ایمیل جدید ارسال شد." });
  } catch (error) {
    if (error?.code === "EMAIL_NOT_CONFIGURED") return res.status(503).json({ message: "ارسال ایمیل در حال حاضر پیکربندی نشده است." });
    console.error("Email change request failed", error?.message);
    return res.status(503).json({ message: "درخواست تغییر ایمیل انجام نشد." });
  }
};

export const confirmEmailChange = async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ message: "پیوند تأیید نامعتبر یا منقضی شده است." });
  try {
    const user = await User.findOne({ emailChangeTokenHash: hashToken(token), emailChangeExpiresAt: { $gt: new Date() }, pendingEmail: { $ne: "" } })
      .select("+emailChangeTokenHash +emailChangeExpiresAt");
    if (!user) return res.status(400).json({ message: "پیوند تأیید نامعتبر یا منقضی شده است." });
    if (await User.exists({ _id: { $ne: user._id }, email: user.pendingEmail })) return res.status(409).json({ message: "این ایمیل قبلاً ثبت شده است." });
    user.email = user.pendingEmail; user.pendingEmail = ""; user.emailVerifiedAt = new Date();
    user.emailChangeTokenHash = undefined; user.emailChangeExpiresAt = undefined;
    await user.save();
    await notify(user._id, "email_changed", "ایمیل حساب تغییر کرد", "نشانی ایمیل حساب شما تغییر کرده است.");
    return res.json({ message: "ایمیل حساب با موفقیت تغییر کرد.", email: user.email });
  } catch (error) {
    console.error("Email change confirmation failed", error?.message);
    return res.status(500).json({ message: "تأیید تغییر ایمیل انجام نشد." });
  }
};

export const getAccountSessions = async (req, res) => {
  try {
    const sessions = await AccountSession.find({ user: req.user._id, revokedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ lastUsedAt: -1 }).limit(30).lean();
    return res.json({ sessions: sessions.map(session => ({ ...session, isCurrent: session.tokenId === req.sessionId })) });
  } catch (error) {
    console.error("Loading account sessions failed", error?.message);
    return res.status(500).json({ message: "بارگذاری نشست‌ها انجام نشد." });
  }
};

export const revokeAccountSession = async (req, res) => {
  const tokenId = String(req.params.sessionId || "");
  if (!/^[0-9a-f-]{36}$/i.test(tokenId)) return res.status(400).json({ message: "شناسه نشست معتبر نیست." });
  try {
    const session = await AccountSession.findOneAndUpdate(
      { tokenId, user: req.user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }, { new: true }
    );
    if (!session) return res.status(404).json({ message: "نشست فعال پیدا نشد." });
    await redis.del(`refresh_token:${req.user._id}:${tokenId}`);
    await notify(req.user._id, "session_revoked", "یک دستگاه از حساب خارج شد", "یکی از نشست‌های فعال حساب شما لغو شد.");
    if (tokenId === req.sessionId) { res.clearCookie("accessToken"); res.clearCookie("refreshToken"); }
    return res.json({ message: "نشست لغو شد." });
  } catch (error) {
    console.error("Revoking account session failed", error?.message);
    return res.status(500).json({ message: "لغو نشست انجام نشد." });
  }
};

export const getSecurityNotifications = async (req, res) => {
  try {
    const notifications = await SecurityNotification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ notifications });
  } catch (error) {
    console.error("Loading security notifications failed", error?.message);
    return res.status(500).json({ message: "بارگذاری اعلان‌ها انجام نشد." });
  }
};

export const markSecurityNotificationRead = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "شناسه اعلان معتبر نیست." });
  const notification = await SecurityNotification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { readAt: new Date() } }, { new: true });
  if (!notification) return res.status(404).json({ message: "اعلان پیدا نشد." });
  return res.json({ notification });
};

export const getCommunicationPreferences = async (req, res) => {
  const user = await User.findById(req.user._id).select("communicationPreferences");
  return res.json({ preferences: user?.communicationPreferences || {} });
};

export const updateCommunicationPreferences = async (req, res) => {
  const allowed = ["orderUpdates", "securityAlerts", "productNews", "promotionalEmails"];
  const input = req.body?.preferences;
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key)) || Object.values(input).some(value => typeof value !== "boolean")) {
    return res.status(400).json({ message: "تنظیمات ارتباطی معتبر نیست." });
  }
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "حساب کاربری پیدا نشد." });
  user.communicationPreferences = { ...(user.communicationPreferences?.toObject?.() || user.communicationPreferences || {}), ...input };
  await user.save();
  return res.json({ preferences: user.communicationPreferences });
};

export const getAccountWishlist = async (req, res) => {
  const user = await User.findById(req.user._id).select("wishlist").populate({ path: "wishlist", match: { isActive: { $ne: false } } });
  return res.json({ products: user?.wishlist || [] });
};

export const addWishlistProduct = async (req, res) => {
  const productId = req.body?.productId;
  if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "شناسه محصول معتبر نیست." });
  const product = await Product.findOne({ _id: productId, isActive: { $ne: false } }).select("_id");
  if (!product) return res.status(404).json({ message: "محصول پیدا نشد." });
  await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: product._id } });
  return getAccountWishlist(req, res);
};

export const removeWishlistProduct = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId)) return res.status(400).json({ message: "شناسه محصول معتبر نیست." });
  await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: req.params.productId } });
  return getAccountWishlist(req, res);
};

export const clearAccountWishlist = async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $set: { wishlist: [] } });
  return res.json({ products: [] });
};

export const getAccountOverview = async (req, res) => {
  try {
    const [user, orderCount, latestOrders, openCases, unreadNotifications] = await Promise.all([
      User.findById(req.user._id).select("name email emailVerifiedAt primaryPhone phoneVerifiedAt createdAt twoFactorEnabled"),
      Order.countDocuments({ user: req.user._id }),
      Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(3).select("totalAmount paymentStatus shipmentStatus createdAt currency").lean(),
      ServiceCase.countDocuments({ user: req.user._id, status: { $in: ["open", "in_review"] } }),
      SecurityNotification.countDocuments({ user: req.user._id, readAt: null }),
    ]);
    return res.json({ profile: user, stats: { orderCount, openCases, unreadNotifications }, latestOrders });
  } catch (error) {
    console.error("Account overview failed", error?.message);
    return res.status(500).json({ message: "بارگذاری نمای کلی حساب انجام نشد." });
  }
};

export const exportAccountData = async (req, res) => {
  try {
    const [user, orders, serviceCases, notifications] = await Promise.all([
      User.findById(req.user._id).select("-password -passwordResetTokenHash -passwordResetExpiresAt -emailVerificationTokenHash -emailVerificationExpiresAt -emailChangeTokenHash -emailChangeExpiresAt -twoFactorSecret").lean(),
      Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
      ServiceCase.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
      SecurityNotification.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
    ]);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="account-data-export.json"');
    return res.json({ exportedAt: new Date().toISOString(), profile: user, orders, serviceCases, securityNotifications: notifications });
  } catch (error) {
    console.error("Account data export failed", error?.message);
    return res.status(500).json({ message: "خروجی اطلاعات حساب تهیه نشد." });
  }
};

export const requestAccountDeletion = async (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!password) return res.status(400).json({ message: "برای درخواست حذف حساب، رمز عبور را وارد کنید." });
  try {
    const user = await User.findById(req.user._id);
    if (!user || !(await user.comparePassword(password))) return res.status(400).json({ message: "رمز عبور صحیح نیست." });
    user.deletionRequestedAt = new Date();
    user.isActive = false;
    await user.save();
    await AccountSession.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
    await redis.del("refresh_token:" + user._id);
    await notify(user._id, "account_deletion_requested", "درخواست حذف حساب ثبت شد", "درخواست حذف حساب شما ثبت شد و برای بررسی نگهداری می‌شود.");
    res.clearCookie("accessToken"); res.clearCookie("refreshToken");
    return res.json({ message: "درخواست حذف حساب ثبت شد. سوابق سفارش مطابق الزامات مالی حفظ می‌شوند." });
  } catch (error) {
    console.error("Account deletion request failed", error?.message);
    return res.status(500).json({ message: "ثبت درخواست حذف حساب انجام نشد." });
  }
};

export const setupTwoFactor = async (req, res) => {
  const user = await User.findById(req.user._id).select("+twoFactorSecret");
  if (!user) return res.status(404).json({ message: "حساب کاربری پیدا نشد." });
  if (user.twoFactorEnabled) return res.status(409).json({ message: "تأیید دومرحله‌ای قبلاً فعال شده است." });
  const secret = base32(crypto.randomBytes(20));
  user.twoFactorSecret = secret;
  await user.save();
  const issuer = "Computer Hardware Store";
  const label = encodeURIComponent(user.email);
  const otpauthUrl = "otpauth://totp/" + encodeURIComponent(issuer + ":" + user.email) + "?secret=" + secret + "&issuer=" + encodeURIComponent(issuer) + "&algorithm=SHA1&digits=6&period=30";
  return res.json({ secret, otpauthUrl, label });
};

export const enableTwoFactor = async (req, res) => {
  const user = await User.findById(req.user._id).select("+twoFactorSecret");
  if (!user?.twoFactorSecret || !verifyTotp(user.twoFactorSecret, req.body?.code)) return res.status(400).json({ message: "کد تأیید دومرحله‌ای معتبر نیست." });
  user.twoFactorEnabled = true;
  await user.save();
  await notify(user._id, "two_factor_changed", "تأیید دومرحله‌ای فعال شد", "ورود دومرحله‌ای برای حساب شما فعال شد.");
  return res.json({ enabled: true });
};

export const disableTwoFactor = async (req, res) => {
  const user = await User.findById(req.user._id).select("+twoFactorSecret");
  if (!user || !(await user.comparePassword(req.body?.password || "")) || !verifyTotp(user.twoFactorSecret, req.body?.code)) return res.status(400).json({ message: "رمز عبور یا کد تأیید صحیح نیست." });
  user.twoFactorEnabled = false; user.twoFactorSecret = "";
  await user.save();
  await notify(user._id, "two_factor_changed", "تأیید دومرحله‌ای غیرفعال شد", "ورود دومرحله‌ای برای حساب شما غیرفعال شد.");
  return res.json({ enabled: false });
};

export const verifyLoginTwoFactor = verifyTotp;
