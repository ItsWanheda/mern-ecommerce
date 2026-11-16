const idOf = (value) => value == null ? "" : String(value);

export const filterVisibleCategoryTree = (categories = []) => {
  const activeIds = new Set(categories
    .filter((category) => category.isActive === true)
    .map((category) => idOf(category._id)));
  return categories
    .filter((category) =>
      category.isActive === true &&
      (category.ancestors || []).every((ancestor) => activeIds.has(idOf(ancestor)))
    )
    .sort((a, b) =>
      Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
      String(a.name?.fa || "").localeCompare(String(b.name?.fa || ""), "fa")
    );
};
