import { tokenizePersianSearchText, escapeSearchRegex } from "./persian-search.js";

export const buildProductSearchClause = (rawQuery) => {
  const tokens = tokenizePersianSearchText(rawQuery, 8);
  if (!tokens.length) return null;

  return {
    searchTokens: {
      $all: tokens.map((token) => new RegExp("^" + escapeSearchRegex(token))),
    },
  };
};

export const buildEffectivePriceRangeClause = (minPrice, maxPrice) => {
  const range = {};
  if (minPrice !== null) range.$gte = minPrice;
  if (maxPrice !== null) range.$lte = maxPrice;
  return { effectivePrice: range };
};
