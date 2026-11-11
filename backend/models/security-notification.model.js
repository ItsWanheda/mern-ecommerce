import mongoose from "mongoose";

const securityNotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["new_login", "password_changed", "email_changed", "session_revoked", "email_verified", "account_deletion_requested", "two_factor_changed"], required: true },
  title: { type: String, trim: true, maxlength: 160, required: true },
  message: { type: String, trim: true, maxlength: 500, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  readAt: { type: Date, default: null },
}, { timestamps: true });

securityNotificationSchema.index({ user: 1, createdAt: -1 });
export default mongoose.model("SecurityNotification", securityNotificationSchema);
