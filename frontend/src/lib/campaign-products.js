const OBJECT_ID_PATTERN = /^[a-f\\d]{24}$/i;

export const getCampaignProductIds = (campaigns, limit = 8) => {
  const ids = [];
  const seen = new Set();

  for (const campaign of Array.isArray(campaigns) ? campaigns : []) {
    for (const product of Array.isArray(campaign?.productIds) ? campaign.productIds : []) {
      // Already-populated products need no additional request.
      if (product && typeof product === "object" && product._id) continue;
      const id = typeof product === "string" ? product : "";
      if (!OBJECT_ID_PATTERN.test(id) || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      if (ids.length >= limit) return ids;
    }
  }

  return ids;
};

export const attachCampaignProducts = (campaigns, productsById) => {
  const lookup = productsById instanceof Map
    ? productsById
    : new Map(Object.entries(productsById || {}));

  return (Array.isArray(campaigns) ? campaigns : []).map((campaign) => ({
    ...campaign,
    productIds: (Array.isArray(campaign?.productIds) ? campaign.productIds : [])
      .map((product) => {
        if (product && typeof product === "object" && product._id) return product;
        return lookup.get(String(product || ""));
      })
      .filter((product) => product && typeof product === "object" && product._id && product.isActive !== false),
  }));
};
