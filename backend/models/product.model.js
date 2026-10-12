import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 5000 },
    price: { type: Number, min: 0, required: true },
    image: { type: String, trim: true, default: "" },
    category: { type: String, required: true, trim: true, maxlength: 64 },
    isFeatured: { type: Boolean, default: false },
    // null preserves legacy catalogue records until opening stock is entered by an admin.
    stock: {
      type: Number,
      min: 0,
      default: null,
      validate: {
        validator: (value) => value === null || Number.isInteger(value),
        message: "Stock must be a non-negative whole number",
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1, price: 1, createdAt: -1 });

export default mongoose.model("Product", productSchema);
