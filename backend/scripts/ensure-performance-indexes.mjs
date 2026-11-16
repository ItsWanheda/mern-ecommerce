import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

dotenv.config();

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI must be configured before creating performance indexes.");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 2, minPoolSize: 0 });
  const [productIndexes, categoryIndexes] = await Promise.all([
    Product.createIndexes(),
    Category.createIndexes(),
  ]);
  console.log("Performance indexes ensured.", {
    productIndexes: productIndexes.length,
    categoryIndexes: categoryIndexes.length,
  });
} catch (error) {
  console.error("Unable to create performance indexes:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
