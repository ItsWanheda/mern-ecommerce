export const decodeCategoryRoute = (value) => {
  let decoded = String(value || "");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!/%[0-9a-f]{2}/i.test(decoded)) break;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      break;
    }
  }
  return decoded.trim();
};

export const resolveCategoryRoute = (value, categories = []) => {
  const decoded = decodeCategoryRoute(value);
  const category = categories.find((item) =>
    item.slug === decoded ||
    item.name?.fa === decoded ||
    item.name?.en === decoded
  ) || null;

  return {
    decoded,
    category,
    slug: category?.slug || decoded,
  };
};
