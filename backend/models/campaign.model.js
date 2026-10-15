import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", trim: true, maxlength: 300 },
    image: { type: String, default: "", trim: true, maxlength: 2048 },
    productIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }], default: [] },
    href: {
      type: String,
      required: true,
      default: "/shop",
      validate: {
        validator: (value) => typeof value === "string" && value.startsWith("/") && !value.startsWith("//"),
        message: "Campaign links must be relative storefront paths",
      },
    },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, min: 0, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

campaignSchema.index({ isActive: 1, startsAt: 1, endsAt: 1, sortOrder: 1 });
export default mongoose.model("Campaign", campaignSchema);
