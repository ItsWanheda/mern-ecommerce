import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 5000 },
    price: { type: Number, min: 0, required: true },
    image: { type: String, required: [true, "Image is required"], default: "" },
    category: { type: String, required: true, trim: true, maxlength: 64 },
    isFeatured: { type: Boolean, default: false },
    // null keeps existing catalogue records available until their opening stock is entered.
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

const Product = mongoose.model("Product", productSchema);

export default Product;
