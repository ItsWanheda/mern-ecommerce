"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useDialogAccessibility } from "../lib/useDialogAccessibility.js";
import { Filter, LoaderCircle, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import PageMeta from "../components/PageMeta";
import { hasIndexExcludedQuery } from "../lib/seo-utils.js";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { formatPrice, getCurrencyLabel, STORE_CURRENCY } from "../lib/commerce";
import { normalizeDigits } from "../lib/persian-search";
import { useProductStore } from "../stores/useProductStore";
import { useCategoryStore } from "../stores/useCategoryStore";
import { decodeCategoryRoute, resolveCategoryRoute } from "../lib/category-route.js";
import { resolveCategoryAttributeDefinitions } from "../lib/category-attributes.js";

const sortOptions = [
  ["newest", "جدیدترین"],
  ["priceAsc", "ارزان‌ترین"],
  ["priceDesc", "گران‌ترین"],
  ["nameAsc", "نام محصول (الف تا ی)"],
];

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
  inStock: false,
  attributes: {},
  sort: "newest",
});

const CATEGORY_PAGE_SIZE = 24;

const parsePageNumber = (value) => {
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? Math.min(page, 100000) : 1;
};

const filtersFromParams = (params) => {
  const filters = makeEmptyFilters();
  filters.q = params.get("q") || "";
  filters.minPrice = params.get("minPrice") || "";
  filters.maxPrice = params.get("maxPrice") || "";
  filters.inStock = params.get("inStock") === "1";
  const sort = params.get("sort");
  if (["newest", "oldest", "priceAsc", "priceDesc", "nameAsc"].includes(sort)) filters.sort = sort;
  try {
    const attributes = JSON.parse(params.get("attributes") || "{}");
    if (attributes && typeof attributes === "object" && !Array.isArray(attributes)) filters.attributes = attributes;
  } catch {}
  return filters;
};

const paramsFromFilters = (filters) => {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.minPrice.trim()) params.set("minPrice", filters.minPrice.trim());
  if (filters.maxPrice.trim()) params.set("maxPrice", filters.maxPrice.trim());
  if (filters.inStock) params.set("inStock", "1");
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (Object.keys(filters.attributes || {}).length) params.set("attributes", JSON.stringify(filters.attributes));
  return params;
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

const CategoryPage = ({ slug: routeSlug }) => {
  const { slug: matchedSlug } = useParams();
  const category = decodeCategoryRoute(routeSlug || matchedSlug || "");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastAppliedUrlRef = useRef(searchParams.toString());
  const urlChangedRef = useRef(false);
  const { fetchProductsByCategory, products, loading, priceBounds: remotePriceBounds, categoryPagination } = useProductStore();
  const { categories: dynamicCategories, categoriesLoaded, categoriesError, fetchCategories } = useCategoryStore();
  const categoryRoute = resolveCategoryRoute(category, dynamicCategories);
  const selectedCategory = categoryRoute.category;
  const categorySlug = categoryRoute.slug;
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  useEffect(() => {
    if (!selectedCategory || selectedCategory.slug === category) return;
    const nextPath = "/category/" + encodeURIComponent(selectedCategory.slug) + window.location.search;
    navigate(nextPath, { replace: true });
  }, [category, navigate, selectedCategory]);
  const [filters, setFilters] = useState(() => filtersFromParams(searchParams));
  const [draftFilters, setDraftFilters] = useState(() => filtersFromParams(searchParams));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileFiltersDialogRef = useDialogAccessibility(
    mobileFiltersOpen,
    () => setMobileFiltersOpen(false),
  );
  const [page, setPage] = useState(() => parsePageNumber(searchParams.get("page")));
  const [draftResultCount, setDraftResultCount] = useState(0);

  useEffect(() => {
    const serialized = searchParams.toString();
    if (serialized !== lastAppliedUrlRef.current) {
      lastAppliedUrlRef.current = serialized;
      urlChangedRef.current = true;
      const fromUrl = filtersFromParams(searchParams);
      setFilters(fromUrl);
      setDraftFilters(fromUrl);
      setPage(parsePageNumber(searchParams.get("page")));
    }
  }, [searchParams]);

  useEffect(() => {
    if (urlChangedRef.current) {
      urlChangedRef.current = false;
      return;
    }
    const nextParams = paramsFromFilters(filters);
    if (page > 1) nextParams.set("page", String(page));
    const serialized = nextParams.toString();
    if (serialized !== searchParams.toString()) {
      lastAppliedUrlRef.current = serialized;
      setSearchParams(new URLSearchParams(serialized), { replace: true });
    }
  }, [filters, page, searchParams, setSearchParams]);

  useEffect(() => {
    const fromUrl = filtersFromParams(new URLSearchParams(window.location.search));
    setFilters(fromUrl);
    setDraftFilters(fromUrl);
    setMobileFiltersOpen(false);
    setPage(parsePageNumber(new URLSearchParams(window.location.search).get("page")));
  }, [category]);

  useEffect(() => {
    if (!categoriesLoaded || !selectedCategory || getPriceError(filters)) return;
    const query = paramsFromFilters(filters);
    query.set("page", String(page));
    query.set("limit", String(CATEGORY_PAGE_SIZE));
    fetchProductsByCategory(categorySlug, query.toString());
  }, [fetchProductsByCategory, categorySlug, filters, page, categoriesLoaded, selectedCategory]);

  const catalog = Array.isArray(products) ? products : [];
  const priceBounds = useMemo(() => {
    const reportedCount = Number(remotePriceBounds?.count);
    const reportedMin = Number(remotePriceBounds?.minPrice);
    const reportedMax = Number(remotePriceBounds?.maxPrice);
    if (
      remotePriceBounds &&
      reportedCount > 0 &&
      Number.isFinite(reportedMin) &&
      Number.isFinite(reportedMax)
    ) {
      const minPrice = Math.max(0, Math.floor(reportedMin));
      return {
        minPrice,
        maxPrice: Math.max(minPrice + 1, Math.ceil(reportedMax)),
        count: reportedCount,
      };
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let count = 0;
    catalog.forEach((product) => {
      const amount = Number(product.price);
      if (!Number.isFinite(amount) || amount < 0) return;
      min = Math.min(min, amount);
      max = Math.max(max, amount);
      count += 1;
    });
    if (!count) return { minPrice: 0, maxPrice: 1, count: 0 };
    const minPrice = Math.max(0, Math.floor(min));
    return {
      minPrice,
      maxPrice: Math.max(minPrice + 1, Math.ceil(max)),
      count,
    };
  }, [catalog, remotePriceBounds]);
  const currentFilterError = getPriceError(filters);
  const filteredProducts = currentFilterError ? [] : catalog;
  const resultCount = currentFilterError ? 0 : Number(categoryPagination?.total ?? catalog.length);
  const pageCount = Math.max(1, Number(categoryPagination?.pages) || Math.ceil(resultCount / CATEGORY_PAGE_SIZE));
  const visibleProducts = filteredProducts;

  const appliedFiltersKey = useMemo(() => paramsFromFilters(filters).toString(), [filters]);
  const draftFiltersKey = useMemo(() => paramsFromFilters(draftFilters).toString(), [draftFilters]);

  useEffect(() => {
    if (!categoriesLoaded || !selectedCategory) {
      setDraftResultCount(0);
      return;
    }
    if (getPriceError(draftFilters)) {
      setDraftResultCount(0);
      return;
    }
    if (appliedFiltersKey === draftFiltersKey) {
      setDraftResultCount(resultCount);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const query = new URLSearchParams(draftFiltersKey);
      query.set("page", "1");
      query.set("limit", "1");
      query.set("countOnly", "1");
      try {
        const response = await axios.get(`/products/category/${encodeURIComponent(categorySlug)}?${query.toString()}`);
        if (!cancelled) setDraftResultCount(Number(response.data.pagination?.total || 0));
      } catch {
        if (!cancelled) setDraftResultCount(0);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [categorySlug, appliedFiltersKey, draftFiltersKey, resultCount, draftFilters, categoriesLoaded, selectedCategory]);

  const categoryAttributeDefinitions = useMemo(
    () => resolveCategoryAttributeDefinitions(selectedCategory, dynamicCategories, { filterableOnly: true }),
    [dynamicCategories, selectedCategory],
  );

  const updateFilter = (setter, field, value) => {
    setter((current) => ({ ...current, [field]: value }));
    if (setter === setFilters) setPage(1);
  };

  const clearAllFilters = () => {
    const empty = makeEmptyFilters();
    lastAppliedUrlRef.current = "";
    urlChangedRef.current = false;
    setSearchParams(new URLSearchParams(), { replace: true });
    setFilters(empty);
    setDraftFilters(empty);
    setMobileFiltersOpen(false);
    setPage(1);
  };

  const removeFilter = (field, value) => {
    setPage(1);
    setFilters((current) => {
      if (field === "inStock") return { ...current, inStock: false };
      if (field === "attributes") {
        const attributes = { ...(current.attributes || {}) };
        delete attributes[value];
        return { ...current, attributes };
      }
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
    Object.entries(filters.attributes || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return;
      const definition = categoryAttributeDefinitions.find((attribute) => attribute.key === key);
      const values = Array.isArray(value) ? value : [value];
      const labels = values.map((entry) => definition?.options?.find((option) => option.value === String(entry))?.name?.fa || String(entry));
      chips.push({ field: "attributes", value: key, label: (definition?.name?.fa || key) + ": " + labels.join("، ") });
    });
    if (filters.inStock) chips.push({ field: "inStock", label: "فقط کالاهای موجود" });
    if (filters.sort !== "newest") {
      const sortLabel = sortOptions.find(([value]) => value === filters.sort)?.[1];
      if (sortLabel) chips.push({ field: "sort", label: "مرتب‌سازی: " + sortLabel });
    }
    return chips;
  }, [filters, categoryAttributeDefinitions]);

  const renderFilterFields = (current, onFilterChange) => {
    const rangeMin = priceBounds.minPrice;
    const rangeMax = Math.max(rangeMin + 1, priceBounds.maxPrice);
    const span = rangeMax - rangeMin;
    const sliderStep = Math.max(1, Math.ceil(span / 1200));
    const minParsed = parseStorePrice(current.minPrice);
    const maxParsed = parseStorePrice(current.maxPrice);
    const clampToRange = (value, fallback) =>
      Number.isFinite(value) ? Math.min(rangeMax, Math.max(rangeMin, value)) : fallback;
    const minCandidate = clampToRange(minParsed, rangeMin);
    const maxCandidate = clampToRange(maxParsed, rangeMax);
    const sliderMinValue = Math.min(minCandidate, maxCandidate);
    const sliderMaxValue = Math.max(minCandidate, maxCandidate);
    const sliderMinPercent = ((sliderMinValue - rangeMin) / span) * 100;
    const sliderMaxPercent = ((sliderMaxValue - rangeMin) / span) * 100;
    const updateSliderPrice = (field, rawValue) => {
      const value = Math.min(rangeMax, Math.max(rangeMin, Math.round(Number(rawValue))));
      const nextMin = field === "minPrice" ? Math.min(value, sliderMaxValue) : sliderMinValue;
      const nextMax = field === "maxPrice" ? Math.max(value, sliderMinValue) : sliderMaxValue;
      onFilterChange("minPrice", nextMin <= rangeMin ? "" : String(nextMin));
      onFilterChange("maxPrice", nextMax >= rangeMax ? "" : String(nextMax));
    };
    const selectedAttributes = current.attributes || {};
    const hasSelectedAttributes = Object.values(selectedAttributes).some((value) =>
      value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0)
    );

    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <fieldset className="min-w-0 space-y-3">
          <legend className="text-sm font-semibold text-ink-strong">محدوده قیمت ({priceUnitLabel})</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted-soft">از
              <input type="text" inputMode="numeric" dir="ltr" maxLength={18} value={current.minPrice} onChange={(event) => onFilterChange("minPrice", event.target.value)} placeholder="بدون محدودیت" aria-label={"حداقل قیمت به " + priceUnitLabel} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm tabular-nums text-ink outline-none transition placeholder:text-muted-soft focus:border-brand focus:ring-4 focus:ring-brand/10" />
            </label>
            <label className="block text-xs text-muted-soft">تا
              <input type="text" inputMode="numeric" dir="ltr" maxLength={18} value={current.maxPrice} onChange={(event) => onFilterChange("maxPrice", event.target.value)} placeholder="بدون محدودیت" aria-label={"حداکثر قیمت به " + priceUnitLabel} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm tabular-nums text-ink outline-none transition placeholder:text-muted-soft focus:border-brand focus:ring-4 focus:ring-brand/10" />
            </label>
          </div>
          <div className="rounded-xl border border-border bg-canvas px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
              <span>از <strong className="tabular-nums text-ink">{formatStorePrice(sliderMinValue)}</strong></span>
              <span>تا <strong className="tabular-nums text-ink">{formatStorePrice(sliderMaxValue)}</strong></span>
            </div>
            <div className={"relative h-7 " + (priceBounds.count > 0 ? "" : "opacity-50")} dir="ltr">
              <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
              <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand" style={{ left: sliderMinPercent + "%", right: 100 - sliderMaxPercent + "%" }} />
              <input type="range" min={rangeMin} max={rangeMax} step={sliderStep} value={sliderMinValue} disabled={priceBounds.count === 0} aria-label={"حداقل قیمت به " + priceUnitLabel} aria-valuetext={formatStorePrice(sliderMinValue)} onChange={(event) => updateSliderPrice("minPrice", event.target.value)} className="price-range-slider" style={{ zIndex: sliderMinValue >= sliderMaxValue - sliderStep ? 5 : 4 }} />
              <input type="range" min={rangeMin} max={rangeMax} step={sliderStep} value={sliderMaxValue} disabled={priceBounds.count === 0} aria-label={"حداکثر قیمت به " + priceUnitLabel} aria-valuetext={formatStorePrice(sliderMaxValue)} onChange={(event) => updateSliderPrice("maxPrice", event.target.value)} className="price-range-slider" style={{ zIndex: sliderMinValue >= sliderMaxValue - sliderStep ? 4 : 5 }} />
            </div>
            <p className="mt-1 text-[11px] leading-5 text-muted-soft">با جابه‌جایی هر دستگیره، نتایج همان لحظه به‌روز می‌شوند.</p>
          </div>
          {getPriceError(current) && <p role="alert" className="text-xs leading-5 text-danger">{getPriceError(current)}</p>}
          <p className="text-[11px] leading-5 text-muted-soft">قیمت‌ها بر اساس {priceUnitLabel} هستند؛ اعداد فارسی و انگلیسی پذیرفته می‌شوند.</p>
        </fieldset>

        <fieldset className="min-w-0 space-y-2">
          <legend className="text-sm font-semibold text-ink-strong">مرتب‌سازی و موجودی</legend>
          <select value={current.sort} onChange={(event) => onFilterChange("sort", event.target.value)} aria-label="مرتب‌سازی محصولات" className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10">
            {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink-strong transition hover:border-border-strong">
            <input type="checkbox" checked={current.inStock} onChange={(event) => onFilterChange("inStock", event.target.checked)} className="h-4 w-4 accent-brand" />
            فقط کالاهای موجود
          </label>
        </fieldset>

        {categoryAttributeDefinitions.length > 0 && (
          <details className="min-w-0 rounded-2xl border border-border bg-surface/70 p-3 sm:col-span-2 sm:p-4 xl:col-span-3" open={hasSelectedAttributes}>
            <summary className="cursor-pointer list-none text-sm font-semibold text-ink-strong outline-none focus-visible:ring-2 focus-visible:ring-brand">
              فیلتر بر اساس مشخصات فنی
              <span className="mr-2 text-xs font-normal text-muted-soft">ویژگی‌هایی که مدیر برای این دسته قابل فیلتر کرده است</span>
            </summary>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {categoryAttributeDefinitions.map((attribute) => {
                const selected = selectedAttributes[attribute.key];
                const label = attribute.name?.fa || attribute.name?.en || attribute.key;
                const unit = attribute.unit?.fa || attribute.unit?.en || "";
                const setValue = (value) => {
                  const next = { ...selectedAttributes };
                  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) delete next[attribute.key];
                  else next[attribute.key] = value;
                  onFilterChange("attributes", next);
                };
                return (
                  <fieldset key={attribute.key} className="min-w-0 space-y-2">
                    <legend className="text-sm font-semibold text-ink-strong">{label}{unit ? " (" + unit + ")" : ""}</legend>
                    {attribute.type === "select" ? (
                      <select value={selected === undefined ? "" : String(selected)} onChange={(event) => setValue(event.target.value || undefined)} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10">
                        <option value="">همه</option>
                        {(attribute.options || []).map((option) => <option key={option.value} value={option.value}>{option.name?.fa || option.name?.en || option.value}</option>)}
                      </select>
                    ) : attribute.type === "multi-select" ? (
                      <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border bg-surface p-2">
                        {(attribute.options || []).map((option) => {
                          const selectedValues = Array.isArray(selected) ? selected.map(String) : [];
                          const checked = selectedValues.includes(option.value);
                          return (
                            <label key={option.value} className={"inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition " + (checked ? "border-brand bg-brand-soft text-ink-strong" : "border-surface-raised text-muted hover:border-border-strong")}>
                              <input type="checkbox" checked={checked} onChange={() => setValue(checked ? selectedValues.filter((value) => value !== option.value) : [...selectedValues, option.value])} className="h-3.5 w-3.5 accent-brand" />
                              <span>{option.name?.fa || option.name?.en || option.value}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : attribute.type === "boolean" ? (
                      <select value={selected === undefined ? "" : (selected ? "true" : "false")} onChange={(event) => setValue(event.target.value === "" ? undefined : event.target.value === "true")} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand">
                        <option value="">همه</option><option value="true">بله</option><option value="false">خیر</option>
                      </select>
                    ) : (
                      <input type={attribute.type === "number" ? "number" : "text"} step={attribute.type === "number" ? "any" : undefined} value={selected ?? ""} onChange={(event) => setValue(event.target.value === "" ? undefined : (attribute.type === "number" ? Number(event.target.value) : event.target.value))} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand" />
                    )}
                  </fieldset>
                );
              })}
            </div>
          </details>
        )}
      </div>
    );
  };

  const pageTitle = selectedCategory?.name?.fa || selectedCategory?.name?.en || category.replace(/-/g, " ");
  const copyFilterLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("لینک فیلترها کپی شد.");
    } catch {
      window.prompt("لینک قابل‌اشتراک دسته‌بندی:", url);
    }
  };
  const categoryChildren = selectedCategory
    ? dynamicCategories
        .filter((item) => String(item.parentId || "") === String(selectedCategory._id) && item.showInNavigation !== false)
        .sort((a, b) =>
          Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
          String(a.name?.fa || "").localeCompare(String(b.name?.fa || ""), "fa")
        )
    : [];
  const categoryAncestors = selectedCategory
    ? (selectedCategory.ancestors || []).map((ancestorId) => dynamicCategories.find((item) => String(item._id) === String(ancestorId))).filter(Boolean)
    : [];
  const priceError = getPriceError(filters);
  const pageBreadcrumbs = [
    { name: "صفحه اصلی", path: "/" },
    { name: "دسته‌بندی‌ها", path: "/categories" },
    ...categoryAncestors.map((item) => ({ name: item.name?.fa || item.name?.en || item.slug, path: "/category/" + encodeURIComponent(item.slug) })),
    { name: pageTitle, path: "/category/" + encodeURIComponent(categorySlug) },
  ];

  if (!categoriesLoaded) {
    return (
      <main dir="rtl" className="flex min-h-[65vh] items-center justify-center bg-canvas px-4 text-ink">
        <div role="status" className="flex items-center gap-3 text-sm text-muted">
          <LoaderCircle size={22} className="animate-spin text-brand" aria-hidden="true" />
          در حال دریافت دسته‌بندی‌های فروشگاه…
        </div>
      </main>
    );
  }

  if (!selectedCategory) {
    return (
      <main dir="rtl" className="min-h-[65vh] bg-canvas px-4 py-12 text-ink sm:px-6 sm:py-16">
        <PageMeta title={categoriesError ? "خطا در دریافت دسته‌بندی‌ها" : "دسته‌بندی در دسترس نیست"} description={categoriesError || "این دسته‌بندی فعال نیست یا توسط مدیر فروشگاه ایجاد نشده است."} robots="noindex, nofollow" />
        <section className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-dashed border-border-strong bg-surface px-6 py-10 text-center">
          <ShoppingBag size={30} className="text-brand" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">{categoriesError ? "دریافت دسته‌بندی‌ها ناموفق بود" : "این دسته‌بندی در دسترس نیست"}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{categoriesError || "ممکن است دسته حذف یا بایگانی شده باشد. دسته‌بندی‌های فعال فروشگاه را مشاهده کنید."}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to="/categories" className="inline-flex min-h-11 items-center justify-center rounded-full bg-strong px-5 py-2.5 text-sm font-semibold text-white hover:bg-strong-hover">مشاهده دسته‌بندی‌ها</Link>
            <button type="button" onClick={() => fetchCategories()} className="inline-flex min-h-11 items-center justify-center rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-ink hover:bg-canvas">تلاش دوباره</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-canvas px-3 py-7 text-ink sm:px-6 sm:py-10 lg:px-8">
      <PageMeta title={pageTitle} description={selectedCategory?.description?.fa || selectedCategory?.description?.en || ("مشخصات فنی، موجودی و قیمت محصولات دسته " + pageTitle + " را در فروشگاه سخت‌افزار بررسی کنید.")} image={selectedCategory?.image} path={"/category/" + categorySlug} type="category" itemList={products} breadcrumbs={pageBreadcrumbs} robots={hasIndexExcludedQuery(Object.fromEntries(searchParams.entries())) || !selectedCategory ? "noindex, follow" : "index, follow, max-image-preview:large"} canonical={Boolean(selectedCategory)} />
      <div className="mx-auto max-w-[1920px]">
        <nav aria-label="مسیر دسته‌بندی" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-soft sm:mb-5">
          <Link to="/" className="transition hover:text-ink">خانه</Link>
          <span aria-hidden="true">/</span>
          <Link to="/categories" className="transition hover:text-ink">دسته‌بندی‌ها</Link>
          {categoryAncestors.map((ancestor) => (
            <span key={ancestor._id} className="inline-flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <Link to={"/category/" + encodeURIComponent(ancestor.slug)} className="transition hover:text-ink">{ancestor.name?.fa || ancestor.name?.en || ancestor.slug}</Link>
            </span>
          ))}
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-semibold text-[var(--ui-text)]">{pageTitle}</span>
        </nav>
        <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
          <div className="min-w-0">
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-brand">
              <ShoppingBag size={15} aria-hidden="true" />
              فروشگاه سخت‌افزار کامپیوتر
            </p>
            <motion.h1
              className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {pageTitle}
            </motion.h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-soft">
              {selectedCategory?.description?.fa?.trim() || selectedCategory?.description?.en?.trim() || ("با جست‌وجوی فارسی، مشخصات فنی پویا و محدوده قیمت به " + priceUnitLabel + "، کالای مناسب را دقیق‌تر پیدا کنید.")}
            </p>
            {currentFilterError && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{currentFilterError}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div aria-live="polite" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted">
              {loading ? (
                <>
                  <LoaderCircle size={16} className="animate-spin text-brand" aria-hidden="true" />
                  در حال دریافت محصولات…
                </>
              ) : (
                <>
                  <ShoppingBag size={16} className="text-brand" aria-hidden="true" />
                  {new Intl.NumberFormat("fa-IR").format(resultCount)} محصول
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setDraftFilters(filters);
                setMobileFiltersOpen(true);
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-ink-strong transition hover:border-muted-soft hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:hidden"
            >
              <Filter size={16} aria-hidden="true" />
              فیلترها
              {activeChips.length > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-xs font-bold text-white">
                  {new Intl.NumberFormat("fa-IR").format(activeChips.length)}
                </span>
              )}
            </button>
            <button type="button" onClick={copyFilterLink} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-2 text-xs font-semibold text-ink-strong transition hover:border-brand" aria-label="کپی لینک این دسته‌بندی با فیلترهای فعلی">کپی لینک فیلترها</button>
          </div>
        </header>

        {selectedCategory && (categoryAncestors.length > 0 || categoryChildren.length > 0) && (
          <nav aria-label="مسیر دسته‌بندی" className="mb-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-soft">
              <Link to="/shop" className="hover:text-brand">فروشگاه</Link>
              {categoryAncestors.map((ancestor) => (
                <span key={ancestor._id} className="inline-flex items-center gap-2">
                  <span aria-hidden="true">/</span>
                  <Link to={"/category/" + ancestor.slug} className="hover:text-brand">{ancestor.name?.fa || ancestor.name?.en}</Link>
                </span>
              ))}
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-ink-strong">{pageTitle}</span>
            </div>
            {categoryChildren.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categoryChildren.map((child) => (
                  <Link key={child._id} to={"/category/" + child.slug} className="inline-flex min-h-9 items-center rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink-strong transition hover:border-brand hover:bg-brand-soft">
                    {child.name?.fa || child.name?.en}
                  </Link>
                ))}
              </div>
            )}
          </nav>
        )}

        <section aria-label="جست‌وجو در این دسته‌بندی" className="mb-5 rounded-2xl border border-border bg-surface p-3 shadow-[0_8px_30px_-24px_rgba(37,39,34,0.22)] sm:p-4">
          <label htmlFor="category-product-search" className="mb-2 block text-sm font-semibold text-ink-strong">جست‌وجو در {pageTitle}</label>
          <div className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-surface px-3 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
            <Search size={19} className="shrink-0 text-brand" aria-hidden="true" />
            <input
              id="category-product-search"
              type="text"
              inputMode="search"
              value={filters.q}
              onChange={(event) => { setFilters((current) => ({ ...current, q: event.target.value })); setPage(1); }}
              placeholder="مثلاً مدل، نام کالا یا سازنده…"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-ink outline-none placeholder:text-muted-soft"
            />
            {filters.q && (
              <button type="button" onClick={() => { setFilters((current) => ({ ...current, q: "" })); setPage(1); }} aria-label="پاک‌کردن عبارت جست‌وجو" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-soft transition hover:bg-surface-raised hover:text-ink">
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-soft">جست‌وجو با حروف «ی» و «ک» فارسی یا عربی و اعداد فارسی و انگلیسی پشتیبانی می‌شود.</p>
        </section>

        <section aria-label="فیلترهای محصولات" className="mb-5 hidden rounded-2xl border border-border bg-surface p-4 shadow-[0_8px_30px_-24px_rgba(37,39,34,0.22)] md:block sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-brand" aria-hidden="true" />
              <h2 className="text-base font-semibold text-ink">فیلترها</h2>
              <span className="text-xs text-muted-soft">فیلترها از ویژگی‌های تعریف‌شده توسط مدیر دسته‌بندی ساخته می‌شوند</span>
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={activeChips.length === 0}
              className="inline-flex min-h-9 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand-soft hover:text-ink-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-muted-soft disabled:hover:bg-transparent"
            >
              <X size={15} aria-hidden="true" />
              پاک‌کردن فیلترها
            </button>
          </div>
          {renderFilterFields(filters, (field, value) => updateFilter(setFilters, field, value))}
        </section>

        {activeChips.length > 0 && (
          <section aria-label="فیلترهای فعال" className="mb-5 rounded-2xl border border-border bg-surface/70 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-strong">
                <SlidersHorizontal size={15} className="text-brand" aria-hidden="true" />
                فیلترهای فعال
                <span className="text-xs font-medium text-muted-soft">({new Intl.NumberFormat("fa-IR").format(activeChips.length)})</span>
              </div>
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex min-h-9 items-center rounded-full px-3 text-xs font-bold text-brand transition hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
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
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink-strong transition hover:border-muted-soft hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span>{chip.label}</span>
                  <X size={13} className="text-muted-soft" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}

        {priceError && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{priceError}</p>
        )}

        {loading ? (
          <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-muted">
            <LoaderCircle size={28} className="animate-spin text-brand" aria-hidden="true" />
            در حال آماده‌سازی محصولات…
          </div>
        ) : filteredProducts.length > 0 ? (
          <motion.div
            className="grid grid-cols-2 justify-items-stretch gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {visibleProducts.map((product) => <ProductCard key={product._id} product={product} />)}
          </motion.div>
        ) : (
          <section className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface px-5 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Search size={24} aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-ink">محصولی پیدا نشد</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-soft">
              {activeChips.length > 0
                ? "فیلترها یا عبارت جست‌وجو را تغییر دهید تا محصولات بیشتری ببینید."
                : "در حال حاضر محصولی در این دسته‌بندی ثبت نشده است."}
            </p>
            {activeChips.length > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-strong px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-strong-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                پاک‌کردن فیلترها
              </button>
            )}
          </section>
        )}
        {!loading && resultCount > CATEGORY_PAGE_SIZE && (
          <nav aria-label="صفحه‌بندی محصولات دسته‌بندی" className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-6">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-10 rounded-full border border-border-strong bg-surface px-4 py-2 text-sm disabled:opacity-40">قبلی</button>
            <span className="text-sm text-muted">صفحه {new Intl.NumberFormat("fa-IR").format(page)} از {new Intl.NumberFormat("fa-IR").format(pageCount)} · {new Intl.NumberFormat("fa-IR").format(resultCount)} محصول</span>
            <button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="min-h-10 rounded-full border border-border-strong bg-surface px-4 py-2 text-sm disabled:opacity-40">بعدی</button>
          </nav>
        )}
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            aria-label="بستن فیلترها"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 h-full w-full bg-strong/45 backdrop-blur-sm"
          />
          <section
            ref={mobileFiltersDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-category-filters-title"
            className="absolute inset-y-0 right-0 flex h-[100dvh] w-[min(94vw,30rem)] flex-col border-l border-border bg-canvas shadow-[0_24px_80px_-20px_rgba(37,39,34,0.42)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-4">
              <div>
                <h2 id="mobile-category-filters-title" className="text-lg font-semibold text-ink">فیلتر محصولات</h2>
                <p className="mt-1 text-xs text-muted-soft">نتیجه فعلی: {new Intl.NumberFormat("fa-IR").format(draftResultCount)} محصول</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="بستن پنجره فیلترها"
                data-dialog-initial-focus
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:bg-surface-raised hover:text-ink"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
              {renderFilterFields(draftFilters, (field, value) => updateFilter(setDraftFilters, field, value))}
            </div>
            <div className="border-t border-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <p aria-live="polite" className="mb-3 text-center text-sm font-semibold text-muted">
                {getPriceError(draftFilters) || (new Intl.NumberFormat("fa-IR").format(draftResultCount) + " محصول با این فیلترها")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-sm font-semibold text-ink-strong transition hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                >
                  پاک‌کردن فیلترها
                </button>
                <button
                  type="button"
                  disabled={Boolean(getPriceError(draftFilters))}
                  onClick={() => {
                    setFilters((current) => ({ ...draftFilters, q: current.q }));
                    setPage(1);
                    setMobileFiltersOpen(false);
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-strong px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-strong-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
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
