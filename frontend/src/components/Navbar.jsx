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
  const searchRef = useRef(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
      if (!searchRef.current?.contains(event.target)) setFiltersOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const linkClass = ({ isActive }) =>
    `inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] ${isActive ? "bg-[#e9e5dc] text-[#252722]" : "text-[#62645c] hover:bg-[#e9e5dc] hover:text-[#252722]"}`;

  const navigateToShop = (params) => {
    const query = params.toString();
    navigate({ pathname: "/shop", search: query ? `?${query}` : "" });
    setFiltersOpen(false);
  };

  const handleSearch = (event) => {
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

  return (
    <header
      dir="rtl"
      className="fixed inset-x-0 top-0 z-40 w-full border-b border-[#e4e0d8] bg-[#f7f5f0]/95 text-[#252722] shadow-[0_8px_24px_-22px_rgba(37,39,34,0.45)] backdrop-blur-xl"
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-3 py-3 sm:gap-x-4">
          <Link
            to="/"
            aria-label="صفحه اصلی فروشگاه"
            className="flex shrink-0 items-center font-serif text-2xl font-semibold tracking-tight text-[#252722] transition hover:text-[#68745f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#68745f]"
          >
            فروشگاه<span className="mr-1 text-[#68745f]">.</span>
          </Link>

          <nav
            aria-label="پیمایش اصلی"
            className="hidden shrink-0 items-center gap-1 md:flex"
          >
            <NavLink to="/" end className={linkClass}>
              صفحه اصلی
            </NavLink>
            <NavLink to="/shop" className={linkClass}>
              محصولات
            </NavLink>
          </nav>

          <div
            ref={searchRef}
            className="relative order-3 flex w-full basis-full items-center md:order-none md:ml-auto md:w-auto md:max-w-[31rem] md:flex-1 md:basis-auto"
          >
            <form
              onSubmit={handleSearch}
              role="search"
              aria-label="جست‌وجوی محصولات"
              className="flex min-h-12 min-w-0 flex-1 items-center gap-1 rounded-2xl border border-[#e0dcd2] bg-[#fffefa] p-1 shadow-sm transition focus-within:border-[#a0a994] focus-within:ring-4 focus-within:ring-[#68745f]/10"
            >
              <Search
                size={18}
                className="mr-2 shrink-0 text-[#85867d]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={filters.q}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, q: event.target.value }))
                }
                aria-label="نام یا توضیحات محصول"
                placeholder="جست‌وجوی محصولات..."
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[#252722] outline-none placeholder:text-[#9a9a90]"
              />
              {filters.q && (
                <button
                  type="button"
                  onClick={() => setFilters((current) => ({ ...current, q: "" }))}
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
                <span className="hidden sm:inline">جست‌وجو</span>
              </button>
              <button
                type="button"
                aria-label="نمایش فیلترها"
                aria-expanded={filtersOpen}
                aria-controls="navbar-product-filters"
                onClick={() => setFiltersOpen((open) => !open)}
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl border px-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] sm:px-3 ${filtersOpen ? "border-[#68745f] bg-[#e9ede4] text-[#41443b]" : "border-[#e4e0d8] bg-white text-[#62645c] hover:bg-[#f2f0e9]"}`}
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                <span className="hidden sm:inline">فیلترها</span>
                <ChevronDown
                  size={14}
                  className={`hidden transition-transform sm:block ${filtersOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </form>

            {filtersOpen && (
              <form
                id="navbar-product-filters"
                onSubmit={applyFilters}
                className="absolute inset-x-0 top-[calc(100%+0.75rem)] z-50 max-h-[min(70vh,34rem)] overflow-y-auto rounded-2xl border border-[#e4e0d8] bg-[#fffefa] p-4 shadow-[0_24px_70px_-24px_rgba(37,39,34,0.35)] sm:p-5 md:left-0 md:right-auto md:w-[27rem]"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#252722]">فیلتر محصولات</p>
                    <p className="mt-1 text-xs text-[#85867d]">
                      نتیجه‌ها را دقیق‌تر و سریع‌تر پیدا کنید.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    aria-label="بستن فیلترها"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#77786f] transition hover:bg-[#f2f0e9] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]"
                  >
                    <X size={17} aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-medium text-[#62645c]">
                    دسته‌بندی
                    <select
                      className={fieldClass}
                      value={filters.category}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                    >
                      {categories.map(([value, label]) => (
                        <option key={value || "all"} value={value}>
                          {label}
                        </option>
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
                          onChange={(event) =>
                            setFilters((current) => ({
                              ...current,
                              minPrice: event.target.value,
                            }))
                          }
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
                          onChange={(event) =>
                            setFilters((current) => ({
                              ...current,
                              maxPrice: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <label className="block text-xs font-medium text-[#62645c]">
                    مرتب‌سازی
                    <select
                      className={fieldClass}
                      value={filters.sort}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          sort: event.target.value,
                        }))
                      }
                    >
                      {sortOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

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
              </form>
            )}
          </div>

          <div className="order-2 ml-auto flex shrink-0 items-center gap-1 md:order-none md:ml-0 md:gap-2">
            {user && (
              <Link
                to="/cart"
                aria-label={
                  cart.length > 0
                    ? `سبد خرید، ${new Intl.NumberFormat("fa-IR").format(cart.length)} کالا`
                    : "سبد خرید"
                }
                className="relative inline-flex h-10 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-medium text-[#62645c] transition hover:bg-[#e9e5dc] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] sm:px-3"
              >
                <ShoppingCart size={18} aria-hidden="true" />
                <span className="hidden lg:inline">سبد خرید</span>
                {cart.length > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#68745f] px-1.5 py-0.5 text-xs font-semibold text-white">
                    {new Intl.NumberFormat("fa-IR").format(cart.length)}
                  </span>
                )}
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
  );
};

export default Navbar;
