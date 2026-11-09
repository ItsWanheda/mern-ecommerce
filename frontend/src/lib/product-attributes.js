const toAttributeEntries = (attributes) => {
  if (attributes instanceof Map) return [...attributes.entries()];
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return [];
  return Object.entries(attributes);
};

const hasDisplayValue = (value) => {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value !== "string" || value.trim() !== "";
};

export function getCategoryAttributeDefinitions(product, categories = []) {
  if (!product || !Array.isArray(categories)) return new Map();
  const selectedCategory = categories.find((category) =>
    (product.category && category.slug === product.category) ||
    (product.categoryId && String(category._id) === String(product.categoryId))
  );
  if (!selectedCategory) return new Map();

  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const ancestors = (selectedCategory.ancestors || []).map((id) => byId.get(String(id))).filter(Boolean);
  const chain = [...ancestors, selectedCategory].sort((left, right) =>
    (left.ancestors || []).length - (right.ancestors || []).length
  );
  const definitions = new Map();
  for (const category of chain) {
    for (const attribute of category.attributes || []) {
      if (String(category._id) === String(selectedCategory._id) || attribute.inherited !== false) {
        definitions.set(attribute.key, attribute);
      }
    }
  }
  return definitions;
}

const formatAttributeEntry = (value, definition) => {
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (definition?.type === "number" && value !== "" && Number.isFinite(Number(value))) {
    return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(Number(value));
  }
  const option = (definition?.options || []).find((item) => String(item.value) === String(value));
  return option?.name?.fa || option?.name?.en || String(value);
};

export function getProductAttributeRows(product, categories = []) {
  const definitions = getCategoryAttributeDefinitions(product, categories);
  return toAttributeEntries(product?.attributes)
    .filter(([, value]) => hasDisplayValue(value))
    .filter(([key]) => definitions.get(key)?.showInProductDetails !== false)
    .map(([key, value]) => {
      const definition = definitions.get(key);
      const values = Array.isArray(value) ? value : [value];
      return {
        key,
        label: definition?.name?.fa || definition?.name?.en || key.replace(/_/g, " "),
        value: values.map((entry) => formatAttributeEntry(entry, definition)).join("، "),
        unit: definition?.unit?.fa || definition?.unit?.en || "",
        sortOrder: Number(definition?.sortOrder || 0),
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label, "fa"));
}
