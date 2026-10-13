import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Filter, LoaderCircle, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { formatPrice, getCurrencyLabel, STORE_CURRENCY } from "../lib/commerce";
import { useProductStore } from "../stores/useProductStore";

const categoryLabels = {
  jeans: "شلوار جین",
  "t-shirts": "تی‌شرت",
  shoes: "کفش",
  glasses: "عینک",
  jackets: "کت و کاپشن",
  suits: "کت‌وشلوار",
  bags: "کیف",
};

const fitLabels = {
  "true-to-size": "مطابق سایز استاندارد",
  slim: "جذب",
  regular: "معمولی",
  relaxed: "آزاد",
  oversized: "آزاد و اورسایز",
  athletic: "ورزشی",
};

const sortOptions = [
  ["newest", "جدیدترین"],
  ["priceAsc", "ارزان‌ترین"],
  ["priceDesc", "گران‌ترین"],
  ["nameAsc", "نام محصول (الف تا ی)"],
];

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

const normalizeDigits = (value) =>
  String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));

const normalizePersian = (value) =>
  normalizeDigits(value)
    .normalize("NFKC")
    .toLocaleLowerCase("fa-IR")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u0640\u064B-\u065F\u0670]/g, "")
    .replace(/[\u200C\u200D]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

const priceUnitLabel = getCurrencyLabel(STORE_CURRENCY);
const usesWholeCurrencyUnits = true;

const parseStorePrice = (value) => {
  if (String(value ?? "").trim() === "") return null;
  const normalized = normalizeDigits(value)
    .replace(/[,\u060C\u066C\u2009\s]/g, "")
    .replace(/[٫]/g, ".");
  const validFormat = usesWholeCurrencyUnits ? /^\d+$/.test(normalized) : /^\d+(?:\.\d{1,2})?$/.test(normalized);
  if (!validFormat) return Number.NaN;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return Number.NaN;
  return usesWholeCurrencyUnits && !Number.isSafeInteger(amount) ? Number.NaN : amount;
};

const formatStorePrice = (value) => formatPrice(value, STORE_CURRENCY);

const makeEmptyFilters = () => ({
  q: "",
  minPrice: "",
  maxPrice: "",
  sizes: [],
  colors: [],
  fits: [],
  brands: [],
  inStock: false,
  sort: "newest",
});

const uniqueByNormalizedName = (values) => {
  const seen = new Set();
  return values
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim())
    .filter((value) => {
      const normalized = normalizePersian(value);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, "fa", { numeric: true }));
};

const getProductSizes = (product) => [
  ...(Array.isArray(product.sizes) ? product.sizes : []),
  ...(Array.isArray(product.variants) ? product.variants.map((variant) => variant.size) : []),
].filter((size) => typeof size === "string" && size.trim());

const getProductColors = (product) => [
  ...(Array.isArray(product.colors) ? product.colors.map((color) => color?.name) : []),
  ...(Array.isArray(product.variants) ? product.variants.map((variant) => variant.color) : []),
].filter((color) => typeof color === "string" && color.trim());

const getProductBrand = (product) => {
  if (typeof product.brand === "string") return product.brand.trim();
  if (typeof product.brandName === "string") return product.brandName.trim();
  if (typeof product.brand?.name === "string") return product.brand.name.trim();
  return "";
};

const isProductAvailable = (product) => {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.some((variant) => Number(variant.stock) > 0);
  }
  if (typeof product.stock === "number" && Number.isFinite(product.stock)) {
    return product.stock > 0;
  }
  // Older products without tracked stock remain purchasable in the existing shop flow.
  return true;
};

const getPriceError = (filters) => {
  const min = parseStorePrice(filters.minPrice);
  const max = parseStorePrice(filters.maxPrice);
  if (Number.isNaN(min) || Number.isNaN(max)) return "قیمت را فقط با عدد وارد کنید.";
  if (min !== null && max !== null && min > max) {
    return "حداقل قیمت نباید از حداکثر قیمت بیشتر باشد.";
  }
  return "";
};

const filterCatalog = (catalog, filters) => {
  const minPrice = parseStorePrice(filters.minPrice);
  const maxPrice = parseStorePrice(filters.maxPrice);
  if (getPriceError(filters)) return [];

  const query = normalizePersian(filters.q);
  const filtered = catalog.filter((product) => {
    if (query) {
      const searchableText = [
        product.name,
        product.description,
        product.category,
        categoryLabels[product.category] || "",
        ...getProductSizes(product),
        ...getProductColors(product),
        fitLabels[product.fit?.type] || product.fit?.type || "",
        getProductBrand(product),
      ].join(" ");
      if (!normalizePersian(searchableText).includes(query)) return false;
    }

    const productPrice = Number(product.price);
    if (minPrice !== null && (!Number.isFinite(productPrice) || productPrice < minPrice)) return false;
    if (maxPrice !== null && (!Number.isFinite(productPrice) || productPrice > maxPrice)) return false;

    if (filters.sizes.length) {
      const productSizes = getProductSizes(product).map(normalizePersian);
      if (!filters.sizes.some((size) => productSizes.includes(normalizePersian(size)))) return false;
    }

    if (filters.colors.length) {
      const productColors = getProductColors(product).map(normalizePersian);
      if (!filters.colors.some((color) => productColors.includes(normalizePersian(color)))) return false;
    }

    if (filters.fits.length) {
      const fit = normalizePersian(product.fit?.type || "");
      if (!filters.fits.some((value) => normalizePersian(value) === fit)) return false;
    }

    if (filters.brands.length) {
      const brand = normalizePersian(getProductBrand(product));
      if (!filters.brands.some((value) => normalizePersian(value) === brand)) return false;
    }

    if (filters.inStock && !isProductAvailable(product)) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sort === "priceAsc") return Number(a.price) - Number(b.price);
    if (filters.sort === "priceDesc") return Number(b.price) - Number(a.price);
    if (filters.sort === "nameAsc") return normalizePersian(a.name).localeCompare(normalizePersian(b.name), "fa");
    if (filters.sort === "oldest") return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
};

const CategoryPage = () => {
  const { category = "" } = useParams();
  const { fetchProductsByCategory, products, loading } = useProductStore();
  const [filters, setFilters] = useState(makeEmptyFilters);
  const [draftFilters, setDraftFilters] = useState(makeEmptyFilters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setFilters(makeEmptyFilters());
    setDraftFilters(makeEmptyFilters());
    setMobileFiltersOpen(false);
    fetchProductsByCategory(category);
  }, [fetchProductsByCategory, category]);

  const catalog = Array.isArray(products) ? products : [];
  const filteredProducts = useMemo(() => filterCatalog(catalog, filters), [catalog, filters]);
  const draftResultCount = useMemo(() => filterCatalog(catalog, draftFilters).length, [catalog, draftFilters]);

  const sizeOptions = useMemo(
    () => uniqueByNormalizedName(catalog.flatMap(getProductSizes)),
    [catalog],
  );

  const colorOptions = useMemo(() => {
    const colors = [];
    const seen = new Set();
    catalog.forEach((product) => {
      const hexByName = new Map(
        (Array.isArray(product.colors) ? product.colors : [])
          .filter((color) => color?.name)
          .map((color) => [normalizePersian(color.name), color.hex]),
      );
      getProductColors(product).forEach((name) => {
        const key = normalizePersian(name);
        if (!key || seen.has(key)) return;
        seen.add(key);
        colors.push({ name, hex: hexByName.get(key) || "" });
      });
    });
    return colors.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }, [catalog]);

  const fitOptions = useMemo(
    () => uniqueByNormalizedName(catalog.map((product) => product.fit?.type).filter(Boolean)),
    [catalog],
  );
  const brandOptions = useMemo(
    () => uniqueByNormalizedName(catalog.map(getProductBrand).filter(Boolean)),
    [catalog],
  );

  const updateFilter = (setter, field, value) => {
    setter((current) => {
      if (["sizes", "colors", "fits", "brands"].includes(field)) {
        const existing = current[field];
        return {
          ...current,
          [field]: existing.includes(value)
            ? existing.filter((entry) => entry !== value)
            : [...existing, value],
        };
      }
      return { ...current, [field]: value };
    });
  };

  const clearAllFilters = () => {
    setFilters(makeEmptyFilters());
    setDraftFilters(makeEmptyFilters());
    setMobileFiltersOpen(false);
  };

  const removeFilter = (field, value) => {
    setFilters((current) => {
      if (["sizes", "colors", "fits", "brands"].includes(field)) {
        return { ...current, [field]: current[field].filter((entry) => entry !== value) };
      }
      if (field === "inStock") return { ...current, inStock: false };
      if (field === "sort") return { ...current, sort: "newest" };
      return { ...current, [field]: "" };
    });
  };

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.q.trim()) chips.push({ field: "q", label: "جست‌وجو: «" + filters.q.trim() + "»" });
    if (filters.minPrice.trim()) {
      const value = parseStorePrice(filters.minPrice);
      chips.push({ field: "minPrice", label: "از " + (value !== null && Number.isFinite(value) ? formatStorePrice(value) : filters.minPrice + " " + priceUnitLabel) });
    }
    if (filters.maxPrice.trim()) {
      const value = parseStorePrice(filters.maxPrice);
      chips.push({ field: "maxPrice", label: "تا " + (value !== null && Number.isFinite(value) ? formatStorePrice(value) : filters.maxPrice + " " + priceUnitLabel) });
    }
    filters.sizes.forEach((value) => chips.push({ field: "sizes", value, label: "سایز: " + value }));
    filters.colors.forEach((value) => chips.push({ field: "colors", value, label: "رنگ: " + value }));
    filters.fits.forEach((value) => chips.push({ field: "fits", value, label: "تن‌خور: " + (fitLabels[value] || value) }));
    filters.brands.forEach((value) => chips.push({ field: "brands", value, label: "برند: " + value }));
    if (filters.inStock) chips.push({ field: "inStock", label: "فقط کالاهای موجود" });
    if (filters.sort !== "newest") {
      const sortLabel = sortOptions.find(([value]) => value === filters.sort)?.[1];
      if (sortLabel) chips.push({ field: "sort", label: "مرتب‌سازی: " + sortLabel });
    }
    return chips;
  }, [filters]);

  const renderFilterFields = (current, onFilterChange) => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <fieldset className="min-w-0 space-y-2">
        <legend className="text-sm font-semibold text-[#41443b]">محدوده قیمت ({priceUnitLabel})</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-[#77786f]">
            از
            <input
              type="text"
              inputMode="numeric"
              dir="ltr"
              maxLength={18}
              value={current.minPrice}
              onChange={(event) => onFilterChange("minPrice", event.target.value)}
              placeholder="۳۰۰۰۰۰"
              aria-label={"حداقل قیمت به " + priceUnitLabel}
              className="mt-1 min-h-11 w-full rounded-xl border border-[#dedbd2] bg-white px-3 py-2 text-sm tabular-nums text-[#252722] outline-none transition placeholder:text-[#aaa99f] focus:border-[#68745f] focus:ring-4 focus:ring-[#68745f]/10"
            />
          </label>
          <label className="block text-xs text-[#77786f]">
            تا
            <input
              type="text"
              inputMode="numeric"
              dir="ltr"
              maxLength={18}
              value={current.maxPrice}
              onChange={(event) => onFilterChange("maxPrice", event.target.value)}
              placeholder="۲۰۰۰۰۰۰"
              aria-label={"حداکثر قیمت به " + priceUnitLabel}
              className="mt-1 min-h-11 w-full rounded-xl border border-[#dedbd2] bg-white px-3 py-2 text-sm tabular-nums text-[#252722] outline-none transition placeholder:text-[#aaa99f] focus:border-[#68745f] focus:ring-4 focus:ring-[#68745f]/10"
            />
          </label>
        </div>
        {getPriceError(current) && (
          <p role="alert" className="text-xs leading-5 text-[#a13f35]">{getPriceError(current)}</p>
        )}
        <p className="text-[11px] leading-5 text-[#85867d]">قیمت‌ها بر اساس {priceUnitLabel} هستند؛ اعداد فارسی و انگلیسی پذیرفته می‌شوند.</p>
      </fieldset>

      <fieldset className="min-w-0 space-y-2">
        <legend className="text-sm font-semibold text-[#41443b]">مرتب‌سازی</legend>
        <select
          value={current.sort}
          onChange={(event) => onFilterChange("sort", event.target.value)}
          aria-label="مرتب‌سازی محصولات"
          className="min-h-11 w-full rounded-xl border border-[#dedbd2] bg-white px-3 py-2 text-sm text-[#252722] outline-none transition focus:border-[#68745f] focus:ring-4 focus:ring-[#68745f]/10"
        >
          {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#e4e0d8] bg-white px-3 py-2 text-sm text-[#41443b] transition hover:border-[#c7c3b9]">
          <input
            type="checkbox"
            checked={current.inStock}
            onChange={(event) => onFilterChange("inStock", event.target.checked)}
            className="h-4 w-4 accent-[#68745f]"
          />
          فقط کالاهای موجود
        </label>
      </fieldset>

      {sizeOptions.length > 0 && (
        <fieldset className="min-w-0 space-y-2">
          <legend className="text-sm font-semibold text-[#41443b]">سایز</legend>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#e4e0d8] bg-white p-2">
            {sizeOptions.map((option) => (
              <label key={option} className={"inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition " + (current.sizes.includes(option) ? "border-[#68745f] bg-[#e9ede4] text-[#41443b]" : "border-[#ece9e1] text-[#62645c] hover:border-[#c7c3b9]")}>
                <input
                  type="checkbox"
                  checked={current.sizes.includes(option)}
                  onChange={() => onFilterChange("sizes", option)}
                  className="h-3.5 w-3.5 accent-[#68745f]"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {colorOptions.length > 0 && (
        <fieldset className="min-w-0 space-y-2">
          <legend className="text-sm font-semibold text-[#41443b]">رنگ</legend>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#e4e0d8] bg-white p-2">
            {colorOptions.map((option) => (
              <label key={option.name} className={"inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition " + (current.colors.includes(option.name) ? "border-[#68745f] bg-[#e9ede4] text-[#41443b]" : "border-[#ece9e1] text-[#62645c] hover:border-[#c7c3b9]")}>
                <input
                  type="checkbox"
                  checked={current.colors.includes(option.name)}
                  onChange={() => onFilterChange("colors", option.name)}
                  className="h-3.5 w-3.5 accent-[#68745f]"
                />
                {option.hex && <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: option.hex }} />}
                <span>{option.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {fitOptions.length > 0 && (
        <fieldset className="min-w-0 space-y-2">
          <legend className="text-sm font-semibold text-[#41443b]">نوع تن‌خور</legend>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#e4e0d8] bg-white p-2">
            {fitOptions.map((option) => (
              <label key={option} className={"inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition " + (current.fits.includes(option) ? "border-[#68745f] bg-[#e9ede4] text-[#41443b]" : "border-[#ece9e1] text-[#62645c] hover:border-[#c7c3b9]")}>
                <input
                  type="checkbox"
                  checked={current.fits.includes(option)}
                  onChange={() => onFilterChange("fits", option)}
                  className="h-3.5 w-3.5 accent-[#68745f]"
                />
                <span>{fitLabels[option] || option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {brandOptions.length > 0 && (
        <fieldset className="min-w-0 space-y-2">
          <legend className="text-sm font-semibold text-[#41443b]">برند</legend>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#e4e0d8] bg-white p-2">
            {brandOptions.map((option) => (
              <label key={option} className={"inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition " + (current.brands.includes(option) ? "border-[#68745f] bg-[#e9ede4] text-[#41443b]" : "border-[#ece9e1] text-[#62645c] hover:border-[#c7c3b9]")}>
                <input
                  type="checkbox"
                  checked={current.brands.includes(option)}
                  onChange={() => onFilterChange("brands", option)}
                  className="h-3.5 w-3.5 accent-[#68745f]"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );

  const pageTitle = categoryLabels[category] || category.replace(/-/g, " ");
  const priceError = getPriceError(filters);

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f5f0] px-3 py-7 text-[#252722] sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-[1920px]">
        <header className="mb-6 flex flex-col gap-4 border-b border-[#e4e0d8] pb-5 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
          <div className="min-w-0">
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#68745f]">
              <ShoppingBag size={15} aria-hidden="true" />
              مجموعه تیک بوتیک
            </p>
            <motion.h1
              className="text-3xl font-semibold tracking-tight text-[#252722] sm:text-4xl"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {pageTitle}
            </motion.h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77786f]">
              با جست‌وجوی فارسی و فیلترهای سایز، رنگ، تن‌خور و قیمت به {priceUnitLabel}، انتخابتان را دقیق‌تر کنید.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div aria-live="polite" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e4e0d8] bg-[#fffefa] px-4 py-2 text-sm text-[#62645c]">
              {loading ? (
                <>
                  <LoaderCircle size={16} className="animate-spin text-[#68745f]" aria-hidden="true" />
                  در حال دریافت محصولات…
                </>
              ) : (
                <>
                  <ShoppingBag size={16} className="text-[#68745f]" aria-hidden="true" />
                  {new Intl.NumberFormat("fa-IR").format(filteredProducts.length)} محصول
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setDraftFilters(filters);
                setMobileFiltersOpen(true);
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d5d0c5] bg-[#fffefa] px-4 py-2 text-sm font-semibold text-[#41443b] transition hover:border-[#a8a597] hover:bg-[#e9ede4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] md:hidden"
            >
              <Filter size={16} aria-hidden="true" />
              فیلترها
              {activeChips.length > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#68745f] px-1.5 py-0.5 text-xs font-bold text-white">
                  {new Intl.NumberFormat("fa-IR").format(activeChips.length)}
                </span>
              )}
            </button>
          </div>
        </header>

        <section aria-label="جست‌وجو در این دسته‌بندی" className="mb-5 rounded-2xl border border-[#e4e0d8] bg-[#fffefa] p-3 shadow-[0_8px_30px_-24px_rgba(37,39,34,0.22)] sm:p-4">
          <label htmlFor="category-product-search" className="mb-2 block text-sm font-semibold text-[#41443b]">جست‌وجو در {pageTitle}</label>
          <div className="flex min-h-12 items-center gap-2 rounded-xl border border-[#dedbd2] bg-white px-3 transition focus-within:border-[#68745f] focus-within:ring-4 focus-within:ring-[#68745f]/10">
            <Search size={19} className="shrink-0 text-[#68745f]" aria-hidden="true" />
            <input
              id="category-product-search"
              type="search"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="مثلاً تی‌شرت مشکی، سایز بزرگ، شلوار جین…"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-[#252722] outline-none placeholder:text-[#9a9a90]"
            />
            {filters.q && (
              <button type="button" onClick={() => setFilters((current) => ({ ...current, q: "" }))} aria-label="پاک‌کردن عبارت جست‌وجو" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#77786f] transition hover:bg-[#f2f0e9] hover:text-[#252722]">
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-[#85867d]">جست‌وجو با حروف «ی» و «ک» فارسی یا عربی و اعداد فارسی و انگلیسی پشتیبانی می‌شود.</p>
        </section>

        <section aria-label="فیلترهای محصولات" className="mb-5 hidden rounded-2xl border border-[#e4e0d8] bg-[#fffefa] p-4 shadow-[0_8px_30px_-24px_rgba(37,39,34,0.22)] md:block sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeae1] pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-[#68745f]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#252722]">فیلترها</h2>
              <span className="text-xs text-[#85867d]">نتایج بر اساس مشخصات ثبت‌شده محصول</span>
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={activeChips.length === 0}
              className="inline-flex min-h-9 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-[#68745f] transition hover:bg-[#e9ede4] hover:text-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] disabled:cursor-not-allowed disabled:text-[#a9a99f] disabled:hover:bg-transparent"
            >
              <X size={15} aria-hidden="true" />
              پاک‌کردن فیلترها
            </button>
          </div>
          {renderFilterFields(filters, (field, value) => updateFilter(setFilters, field, value))}
        </section>

        {activeChips.length > 0 && (
          <section aria-label="فیلترهای فعال" className="mb-5 rounded-2xl border border-[#e4e0d8] bg-white/70 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#41443b]">
                <SlidersHorizontal size={15} className="text-[#68745f]" aria-hidden="true" />
                فیلترهای فعال
                <span className="text-xs font-medium text-[#85867d]">({new Intl.NumberFormat("fa-IR").format(activeChips.length)})</span>
              </div>
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex min-h-9 items-center rounded-full px-3 text-xs font-bold text-[#68745f] transition hover:bg-[#e9ede4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]"
              >
                پاک‌کردن فیلترها
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeChips.map((chip, index) => (
                <button
                  key={chip.field + ":" + (chip.value || chip.label) + ":" + index}
                  type="button"
                  onClick={() => removeFilter(chip.field, chip.value)}
                  aria-label={"حذف فیلتر " + chip.label}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#d5d0c5] bg-[#fffefa] px-3 py-1.5 text-xs font-medium text-[#41443b] transition hover:border-[#a8a597] hover:bg-[#e9ede4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
                >
                  <span>{chip.label}</span>
                  <X size={13} className="text-[#85867d]" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}

        {priceError && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{priceError}</p>
        )}

        {loading ? (
          <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-[#62645c]">
            <LoaderCircle size={28} className="animate-spin text-[#68745f]" aria-hidden="true" />
            در حال آماده‌سازی محصولات…
          </div>
        ) : filteredProducts.length > 0 ? (
          <motion.div
            className="grid grid-cols-2 justify-items-stretch gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {filteredProducts.map((product) => <ProductCard key={product._id} product={product} />)}
          </motion.div>
        ) : (
          <section className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-[#d8d4c9] bg-[#fffefa] px-5 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9ede4] text-[#68745f]">
              <Search size={24} aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-[#252722]">محصولی پیدا نشد</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#77786f]">
              {activeChips.length > 0
                ? "فیلترها یا عبارت جست‌وجو را تغییر دهید تا محصولات بیشتری ببینید."
                : "در حال حاضر محصولی در این دسته‌بندی ثبت نشده است."}
            </p>
            {activeChips.length > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#252722] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
              >
                پاک‌کردن فیلترها
              </button>
            )}
          </section>
        )}
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            aria-label="بستن فیلترها"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 h-full w-full bg-[#252722]/45 backdrop-blur-sm"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-category-filters-title"
            className="absolute inset-y-0 right-0 flex h-[100dvh] w-[min(94vw,30rem)] flex-col border-l border-[#e4e0d8] bg-[#f7f5f0] shadow-[0_24px_80px_-20px_rgba(37,39,34,0.42)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#e4e0d8] bg-[#fffefa] px-4 py-4">
              <div>
                <h2 id="mobile-category-filters-title" className="text-lg font-semibold text-[#252722]">فیلتر محصولات</h2>
                <p className="mt-1 text-xs text-[#77786f]">نتیجه فعلی: {new Intl.NumberFormat("fa-IR").format(draftResultCount)} محصول</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="بستن پنجره فیلترها"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e4e0d8] bg-white text-[#62645c] transition hover:bg-[#f2f0e9] hover:text-[#252722]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
              {renderFilterFields(draftFilters, (field, value) => updateFilter(setDraftFilters, field, value))}
            </div>
            <div className="border-t border-[#e4e0d8] bg-[#fffefa] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <p aria-live="polite" className="mb-3 text-center text-sm font-semibold text-[#62645c]">
                {getPriceError(draftFilters) || (new Intl.NumberFormat("fa-IR").format(draftResultCount) + " محصول با این فیلترها")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#d5d0c5] bg-white px-3 py-2.5 text-sm font-semibold text-[#41443b] transition hover:bg-[#f2f0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]"
                >
                  پاک‌کردن فیلترها
                </button>
                <button
                  type="button"
                  disabled={Boolean(getPriceError(draftFilters))}
                  onClick={() => {
                    setFilters((current) => ({ ...draftFilters, q: current.q }));
                    setMobileFiltersOpen(false);
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#252722] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  نمایش {new Intl.NumberFormat("fa-IR").format(draftResultCount)} محصول
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

export default CategoryPage;
