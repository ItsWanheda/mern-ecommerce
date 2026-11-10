import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Upload, Loader, X, Cpu } from "lucide-react";
import { useProductStore } from "../stores/useProductStore";
import { useCategoryStore } from "../stores/useCategoryStore";
import { getCurrencyLabel, STORE_CURRENCY } from "../lib/commerce";
import CategoryAttributeFields from "./CategoryAttributeFields";
import { resolveCategoryAttributeDefinitions, validateCategoryAttributeValues } from "../lib/category-attributes.js";

const categoryPath = (category, categories) => {
  const byId = new Map(categories.map((item) => [String(item._id), item]));
  const parts = [];
  let current = category;
  let remaining = 20;
  while (current && remaining-- > 0) {
    parts.unshift(current.name?.fa || current.name?.en || current.slug);
    current = byId.get(String(current.parentId || ""));
  }
  return parts.join(" / ");
};

const priceUnitLabel = getCurrencyLabel(STORE_CURRENCY);
const defaults = {
  name: "",
  description: "",
  price: "",
  stock: "0",
  category: "",
  categoryId: "",
  images: [],
};

const CreateProductForm = () => {
  const [newProduct, setNewProduct] = useState(defaults);
  const [imageError, setImageError] = useState("");
  const [attributeValues, setAttributeValues] = useState({});
  const [imageBusy, setImageBusy] = useState(false);
  const { createProduct, loading } = useProductStore();
  const { categories: availableCategories, fetchCategories } = useCategoryStore();

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const categoryChoices = useMemo(
    () => availableCategories.filter((category) => category.isActive !== false),
    [availableCategories],
  );
  const selectedCategory = categoryChoices.find((category) => String(category._id) === String(newProduct.categoryId));
  const selectedCategoryAttributes = useMemo(
    () => resolveCategoryAttributeDefinitions(selectedCategory, availableCategories),
    [availableCategories, selectedCategory],
  );

  const updateField = (field, value) => setNewProduct((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setImageError("");

    if (!selectedCategory) {
      setImageError("ابتدا یک دسته‌بندی فعال انتخاب کنید. دسته‌ها از بخش مدیریت دسته‌بندی‌ها ساخته می‌شوند.");
      return;
    }
    const price = Number(newProduct.price);
    const stock = Number(newProduct.stock);
    if (!Number.isSafeInteger(price) || price < 0) {
      setImageError("قیمت باید عدد صحیح و نامنفی به تومان باشد.");
      return;
    }
    if (!Number.isSafeInteger(stock) || stock < 0) {
      setImageError("موجودی انبار باید یک عدد صحیح و نامنفی باشد.");
      return;
    }
    const attributeError = validateCategoryAttributeValues(selectedCategoryAttributes, attributeValues);
    if (attributeError) {
      setImageError(attributeError);
      return;
    }

    try {
      await createProduct({
        name: newProduct.name.trim(),
        description: newProduct.description.trim(),
        price,
        stock,
        category: selectedCategory.slug,
        categoryId: String(selectedCategory._id),
        attributes: attributeValues,
        image: newProduct.images[0] || "",
        images: newProduct.images,
        sizes: [],
        colors: [],
        variants: [],
        fit: null,
        sizeChart: [],
      });
      setNewProduct(defaults);
      setAttributeValues({});
    } catch {
      // The product store displays the API error to the administrator.
    }
  };

  const handleImageChange = async (event) => {
    const files = Array.from(event.target.files || []);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (newProduct.images.length + files.length > 8 || files.some((file) => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) || totalSize > 6 * 1024 * 1024) {
      setImageError("حداکثر ۸ تصویر و مجموعاً ۶ مگابایت مجاز است؛ هر تصویر باید از نوع عکس و حداکثر ۵ مگابایت باشد.");
      event.target.value = "";
      return;
    }
    setImageError("");
    setImageBusy(true);
    try {
      const encoded = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("خواندن تصویر ناموفق بود"));
        reader.readAsDataURL(file);
      })));
      updateField("images", [...newProduct.images, ...encoded].slice(0, 8));
    } catch {
      setImageError("خواندن تصویر ناموفق بود؛ دوباره تلاش کنید.");
    } finally {
      setImageBusy(false);
      event.target.value = "";
    }
  };

  const fieldClass = "mt-1 block w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-3 py-2.5 text-sm text-[var(--ui-text)] shadow-sm focus:border-brand-muted focus:outline-none focus:ring-2 focus:ring-brand";
  const labelClass = "block text-sm font-medium text-[var(--ui-muted)]";

  return (
    <motion.div dir="rtl" className="mx-auto mb-8 max-w-4xl rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-lg sm:p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-6 flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-surface-raised)] text-[var(--ui-accent)]"><Cpu size={21} aria-hidden="true" /></span>
        <div>
          <h2 className="text-2xl font-semibold text-brand-muted">ایجاد محصول جدید</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--ui-muted)]">اطلاعات محصول، مشخصات فنی دسته‌بندی و موجودی انبار را وارد کنید.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-4">
          <h3 className="border-b border-[var(--ui-border)] pb-2 text-sm font-bold text-[var(--ui-text)]">اطلاعات اصلی</h3>
          <label className={labelClass}>نام محصول
            <input type="text" value={newProduct.name} onChange={(event) => updateField("name", event.target.value)} className={fieldClass} maxLength={160} required />
          </label>
          <label className={labelClass}>توضیحات
            <textarea value={newProduct.description} onChange={(event) => updateField("description", event.target.value)} rows={3} className={fieldClass} maxLength={5000} required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>قیمت ({priceUnitLabel})
              <input type="number" min="0" step="1" inputMode="numeric" value={newProduct.price} onChange={(event) => updateField("price", event.target.value)} className={fieldClass} required />
            </label>
            <label className={labelClass}>موجودی انبار
              <input type="number" min="0" step="1" inputMode="numeric" value={newProduct.stock} onChange={(event) => updateField("stock", event.target.value)} className={fieldClass} required />
            </label>
          </div>
          <label className={labelClass}>دسته‌بندی
            <select
              value={newProduct.categoryId}
              onChange={(event) => {
                const selected = categoryChoices.find((item) => String(item._id) === event.target.value);
                setNewProduct((current) => ({ ...current, categoryId: event.target.value, category: selected?.slug || "" }));
                setAttributeValues({});
              }}
              className={fieldClass}
              required
              disabled={categoryChoices.length === 0}
            >
              <option value="">یک دسته‌بندی انتخاب کنید</option>
              {categoryChoices.map((category) => (
                <option key={category._id} value={category._id}>{categoryPath(category, categoryChoices)}</option>
              ))}
            </select>
            {categoryChoices.length === 0 && <span className="mt-2 block rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-3 text-xs leading-5 text-[var(--ui-warning)]">هنوز دسته‌بندی فعالی وجود ندارد. ابتدا از بخش مدیریت دسته‌بندی‌ها یک دسته بسازید؛ هیچ دسته پیش‌فرضی به‌صورت ثابت در فروشگاه تعریف نشده است.</span>}
          </label>
        </section>

        <CategoryAttributeFields
          definitions={selectedCategoryAttributes}
          values={attributeValues}
          onChange={(key, value) => setAttributeValues((current) => ({ ...current, [key]: value }))}
          fieldClass={fieldClass}
          labelClass={labelClass}
        />

        <section className="space-y-3">
          <h3 className="border-b border-[var(--ui-border)] pb-2 text-sm font-bold text-[var(--ui-text)]">گالری تصاویر محصول</h3>
          <p className="text-xs leading-5 text-[var(--ui-muted)]">تا ۸ تصویر اضافه کنید؛ تصویر اول تصویر اصلی محصول خواهد بود. برای قطعات فنی، تصاویر نمای روبه‌رو، پورت‌ها، برچسب مشخصات و اقلام داخل جعبه مفید هستند.</p>
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" id="product-images" className="sr-only" accept="image/*" multiple onChange={handleImageChange} disabled={imageBusy || newProduct.images.length >= 8} />
            <label htmlFor="product-images" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-4 py-2.5 text-sm font-medium text-[var(--ui-text)] transition hover:bg-[var(--ui-hover)]"><Upload size={18} aria-hidden="true" />انتخاب تصاویر</label>
            <span className="text-xs text-[var(--ui-muted)]">{newProduct.images.length ? newProduct.images.length + " تصویر انتخاب شده" : "هنوز تصویری انتخاب نشده"}</span>
          </div>
          {newProduct.images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {newProduct.images.map((image, index) => (
                <div key={image} className="relative overflow-hidden rounded-xl border border-[var(--ui-border)]">
                  <img src={image} alt={"پیش‌نمایش محصول " + (index + 1)} className="aspect-square w-full object-contain bg-white" />
                  {index === 0 && <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">تصویر اصلی</span>}
                  <button type="button" aria-label={"حذف تصویر " + (index + 1)} onClick={() => updateField("images", newProduct.images.filter((_, imageIndex) => imageIndex !== index))} className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><X size={14} aria-hidden="true" /></button>
                </div>
              ))}
            </div>
          )}
        </section>

        {imageError && <p role="alert" className="rounded-xl border border-[var(--ui-danger-border)] bg-red-950/40 p-3 text-sm leading-6 text-[var(--ui-danger)]">{imageError}</p>}
        <button type="submit" disabled={loading || imageBusy || categoryChoices.length === 0} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ui-accent)] px-4 py-3 text-sm font-semibold text-[var(--ui-button-text)] shadow-sm transition hover:bg-[var(--ui-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <><Loader className="h-5 w-5 animate-spin" aria-hidden="true" />در حال ذخیره…</> : <><PlusCircle className="h-5 w-5" aria-hidden="true" />ایجاد محصول</>}
        </button>
      </form>
    </motion.div>
  );
};

export default CreateProductForm;
