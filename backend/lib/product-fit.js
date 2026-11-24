const FIT_TYPES = new Set(["true-to-size", "slim", "regular", "relaxed", "oversized", "athletic"]);
const FIT_FIELDS = ["type", "description", "modelHeight", "modelSize"];

/**
 * Keep clothing-fit metadata absent for hardware products.
 * A legacy/default fit object is meaningful only when at least one supported
 * field contains an actual value.
 */
export function normalizeProductFit(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const hasFitData = FIT_FIELDS.some((field) =>
    typeof value[field] === "string" && value[field].trim().length > 0
  );
  if (!hasFitData) return {};

  return {
    type: FIT_TYPES.has(value.type) ? value.type : "regular",
    description: typeof value.description === "string" ? value.description.trim().slice(0, 500) : "",
    modelHeight: typeof value.modelHeight === "string" ? value.modelHeight.trim().slice(0, 40) : "",
    modelSize: typeof value.modelSize === "string" ? value.modelSize.trim().slice(0, 24) : "",
  };
}
