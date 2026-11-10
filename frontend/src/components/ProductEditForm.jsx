import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ImagePlus, LoaderCircle, Save, X, Cpu } from "lucide-react";
import { useProductStore } from "../stores/useProductStore";
import { useCategoryStore } from "../stores/useCategoryStore";
import { formatPrice, getCurrencyLabel, STORE_CURRENCY } from "../lib/commerce";
import CategoryAttributeFields, { validateCategoryAttributeValues } from "./CategoryAttributeFields";

const currencyLabel = getCurrencyLabel(STORE_CURRENCY);
const categoryPath = (category, categories) => {
  const byId = new Map(categories.map((item) => [String(item._id), item]));
  const path = [];
  let current = category;
  let depth = 0;
  while (current && depth++ < 20) {
    path.unshift(current.name?.fa || current.name?.en || current.slug);
    current = byId.get(String(current.parentId || ""));
  }
  return path.join(" / ");
};

const makeInitialForm = (product) => {
  const legacyVariantStock = (product.variants || []).reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0);
  const stock = product.stock === null || product.stock === undefined
    ? ((product.variants || []).length ? String(legacyVariantStock) : "")
    : String(product.stock);
  const images = Array.isArray(product.images) && product.images.length ? product.images : (product.image ? [product.image] : []);
  return {
    name: product.name || "",
    description: product.description || "",
    price: String(product.price ?? ""),
    stock,
    category: product.category || "",
    categoryId: product.categoryId ? String(product.categoryId) : "",
    images,
  };
};

const toAttributeObject = (value) => value instanceof Map ? Object.fromEntries(value) : { ...(value || {}) };

const ProductEditForm = ({ product, onClose, onSaved }) => {
  const [form, setForm] = useState(() => makeInitialForm(product));
  const [attributes, setAttributes] = useState(() => toAttributeObject(product.attributes));
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const { updateProduct } = useProductStore();
  const { adminCategories, fetchAdminCategories } = useCategoryStore();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fetchAdminCategories();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [fetchAdminCategories]);

  const categoryChoices = useMemo(
    () => adminCategories.filter((category) => category.isActive !== false),
    [adminCategories],
  );
  const selectedCategory = categoryChoices.find((category) =>
    String(category._id) === String(form.categoryId) || category.slug === form.category
  );
  const attributeDefinitions = useMemo(() => {
    if (!selectedCategory) return [];
    const byId = new Map(adminCategories.map((category) => [String(category._id), category]));
    const ancestors = (selectedCategory.ancestors || []).map((id) => byId.get(String(id))).filter(Boolean);
    const chain = [...ancestors, selectedCategory].sort((a, b) => (a.ancestors || []).length - (b.ancestors || []).length);
    const definitions = new Map();
    for (const category of chain) {
      for (const attribute of category.attributes || []) {
        if (String(category._id) === String(selectedCategory._id) || attribute.inherited !== false) definitions.set(attribute.key, attribute);
      }
    }
    return [...definitions.values()].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  }, [adminCategories, selectedCategory]);

  useEffect(() => {
    if (form.categoryId || !form.category || !categoryChoices.length) return;
    const match = categoryChoices.find((category) => category.slug === form.category);
    if (match) setForm((current) => ({ ...current, categoryId: String(match._id) }));
  }, [categoryChoices, form.category, form.categoryId]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const fieldClass = "mt-1 block w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-input-bg)] px-3 py-2.5 text-sm text-[var(--ui-text)] outline-none transition focus:border-[var(--ui-focus)] focus:ring-2 focus:ring-brand/20";
  const labelClass = "block text-sm font-medium text-[var(--ui-muted)]";

  const handleImageChange = async (event) => {
    const files = Array.from(event.target.files || []);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (form.images.length + files.length > 8 || files.some((file) => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) || totalSize > 6 * 1024 * 1024) {
      setFormError("حداکثر ۸ تصویر و مجموعاً ۶ مگابایت مجاز است؛ هر تصویر باید از نوع عکس و حداکثر ۵ مگابایت باشد.");
      event.target.value = "";
      return;
    }
    setFormError("");
    setImageBusy(true);
    try {
      const encoded = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("خواندن تصویر ناموفق بود"));
        reader.readAsDataURL(file);
      })));
      setForm((current) => ({ ...current, images: [...current.images, ...encoded].slice(0, 8) }));
    } catch {
      setFormError("خواندن تصویر ناموفق بود؛ دوباره تلاش کنید.");
    } finally {
      setImageBusy(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!Number.isSafeInteger(Number(form.price)) || Number(form.price) < 0) {
      setFormError("قیمت باید عدد صحیح و نامنفی به تومان باشد.");
      return;
    }
    if (form.stock !== "" && (!Number.isSafeInteger(Number(form.stock)) || Number(form.stock) < 0)) {
      setFormError("موجودی انبار باید یک عدد صحیح و نامنفی باشد یا برای کالای بدون ردیابی خالی بماند.");
      return;
    }
    if (!selectedCategory) {
      setFormError("برای ادامه، یک دسته‌بندی فعال انتخاب کنید.");
      return;
    }
    const attributeError = validateCategoryAttributeValues(attributeDefinitions, attributes);
    if (attributeError) {
      setFormError(attributeError);
      return;
    }
    const allowedKeys = new Set(attributeDefinitions.map((attribute) => attribute.key));
    const safeAttributes = Object.fromEntries(Object.entries(attributes).filter(([key]) => allowedKeys.has(key)));

    setSaving(true);
    try {
      await updateProduct(product._id, {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        stock: form.stock === "" ? null : Number(form.stock),
        category: selectedCategory.slug,
        categoryId: String(selectedCategory._id),
        attributes: safeAttributes,
        image: form.images[0] || "",
        images: form.images,
        sizes: [],
        colors: [],
        variants: [],
        fit: null,
        sizeChart: [],
      });
      onSaved();
    } catch {
      // The product store displays the API error.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="product-edit-title" dir="rtl" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} className="mx-auto my-4 max-w-5xl rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-[var(--ui-text)] shadow-2xl sm:my-8 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-[var(--ui-border)] pb-4">
          <div>
            <h2 id="product-edit-title" className="text-xl font-bold text-[var(--ui-accent)] sm:text-2xl">ویرایش محصول</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--ui-muted)]">مشخصات عمومی و ویژگی‌های فنی را ویرایش کنید. فیلدهای فنی از دسته‌بندی انتخاب‌شده دریافت می‌شوند.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن پنجره ویرایش" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--ui-border)] text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]"><X size={18} aria-hidden="true" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-6">
              <section className="space-y-4">
                <h3 className="border-b border-[var(--ui-border)] pb-2 text-sm font-bold">اطلاعات پایه</h3>
                <label className={labelClass}>نام محصول
                  <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required maxLength={160} className={fieldClass} />
                </label>
                <label className={labelClass}>توضیحات
                  <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} required maxLength={5000} rows={4} className={fieldClass} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>قیمت ({currencyLabel})
                    <input type="number" min="0" step="1" value={form.price} onChange={(event) => updateField("price", event.target.value)} required className={fieldClass} />
                  </label>
                  <label className={labelClass}>موجودی انبار
                    <input type="number" min="0" step="1" value={form.stock} onChange={(event) => updateField("stock", event.target.value)} className={fieldClass} />
                  </label>
                </div>
                <label className={labelClass}>دسته‌بندی
                  <select value={selectedCategory ? String(selectedCategory._id) : form.categoryId} onChange={(event) => {
                    const selected = categoryChoices.find((category) => String(category._id) === event.target.value);
                    setForm((current) => ({ ...current, categoryId: selected ? String(selected._id) : "", category: selected?.slug || "" }));
                    setAttributes({});
                  }} required className={fieldClass} disabled={categoryChoices.length === 0}>
                    <option value="">انتخاب دسته‌بندی فعال</option>
                    {categoryChoices.map((category) => <option key={category._id} value={String(category._id)}>{categoryPath(category, categoryChoices)}</option>)}
                  </select>
                  {!selectedCategory && <span className="mt-2 block text-xs leading-5 text-[var(--ui-warning)]">دسته‌بندی قبلی در فهرست فعال نیست. برای ادامه، محصول را به یک دسته فعال اختصاص دهید.</span>}
                  {categoryChoices.length === 0 && <span className="mt-2 block text-xs leading-5 text-[var(--ui-warning)]">دسته فعالی وجود ندارد؛ ابتدا در مدیریت دسته‌بندی‌ها یک دسته ایجاد یا فعال کنید.</span>}
                </label>
              </section>

              <CategoryAttributeFields
                definitions={attributeDefinitions}
                values={attributes}
                onChange={(key, value) => setAttributes((current) => ({ ...current, [key]: value }))}
                fieldClass={fieldClass}
                labelClass={labelClass}
              />

              <section className="space-y-3">
                <h3 className="border-b border-[var(--ui-border)] pb-2 text-sm font-bold">گالری تصاویر</h3>
                <p className="text-xs leading-5 text-[var(--ui-muted)]">تصویر اول تصویر اصلی محصول خواهد بود. تا ۸ تصویر مجاز است؛ تصاویر تازه هنگام ذخیره بارگذاری می‌شوند.</p>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-4 py-2.5 text-sm hover:bg-[var(--ui-hover)]">
                  <ImagePlus size={17} aria-hidden="true" /> افزودن تصاویر
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={handleImageChange} disabled={imageBusy || form.images.length >= 8} />
                </label>
                {imageBusy && <p role="status" className="text-xs text-[var(--ui-muted)]">در حال آماده‌سازی تصاویر…</p>}
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {form.images.map((image, index) => (
                    <div key={image} className="relative overflow-hidden rounded-xl border border-[var(--ui-border)] bg-white">
                      <img src={image} alt={"پیش‌نمایش تصویر " + (index + 1)} className="aspect-square w-full object-contain" />
                      {index === 0 && <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-1 text-[10px] text-white">تصویر اصلی</span>}
                      <button type="button" onClick={() => updateField("images", form.images.filter((_, imageIndex) => index !== imageIndex))} aria-label={"حذف تصویر " + (index + 1)} className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white"><X size={14} aria-hidden="true" /></button>
                    </div>
                  ))}
                  {!form.images.length && <p className="col-span-full text-xs text-[var(--ui-muted)]">هنوز تصویری ثبت نشده است.</p>}
                </div>
              </section>

              {formError && <p role="alert" className="rounded-xl border border-[var(--ui-danger-border)]/50 bg-[var(--ui-danger-bg)] p-3 text-sm leading-6 text-[var(--ui-danger)]">{formError}</p>}
              <div className="flex flex-wrap gap-2 border-t border-[var(--ui-border)] pt-4">
                <button type="submit" disabled={saving || imageBusy || !selectedCategory} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-on-brand hover:bg-brand-hover disabled:opacity-50">
                  {saving ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
                  {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
                </button>
                <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--ui-border)] px-5 py-2.5 text-sm text-[var(--ui-text)] hover:bg-[var(--ui-hover)]">انصراف</button>
              </div>
            </div>

            <aside className="h-fit rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-4">
              <h3 className="text-sm font-bold text-[var(--ui-text)]">پیش‌نمایش محصول</h3>
              <div className="mt-3 overflow-hidden rounded-xl bg-[var(--ui-surface)]">
                {form.images[0] ? <img src={form.images[0]} alt="تصویر اصلی پیش‌نمایش" className="aspect-square w-full bg-white object-contain" /> : <div className="flex aspect-square items-center justify-center text-sm text-[var(--ui-muted)]">بدون تصویر</div>}
                <div className="space-y-2 p-3">
                  <p className="font-semibold text-[var(--ui-text)]">{form.name || "نام محصول"}</p>
                  <p className="line-clamp-4 text-xs leading-5 text-[var(--ui-muted)]">{form.description || "توضیحات فنی محصول در این بخش نمایش داده می‌شود."}</p>
                  <p className="text-lg font-bold text-[var(--ui-accent)]">{formatPrice(Number(form.price) || 0, STORE_CURRENCY)}</p>
                  <p className="text-xs text-[var(--ui-muted)]">{selectedCategory?.name?.fa || form.category || "بدون دسته‌بندی"}</p>
                  {form.stock !== "" && <p className="text-xs text-[var(--ui-muted)]">موجودی: {new Intl.NumberFormat("fa-IR").format(Number(form.stock) || 0)} عدد</p>}
                  <a href={"/product/" + product._id} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[var(--ui-accent)] underline underline-offset-4">
                    بازکردن صفحه عمومی <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ProductEditForm;
