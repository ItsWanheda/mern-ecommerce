import test from "node:test";
import assert from "node:assert/strict";
import { isReviewSummaryProductId } from "../src/stores/useReviewSummaryStore.js";

test("review summary requests accept valid MongoDB ObjectId strings", () => {
  assert.equal(isReviewSummaryProductId("507f1f77bcf86cd799439011"), true);
  assert.equal(isReviewSummaryProductId("ABCDEF0123456789ABCDEF01"), true);
});

test("review summary requests reject malformed product identifiers", () => {
  for (const value of ["", null, undefined, "123", "not-an-object-id", "g".repeat(24), "507f1f77bcf86cd799439011-extra"]) {
    assert.equal(isReviewSummaryProductId(value), false, String(value));
  }
});
