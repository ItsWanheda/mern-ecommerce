import { useEffect, useRef, useState } from "react";
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
    const closeOnOutsideClick = (event) => {
      if (!desktopSearchRef.current?.contains(event.target)) {
        setDesktopFiltersOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

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
    setFilters(defaultFilters);
    navigateToShop(new URLSearchParams());
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
        پاک‌کردن
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
                  onChange={(event) => updateFilter("q", event.target.value)}
                  aria-label="نام یا توضیحات محصول"
                  placeholder="جست‌وجوی محصولات..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[#252722] outline-none placeholder:text-[#9a9a90]"
                />
                {filters.q && (
                  <button
                    type="button"
                    onClick={() => updateFilter("q", "")}
                    aria-label="پاک‌کردن عبارت جست‌وجو"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#85867d] transition hover:bg-[#f2f0e9] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
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
                  aria-label="نمایش فیلترها"
                  aria-expanded={desktopFiltersOpen}
                  aria-controls="desktop-product-filters"
                  onClick={() => setDesktopFiltersOpen((open) => !open)}
                  className={`inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] ${desktopFiltersOpen ? "border-[#68745f] bg-[#e9ede4] text-[#41443b]" : "border-[#e4e0d8] bg-white text-[#62645c] hover:bg-[#f2f0e9]"}`}
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  <span>فیلترها</span>
                  <ChevronDown size={14} className={`transition-transform ${desktopFiltersOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </form>

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
                aria-label="باز کردن جست‌وجو و فیلتر محصولات"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e0dcd2] bg-[#fffefa] text-[#41443b] shadow-sm transition hover:border-[#c7c3b9] hover:bg-[#e9e5dc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] lg:hidden"
              >
                <Search size={18} aria-hidden="true" />
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
            onClick={() => setMobileSearchOpen(false)}
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
                onClick={() => setMobileSearchOpen(false)}
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
                  onChange={(event) => updateFilter("q", event.target.value)}
                  placeholder="مثلاً کت، کیف، شلوار جین..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[#252722] outline-none placeholder:text-[#9a9a90]"
                />
                {filters.q && (
                  <button type="button" onClick={() => updateFilter("q", "")} aria-label="پاک‌کردن عبارت جست‌وجو" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#85867d] hover:bg-[#f2f0e9]">
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>

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
