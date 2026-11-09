import test from "node:test";
import assert from "node:assert/strict";
import { attachCampaignProducts, getCampaignProductIds } from "../src/lib/campaign-products.js";

const idA = "65a000000000000000000001";
const idB = "65a000000000000000000002";
const idC = "65a000000000000000000003";

test("campaign product ID lookup deduplicates IDs and skips populated or invalid values", () => {
  const campaigns = [
    { productIds: [idA, idB, idA, { _id: idC, name: "Already populated" }, "invalid"] },
    { productIds: [idC] },
  ];

  assert.deepEqual(getCampaignProductIds(campaigns), [idA, idB, idC]);
  assert.deepEqual(getCampaignProductIds(campaigns, 2), [idA, idB]);
});

test("campaign product hydration preserves populated products and resolves ID-only API responses", () => {
  const populated = { _id: idC, name: "Existing product", isActive: true };
  const fetched = { _id: idA, name: "Fetched product", isActive: true };
  const campaigns = [
    { _id: "campaign-1", productIds: [idA, populated, idB] },
  ];

  const result = attachCampaignProducts(campaigns, new Map([[idA, fetched]]));

  assert.deepEqual(result[0].productIds, [fetched, populated]);
  assert.equal(result[0]._id, "campaign-1");
});

test("inactive products are excluded from campaign product cards", () => {
  const inactive = { _id: idA, name: "Inactive", isActive: false };
  const active = { _id: idB, name: "Active", isActive: true };

  const result = attachCampaignProducts(
    [{ productIds: [idA, idB] }],
    new Map([[idA, inactive], [idB, active]]),
  );

  assert.deepEqual(result[0].productIds, [active]);
});
