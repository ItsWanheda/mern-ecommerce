import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProductSearchClause,
  buildEffectivePriceRangeClause,
} from "../lib/product-query.js";

test("search uses normalized token prefixes only", () => {
  const clause = buildProductSearchClause("کارت گرافیک RTX ۴۰۷۰");
  assert.deepEqual(Object.keys(clause), ["searchTokens"]);
  assert.equal(clause.searchTokens.$all.length, 4);
  assert.deepEqual(
    clause.searchTokens.$all.map((pattern) => pattern.source),
    ["^کارت", "^گرافیک", "^rtx", "^4070"]
  );
  assert.equal(JSON.stringify(clause).includes("$exists"), false);
});

test("search safely returns no clause for an empty query", () => {
  assert.equal(buildProductSearchClause("   "), null);
});

test("effective-price range uses the stored indexed field directly", () => {
  assert.deepEqual(
    buildEffectivePriceRangeClause(9000000, 17000000),
    { effectivePrice: { $gte: 9000000, $lte: 17000000 } }
  );
});

test("effective-price range supports either bound independently", () => {
  assert.deepEqual(buildEffectivePriceRangeClause(9000000, null), {
    effectivePrice: { $gte: 9000000 },
  });
  assert.deepEqual(buildEffectivePriceRangeClause(null, 17000000), {
    effectivePrice: { $lte: 17000000 },
  });
});
