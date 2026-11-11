import mongoose from "mongoose";

const accountSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenId: { type: String, required: true, unique: true, index: true },
  deviceName: { type: String, trim: true, maxlength: 160, default: "دستگاه ناشناس" },
  userAgent: { type: String, trim: true, maxlength: 500, default: "" },
  ipAddress: { type: String, trim: true, maxlength: 80, default: "" },
  lastUsedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

accountSessionSchema.index({ user: 1, revokedAt: 1, lastUsedAt: -1 });
export default mongoose.model("AccountSession", accountSessionSchema);
