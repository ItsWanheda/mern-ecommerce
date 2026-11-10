const isMissing = (value) => value === undefined || value === null || value === "" ||
  (Array.isArray(value) && value.length === 0);

export function resolveCategoryAttributeDefinitions(selectedCategory, categories = [], { filterableOnly = false } = {}) {
  if (!selectedCategory || !Array.isArray(categories)) return [];
  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const ancestors = (selectedCategory.ancestors || [])
    .map((id) => byId.get(String(id)))
    .filter(Boolean);
  const chain = [...ancestors, selectedCategory].sort((a, b) =>
    (a.ancestors || []).length - (b.ancestors || []).length
  );
  const definitions = new Map();

  for (const category of chain) {
    const isCurrent = String(category._id) === String(selectedCategory._id);
    for (const attribute of category.attributes || []) {
      if (isCurrent || attribute.inherited !== false) definitions.set(attribute.key, attribute);
    }
  }

  return [...definitions.values()]
    .filter((attribute) => !filterableOnly || attribute.filterable === true)
    .sort((a, b) =>
      Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
      String(a.name?.fa || a.name?.en || a.key).localeCompare(String(b.name?.fa || b.name?.en || b.key), "fa")
    );
}

export function validateCategoryAttributeValues(definitions = [], values = {}) {
  for (const attribute of definitions) {
    const value = values?.[attribute.key];
    const label = attribute.name?.fa || attribute.name?.en || attribute.key;
    if (isMissing(value)) {
      if (attribute.required) return "تکمیل ویژگی «" + label + "» الزامی است.";
      continue;
    }

    if (attribute.type === "select" &&
        (typeof value !== "string" || !(attribute.options || []).some((option) => option.value === value))) {
      return "مقدار ویژگی «" + label + "» معتبر نیست.";
    }
    if (attribute.type === "multi-select" &&
        (!Array.isArray(value) || value.some((entry) =>
          typeof entry !== "string" || !(attribute.options || []).some((option) => option.value === entry)
        ))) {
      return "گزینه‌های ویژگی «" + label + "» معتبر نیستند.";
    }
    if (attribute.type === "boolean" && typeof value !== "boolean") {
      return "مقدار ویژگی «" + label + "» باید بله یا خیر باشد.";
    }
    if (attribute.type === "number" && !Number.isFinite(Number(value))) {
      return "مقدار ویژگی «" + label + "» باید عددی باشد.";
    }
    if (attribute.type === "text" && (typeof value !== "string" || value.length > 500)) {
      return "مقدار متنی ویژگی «" + label + "» معتبر نیست.";
    }
  }
  return "";
}
