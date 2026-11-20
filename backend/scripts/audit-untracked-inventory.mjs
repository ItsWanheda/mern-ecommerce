import "dotenv/config";
import { prisma, disconnectPostgres } from "../lib/prisma.js";
import { hasConfiguredInventory } from "../lib/inventory-stock.js";

const stockProblem = (value) => {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (typeof value !== "number") return "wrong-type";
  if (!Number.isSafeInteger(value)) return "not-a-safe-integer";
  if (value < 0) return "negative";
  return null;
};

const result = {
  audit: "read-only active-product inventory audit",
  generatedAt: new Date().toISOString(),
  activeProductsScanned: 0,
  productsWithUntrackedInventory: 0,
  invalidVariantRecords: 0,
  findings: [],
  policy: "Unknown stock is not unlimited stock. Assign a verified non-negative integer quantity to each sellable product/variant before enabling checkout.",
};

try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be configured to inspect the PostgreSQL catalogue.");
  await prisma.$connect();
  let cursor;
  while (true) {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true, categoryId: true, stock: true, variants: true },
      orderBy: { id: "asc" },
      take: 250,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!products.length) break;
    for (const product of products) {
      result.activeProductsScanned += 1;
      if (hasConfiguredInventory(product)) continue;
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const finding = {
        productId: String(product.id),
        name: typeof product.name === "string" ? product.name : "",
        category: typeof product.category === "string" ? product.category : "",
        inventoryMode: variants.length ? "variants" : "product",
        untrackedFields: [],
      };
      if (variants.length) {
        variants.forEach((variant, index) => {
          const issue = stockProblem(variant?.stock);
          if (!issue) return;
          result.invalidVariantRecords += 1;
          finding.untrackedFields.push({
            variantIndex: index,
            size: typeof variant?.size === "string" ? variant.size : "",
            color: typeof variant?.color === "string" ? variant.color : "",
            stockState: issue,
          });
        });
      } else {
        finding.untrackedFields.push({ field: "stock", stockState: stockProblem(product.stock) || "unknown" });
      }
      result.productsWithUntrackedInventory += 1;
      result.findings.push(finding);
    }
    cursor = products.at(-1).id;
    if (products.length < 250) break;
  }
  console.log(JSON.stringify(result, null, 2));
  if (result.productsWithUntrackedInventory > 0) process.exitCode = 2;
} catch (error) {
  console.error("Inventory audit failed:", {
    name: error?.name || "Error",
    code: typeof error?.code === "string" || typeof error?.code === "number" ? error.code : undefined,
    message: error?.message || "Unknown error",
  });
  process.exitCode = 1;
} finally {
  await disconnectPostgres().catch(() => {});
}
