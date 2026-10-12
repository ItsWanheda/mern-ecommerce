import { useEffect, useRef, useState } from "react";
import axios from "../lib/axios";
import { formatPrice } from "../lib/commerce";
import {
  ShoppingCart,
  LogIn,
  LogOut,
  Lock,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";

const categories = [
  ["", "همه دسته‌بندی‌ها"],
  ["jeans", "شلوار جین"],
  ["t-shirts", "تی‌شرت"],
  ["shoes", "کفش"],
  ["glasses", "عینک"],
  ["jackets", "کت و کاپشن"],
  ["suits", "کت‌وشلوار"],
  ["bags", "کیف"],
];

const sortOptions = [
  ["newest", "جدیدترین"],
  ["oldest", "قدیمی‌ترین"],
  ["priceAsc", "ارزان‌ترین"],
  ["priceDesc", "گران‌ترین"],
  ["nameAsc", "نام محصول (الف تا ی)"],
];

const defaultFilters = {
  q: "",
  category: "",
  minPrice: "",
  maxPrice: "",
  sort: "newest",
};

const categoryLabel = (value) =>
  categories.find(([category]) => category === value)?.[1] || value || "مجموعه";

const fieldClass =
  "mt-1 min-h-11 w-full rounded-xl border border-[#d5d0c5] bg-[#fffefa] px-3 py-2 text-sm text-[#252722] outline-none transition focus:border-[#68745f] focus:ring-2 focus:ring-[#68745f]/20";

const Navbar = () => {
  const { user, logout } = useUserStore();
  const isAdmin = user?.role === "admin";
  const { cart } = useCartStore();
  const location = useLocation();
  const navigate = useNavigate();
  const desktopSearchRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [activeSearchSurface, setActiveSearchSurface] = useState(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [searchSuggestions, setSearchSuggestions] = useState({ products: [], loading: false, error: false });
  const suggestionQuery = filters.q.trim();
  const appliedFilterParams = new URLSearchParams(
    location.pathname === "/shop" ? location.search : "",
  );
  const appliedSort = appliedFilterParams.get("sort") || "newest";
  const activeFilterCount = [
    appliedFilterParams.get("category"),
    appliedFilterParams.get("minPrice"),
    appliedFilterParams.get("maxPrice"),
    appliedSort !== "newest" ? appliedSort : "",
  ].filter(Boolean).length;
  const categorySuggestions = suggestionQuery.length >= 2
    ? categories
        .filter(([value, label]) => value && (
          label.toLowerCase().includes(suggestionQuery.toLowerCase()) ||
          value.toLowerCase().includes(suggestionQuery.toLowerCase())
        ))
        .slice(0, 3)
    : [];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilters({
      q: params.get("q") || "",
      category: params.get("category") || "",
      minPrice: params.get("minPrice") || "",
      maxPrice: params.get("maxPrice") || "",
      sort: params.get("sort") || "newest",
    });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const query = suggestionQuery;
    if (activeSearchSurface === null || query.length < 2) {
      setSearchSuggestions({ products: [], loading: false, error: false });
      setActiveSuggestionIndex(-1);
      return undefined;
    }

    const controller = new AbortController();
    setSearchSuggestions({ products: [], loading: true, error: false });
    setActiveSuggestionIndex(-1);

    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams({ q: query, limit: "5", page: "1", sort: "newest" });
      axios
        .get(`/products/search?${params.toString()}`, { signal: controller.signal })
        .then(({ data }) => {
          if (controller.signal.aborted) return;
          setSearchSuggestions({
            products: Array.isArray(data.products) ? data.products.slice(0, 5) : [],
            loading: false,
            error: false,
          });
        })
        .catch((error) => {
          if (controller.signal.aborted || error.code === "ERR_CANCELED") return;
          setSearchSuggestions({ products: [], loading: false, error: true });
        });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeSearchSurface, suggestionQuery]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!desktopSearchRef.current?.contains(event.target)) {
        setDesktopFiltersOpen(false);
        if (activeSearchSurface === "desktop") setActiveSearchSurface(null);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [activeSearchSurface]);

  useEffect(() => {
    if (!mobileSearchOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileSearchInputRef.current?.focus();

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileSearchOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileSearchOpen]);

  const linkClass = ({ isActive }) =>
    `inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] ${isActive ? "bg-[#e9e5dc] text-[#252722]" : "text-[#62645c] hover:bg-[#e9e5dc] hover:text-[#252722]"}`;

  const navigateToShop = (params) => {
    const query = params.toString();
    navigate({ pathname: "/shop", search: query ? `?${query}` : "" });
    setDesktopFiltersOpen(false);
    setMobileSearchOpen(false);
    setActiveSearchSurface(null);
  };

  const selectProductSuggestion = (product) => {
    setActiveSearchSurface(null);
    setDesktopFiltersOpen(false);
    setMobileSearchOpen(false);
    navigate(`/product/${product._id}`);
  };

  const selectCategorySuggestion = (category) => {
    const params = new URLSearchParams({ category, page: "1" });
    setFilters({ ...defaultFilters, category });
    navigateToShop(params);
  };

  const handleSuggestionKeyDown = (event) => {
    const suggestionCount = categorySuggestions.length + searchSuggestions.products.length;
    if (event.key === "Escape") {
      setActiveSearchSurface(null);
      setActiveSuggestionIndex(-1);
      return;
    }
    if (!suggestionCount) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % suggestionCount);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => current <= 0 ? suggestionCount - 1 : current - 1);
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      if (activeSuggestionIndex < categorySuggestions.length) {
        selectCategorySuggestion(categorySuggestions[activeSuggestionIndex][0]);
      } else {
        selectProductSuggestion(searchSuggestions.products[activeSuggestionIndex - categorySuggestions.length]);
      }
    }
  };

  const renderSearchSuggestions = (surface) => {
    if (activeSearchSurface !== surface || suggestionQuery.length < 2) return null;
    const hasSuggestions = categorySuggestions.length > 0 || searchSuggestions.products.length > 0;

    return (
      <div
        id={`${surface}-search-suggestions`}
        role="listbox"
        aria-label="پیشنهادهای جست‌وجو"
        className={`${surface === "desktop" ? "absolute left-0 right-0 top-[calc(100%+0.65rem)] z-[60]" : "relative mt-2"} max-h-80 overflow-y-auto rounded-2xl border border-[#e4e0d8] bg-[#fffefa] p-2 shadow-[0_20px_55px_-24px_rgba(37,39,34,0.35)]`}
      >
        {categorySuggestions.length > 0 && (
          <div className="pb-2">
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold text-[#85867d]">دسته‌بندی‌های پیشنهادی</p>
            {categorySuggestions.map(([value, label], index) => (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={activeSuggestionIndex === index}
                onMouseEnter={() => setActiveSuggestionIndex(index)}
                onClick={() => selectCategorySuggestion(value)}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-right text-sm transition ${activeSuggestionIndex === index ? "bg-[#e9ede4] text-[#252722]" : "text-[#62645c] hover:bg-[#f2f0e9] hover:text-[#252722]"}`}
              >
                <span>{label}</span>
                <span className="text-xs text-[#85867d]">مشاهده دسته‌بندی</span>
              </button>
            ))}
          </div>
        )}

        {searchSuggestions.products.length > 0 && (
          <div className={categorySuggestions.length ? "border-t border-[#eeeae2] pt-2" : ""}>
            <p className="px-3 pb-1 pt-1 text-[11px] font-semibold text-[#85867d]">محصولات</p>
            {searchSuggestions.products.map((product, index) => {
              const optionIndex = categorySuggestions.length + index;
              return (
                <button
                  key={product._id}
                  type="button"
                  role="option"
                  aria-selected={activeSuggestionIndex === optionIndex}
                  onMouseEnter={() => setActiveSuggestionIndex(optionIndex)}
                  onClick={() => selectProductSuggestion(product)}
                  className={`flex min-h-[4.25rem] w-full items-center gap-3 rounded-xl px-2.5 py-2 text-right transition ${activeSuggestionIndex === optionIndex ? "bg-[#e9ede4]" : "hover:bg-[#f7f5f0]"}`}
                >
                  {product.image ? (
                    <img src={product.image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg bg-[#f0eee8] object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#f0eee8] text-[#85867d]"><Search size={17} /></span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#252722]">{product.name}</span>
                    <span className="mt-1 block truncate text-xs text-[#85867d]">{categoryLabel(product.category)}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-[#41443b]">{formatPrice(product.price)}</span>
                </button>
              );
            })}
          </div>
        )}

        {searchSuggestions.loading && (
          <p role="status" className="px-3 py-3 text-sm text-[#77786f]">در حال جست‌وجوی محصولات…</p>
        )}
        {searchSuggestions.error && !searchSuggestions.loading && (
          <p role="status" className="px-3 py-3 text-sm text-[#77786f]">پیشنهادها موقتاً در دسترس نیستند؛ جست‌وجو را ادامه دهید.</p>
        )}
        {!searchSuggestions.loading && !searchSuggestions.error && !hasSuggestions && (
          <p className="px-3 py-3 text-sm text-[#77786f]">پیشنهادی پیدا نشد؛ عبارت دیگری را امتحان کنید.</p>
        )}
      </div>
    );
  };

  const handleDesktopSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams(
      location.pathname === "/shop" ? location.search : "",
    );
    const query = filters.q.trim();
    if (query) params.set("q", query);
    else params.delete("q");
    params.delete("page");
    navigateToShop(params);
  };

  const applyFilters = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      const normalized = String(value).trim();
      if (normalized) params.set(key, normalized);
    });
    params.set("page", "1");
    navigateToShop(params);
  };

  const clearFilters = () => {
    const query = filters.q.trim();
    setFilters({ ...defaultFilters, q: query });
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    navigateToShop(params);
  };

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const renderFilterFields = () => (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-[#62645c]">
        دسته‌بندی
        <select
          className={fieldClass}
          value={filters.category}
          onChange={(event) => updateFilter("category", event.target.value)}
        >
          {categories.map(([value, label]) => (
            <option key={value || "all"} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <div>
        <p className="text-xs font-medium text-[#62645c]">محدوده قیمت</p>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <label className="text-xs text-[#85867d]">
            از
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              dir="ltr"
              placeholder="بدون محدودیت"
              className={fieldClass}
              value={filters.minPrice}
              onChange={(event) => updateFilter("minPrice", event.target.value)}
            />
          </label>
          <label className="text-xs text-[#85867d]">
            تا
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              dir="ltr"
              placeholder="بدون محدودیت"
              className={fieldClass}
              value={filters.maxPrice}
              onChange={(event) => updateFilter("maxPrice", event.target.value)}
            />
          </label>
        </div>
      </div>

      <label className="block text-xs font-medium text-[#62645c]">
        مرتب‌سازی
        <select
          className={fieldClass}
          value={filters.sort}
          onChange={(event) => updateFilter("sort", event.target.value)}
        >
          {sortOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
    </div>
  );

  const renderFilterActions = () => (
    <div className="mt-5 flex gap-2 border-t border-[#eeeae2] pt-4">
      <button
        type="submit"
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#252722] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
      >
        نمایش محصولات
        <Search size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={clearFilters}
        className="min-h-11 rounded-xl border border-[#d5d0c5] px-4 py-2 text-sm font-semibold text-[#41443b] transition hover:border-[#a8a597] hover:bg-[#f7f5f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
      >
        پاک‌کردن فیلترها
      </button>
    </div>
  );

  return (
    <>
      <header
        dir="rtl"
        className="fixed inset-x-0 top-0 z-40 w-full border-b border-[#e4e0d8] bg-[#f7f5f0]/95 text-[#252722] shadow-[0_8px_24px_-22px_rgba(37,39,34,0.45)] backdrop-blur-xl"
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex min-h-14 items-center gap-2 py-3 sm:gap-4">
            <Link
              to="/"
              aria-label="صفحه اصلی فروشگاه"
              className="flex shrink-0 items-center font-serif text-2xl font-semibold tracking-tight text-[#252722] transition hover:text-[#68745f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#68745f]"
            >
              فروشگاه<span className="mr-1 text-[#68745f]">.</span>
            </Link>

            <nav
              aria-label="پیمایش اصلی"
              className="hidden shrink-0 items-center gap-1 lg:flex"
            >
              <NavLink to="/" end className={linkClass}>صفحه اصلی</NavLink>
              <NavLink to="/shop" className={linkClass}>محصولات</NavLink>
            </nav>

            <div
              ref={desktopSearchRef}
              className="relative ml-auto hidden min-w-0 max-w-[31rem] flex-1 items-center lg:flex"
            >
              <form
                onSubmit={handleDesktopSearch}
                role="search"
                aria-label="جست‌وجوی محصولات"
                className="flex min-h-12 min-w-0 flex-1 items-center gap-1 rounded-2xl border border-[#e0dcd2] bg-[#fffefa] p-1 shadow-sm transition focus-within:border-[#a0a994] focus-within:ring-4 focus-within:ring-[#68745f]/10"
              >
                <Search size={18} className="mr-2 shrink-0 text-[#85867d]" aria-hidden="true" />
                <input
                  type="search"
                  value={filters.q}
                  onFocus={() => { setDesktopFiltersOpen(false); setActiveSearchSurface("desktop"); }}
                  onKeyDown={handleSuggestionKeyDown}
                  onChange={(event) => updateFilter("q", event.target.value)}
                  aria-label="نام یا توضیحات محصول"
                  aria-autocomplete="list"
                  aria-controls="desktop-search-suggestions"
                  aria-expanded={activeSearchSurface === "desktop" && suggestionQuery.length >= 2}
                  autoComplete="off"
                  placeholder="جست‌وجوی محصولات..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[#252722] outline-none placeholder:text-[#9a9a90]"
                />
                <button
                  type="submit"
                  aria-label="جست‌وجو"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#252722] px-3 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
                >
                  <Search size={16} aria-hidden="true" />
                  <span>جست‌وجو</span>
                </button>
                <button
                  type="button"
                  aria-label={activeFilterCount > 0
                    ? `نمایش فیلترها، ${new Intl.NumberFormat("fa-IR").format(activeFilterCount)} فیلتر فعال`
                    : "نمایش فیلترها"}
                  aria-expanded={desktopFiltersOpen}
                  aria-controls="desktop-product-filters"
                  onClick={() => {
                    setActiveSearchSurface(null);
                    setDesktopFiltersOpen((open) => !open);
                  }}
                  className={`inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] ${desktopFiltersOpen ? "border-[#68745f] bg-[#e9ede4] text-[#41443b]" : "border-[#e4e0d8] bg-white text-[#62645c] hover:bg-[#f2f0e9]"}`}
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  <span>فیلترها</span>
                  {activeFilterCount > 0 && (
                    <span
                      aria-label={`${new Intl.NumberFormat("fa-IR").format(activeFilterCount)} فیلتر فعال`}
                      className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#68745f] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white"
                    >
                      {new Intl.NumberFormat("fa-IR").format(activeFilterCount)}
                    </span>
                  )}
                  <ChevronDown size={14} className={`transition-transform ${desktopFiltersOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </form>

              {renderSearchSuggestions("desktop")}

              {desktopFiltersOpen && (
                <form
                  id="desktop-product-filters"
                  onSubmit={applyFilters}
                  className="absolute left-0 right-auto top-[calc(100%+0.75rem)] z-50 max-h-[min(70vh,34rem)] w-[27rem] overflow-y-auto rounded-2xl border border-[#e4e0d8] bg-[#fffefa] p-5 shadow-[0_24px_70px_-24px_rgba(37,39,34,0.35)]"
                >
                  <div className="mb-4">
                    <p className="text-sm font-bold text-[#252722]">فیلتر محصولات</p>
                    <p className="mt-1 text-xs text-[#85867d]">نتیجه‌ها را دقیق‌تر و سریع‌تر پیدا کنید.</p>
                  </div>
                  {renderFilterFields()}
                  {renderFilterActions()}
                </form>
              )}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0 lg:gap-2">
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                aria-label={activeFilterCount > 0
                  ? `باز کردن جست‌وجو و فیلتر محصولات، ${new Intl.NumberFormat("fa-IR").format(activeFilterCount)} فیلتر فعال`
                  : "باز کردن جست‌وجو و فیلتر محصولات"}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e0dcd2] bg-[#fffefa] text-[#41443b] shadow-sm transition hover:border-[#c7c3b9] hover:bg-[#e9e5dc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] lg:hidden"
              >
                <Search size={18} aria-hidden="true" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-[#f7f5f0] bg-[#68745f] px-1 py-0.5 text-[10px] font-bold leading-none text-white">
                    {new Intl.NumberFormat("fa-IR").format(activeFilterCount)}
                  </span>
                )}
              </button>

              {user && (
                <Link
                  to="/cart"
                  aria-label={cart.length > 0 ? `سبد خرید، ${new Intl.NumberFormat("fa-IR").format(cart.length)} کالا` : "سبد خرید"}
                  className="relative inline-flex h-10 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-medium text-[#62645c] transition hover:bg-[#e9e5dc] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] sm:px-3"
                >
                  <ShoppingCart size={18} aria-hidden="true" />
                  <span className="hidden lg:inline">سبد خرید</span>
                  {cart.length > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#68745f] px-1.5 py-0.5 text-xs font-semibold text-white">{new Intl.NumberFormat("fa-IR").format(cart.length)}</span>}
                </Link>
              )}

              {isAdmin && (
                <Link
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d5d0c5] px-2.5 text-sm font-medium text-[#41443b] transition hover:border-[#68745f] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] sm:px-3"
                  to="/secret-dashboard"
                  aria-label="داشبورد مدیریت"
                >
                  <Lock size={16} aria-hidden="true" />
                  <span className="hidden lg:inline">مدیریت</span>
                </Link>
              )}

              {user ? (
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#252722] px-3 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] sm:px-4"
                  onClick={logout}
                  type="button"
                  aria-label="خروج از حساب"
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#252722] px-3 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] sm:px-4"
                >
                  <LogIn size={16} aria-hidden="true" />
                  <span>ورود</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {mobileSearchOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[100] flex items-center justify-center px-3 py-4 sm:px-6 sm:py-8 lg:hidden"
        >
          <button
            type="button"
            aria-label="بستن جست‌وجو"
            onClick={() => { setMobileSearchOpen(false); setActiveSearchSurface(null); }}
            className="absolute inset-0 h-full w-full bg-[#252722]/35 backdrop-blur-md"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-search-heading"
            className="relative z-10 max-h-[min(88dvh,48rem)] w-full max-w-lg animate-[searchPanelIn_180ms_ease-out] overflow-y-auto rounded-[1.75rem] border border-white/70 bg-[#fffefa]/95 p-4 shadow-[0_32px_100px_-28px_rgba(37,39,34,0.5)] backdrop-blur-2xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-[#68745f]">جست‌وجوی هوشمند</p>
                <h2 id="mobile-search-heading" className="font-serif text-2xl font-medium text-[#252722]">دنبال چه چیزی هستید؟</h2>
                <p className="mt-1 text-sm leading-6 text-[#77786f]">محصولات را جست‌وجو و نتیجه‌ها را فیلتر کنید.</p>
              </div>
              <button
                type="button"
                onClick={() => { setMobileSearchOpen(false); setActiveSearchSurface(null); }}
                aria-label="بستن پنجره جست‌وجو"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e4e0d8] bg-white text-[#62645c] transition hover:bg-[#f2f0e9] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={applyFilters}>
              <label htmlFor="mobile-product-search" className="sr-only">نام یا توضیحات محصول</label>
              <div className="mb-5 flex min-h-12 items-center gap-2 rounded-2xl border border-[#d5d0c5] bg-white p-1.5 transition focus-within:border-[#68745f] focus-within:ring-4 focus-within:ring-[#68745f]/10">
                <Search size={19} className="mr-2 shrink-0 text-[#68745f]" aria-hidden="true" />
                <input
                  ref={mobileSearchInputRef}
                  id="mobile-product-search"
                  type="search"
                  value={filters.q}
                  onFocus={() => setActiveSearchSurface("mobile")}
                  onKeyDown={handleSuggestionKeyDown}
                  onChange={(event) => updateFilter("q", event.target.value)}
                  aria-autocomplete="list"
                  aria-controls="mobile-search-suggestions"
                  aria-expanded={activeSearchSurface === "mobile" && suggestionQuery.length >= 2}
                  autoComplete="off"
                  placeholder="مثلاً کت، کیف، شلوار جین..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[#252722] outline-none placeholder:text-[#9a9a90]"
                />
              </div>

              {renderSearchSuggestions("mobile")}

              <div className="mb-4 flex items-center gap-2 border-b border-[#e4e0d8] pb-3">
                <SlidersHorizontal size={17} className="text-[#68745f]" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-[#252722]">فیلترها</h3>
                <span className="text-xs text-[#85867d]">دسته‌بندی، قیمت و مرتب‌سازی</span>
              </div>

              {renderFilterFields()}
              {renderFilterActions()}
            </form>
          </section>
        </div>
      )}
    </>
  );
};

export default Navbar;
