import dotenv from "dotenv";
import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

dotenv.config();

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI must be configured before migrating category references.");
  process.exit(1);
}

let migratedProducts = 0;

try {
  await mongoose.connect(process.env.MONGO_URI);

  // This migration deliberately does not seed a category catalogue.
  // Categories are created and maintained by store administrators. The script
  // only backfills categoryId for products whose existing category slug already
  // matches a category record.
  const categories = await Category.find({}, { _id: 1, slug: 1 }).lean();
  const categoriesBySlug = new Map(
    categories
      .filter((category) => typeof category.slug === "string" && category.slug.trim())
      .map((category) => [category.slug, category])
  );

  const legacyValues = await Product.distinct("category");
  for (const value of legacyValues) {
    const slug = typeof value === "string" ? value.trim() : "";
    if (!slug) continue;
    const category = categoriesBySlug.get(slug);
    if (!category) continue;

    const result = await Product.updateMany(
      {
        category: slug,
        $or: [{ categoryId: null }, { categoryId: { $exists: false } }],
      },
      { $set: { categoryId: category._id } }
    );
    migratedProducts += result.modifiedCount || 0;
  }

  const unmapped = legacyValues.filter((value) => {
    const slug = typeof value === "string" ? value.trim() : "";
    return slug && !categoriesBySlug.has(slug);
  });

  console.log("Category reference backfill completed.");
  console.log("Admin-managed categories found: " + categoriesBySlug.size);
  console.log("Products linked to existing categories: " + migratedProducts);
  if (unmapped.length) {
    console.warn(
      "These product category values have no matching Admin-managed category and were left unchanged. Create or map their categories before migrating those products:",
      unmapped
    );
  }
} catch (error) {
  console.error("Category reference backfill failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
