import { validateCategoryAttributeValues } from "../lib/category-attributes.js";

export { validateCategoryAttributeValues };


const CategoryAttributeFields = ({ definitions = [], values = {}, onChange, fieldClass, labelClass, emptyMessage = true }) => {
  if (!definitions.length) {
    return emptyMessage ? (
      <section className="rounded-xl border border-dashed border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-4">
        <h3 className="text-sm font-bold text-[var(--ui-text)]">مشخصات فنی دسته‌بندی</h3>
        <p className="mt-2 text-xs leading-6 text-[var(--ui-muted)]">برای این دسته هنوز ویژگی فنی تعریف نشده است. مدیر فروشگاه می‌تواند از بخش مدیریت دسته‌بندی‌ها، فیلدهای اختصاصی این گروه کالا را اضافه کند.</p>
      </section>
    ) : null;
  }

  return (
    <section className="space-y-4 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-4">
      <div>
        <h3 className="text-sm font-bold text-[var(--ui-text)]">مشخصات فنی دسته‌بندی</h3>
        <p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">فیلدهای زیر توسط مدیر دسته‌بندی تعریف شده‌اند و متناسب با همین گروه کالا نمایش داده می‌شوند.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {definitions.map((attribute) => {
          const value = values[attribute.key] ?? (attribute.type === "multi-select" ? [] : "");
          const label = attribute.name?.fa || attribute.name?.en || attribute.key;
          const unit = attribute.unit?.fa || attribute.unit?.en || "";
          const update = (nextValue) => onChange(attribute.key, nextValue);
          return (
            <label key={attribute.key} className={labelClass}>
              <span className="flex flex-wrap items-center gap-1.5">
                <span>{label}{attribute.required ? " *" : ""}</span>
                {unit && <span className="text-xs font-normal text-[var(--ui-muted)]">({unit})</span>}
              </span>
              {attribute.type === "select" ? (
                <select required={Boolean(attribute.required)} value={value} onChange={(event) => update(event.target.value)} className={fieldClass}>
                  <option value="">انتخاب کنید</option>
                  {(attribute.options || []).map((option) => <option key={option.value} value={option.value}>{option.name?.fa || option.name?.en || option.value}</option>)}
                </select>
              ) : attribute.type === "multi-select" ? (
                <select multiple value={Array.isArray(value) ? value : []} onChange={(event) => update(Array.from(event.target.selectedOptions, (option) => option.value))} className={fieldClass + " min-h-28"}>
                  {(attribute.options || []).map((option) => <option key={option.value} value={option.value}>{option.name?.fa || option.name?.en || option.value}</option>)}
                </select>
              ) : attribute.type === "boolean" ? (
                <select value={value === true ? "true" : value === false ? "false" : ""} onChange={(event) => update(event.target.value === "" ? "" : event.target.value === "true")} className={fieldClass}>
                  <option value="">انتخاب کنید</option>
                  <option value="true">بله</option>
                  <option value="false">خیر</option>
                </select>
              ) : (
                <input
                  type={attribute.type === "number" ? "number" : "text"}
                  step={attribute.type === "number" ? "any" : undefined}
                  required={Boolean(attribute.required)}
                  maxLength={attribute.type === "text" ? 500 : undefined}
                  value={value}
                  onChange={(event) => update(attribute.type === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value)}
                  className={fieldClass}
                />
              )}
            </label>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryAttributeFields;
