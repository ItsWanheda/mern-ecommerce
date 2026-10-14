import mongoose from "mongoose";

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI must point to the database being migrated.");
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(uri);
  const orders = mongoose.connection.db.collection("orders");
  const indexes = await orders.indexes();
  const legacyIndex = indexes.find((index) => index.name === "stripeSessionId_1");

  if (!legacyIndex) {
    console.log("No legacy stripeSessionId_1 index found; no changes made.");
    return;
  }

  const keyEntries = Object.entries(legacyIndex.key || {});
  const isExpectedKey = keyEntries.length === 1 && keyEntries[0][0] === "stripeSessionId" && keyEntries[0][1] === 1;
  if (!isExpectedKey) {
    throw new Error("Refusing to drop stripeSessionId_1 because its key definition is unexpected.");
  }

  // A non-sparse unique index includes documents where the field is absent.
  // Since new Zarinpal orders have no Stripe session ID, that index can reject
  // subsequent orders. Keep sparse/partial indexes and any non-unique index.
  const blocksMissingValues = legacyIndex.unique === true &&
    legacyIndex.sparse !== true &&
    !legacyIndex.partialFilterExpression;
  if (!blocksMissingValues) {
    console.log("The existing Stripe index does not block missing values; no changes made.");
    return;
  }

  await orders.dropIndex("stripeSessionId_1");
  console.log("Dropped the exact legacy non-sparse unique stripeSessionId_1 index.");
  console.log("Historical order documents and their stripeSessionId values were not changed.");
};

try {
  await run();
} catch (error) {
  console.error("Legacy Stripe index migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
