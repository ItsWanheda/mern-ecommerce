import { useEffect, useMemo, useRef, useState } from "react";
import axios from "../lib/axios";
import { useDialogAccessibility } from "../lib/useDialogAccessibility.js";
import { formatPrice } from "../lib/commerce";
import {
  ShoppingCart,
  Truck,
  Heart,
  Home,
  ShoppingBag,
  Grid2X2,
  ChevronLeft,
  LogIn,
  LogOut,
  Lock,
  UserRound,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  FolderTree,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";
import { useWishlistStore } from "../stores/useWishlistStore";
import { useCategoryStore } from "../stores/useCategoryStore";

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

const categoryLabel = (value, dynamicCategories = []) =>
  dynamicCategories.find((category) => category.slug === value)?.name?.fa ||
  dynamicCategories.find((category) => category.slug === value)?.name?.en || value || "همه دسته‌بندی‌ها";

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

const fieldClass =
  "mt-1 min-h-11 w-full rounded-xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-3 py-2 text-sm text-[var(--ui-text)] outline-none transition focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-focus)]/20";

const Navbar = () => {
  const { user, logout } = useUserStore();
  const isAdmin = user?.role === "admin";
  const { cart } = useCartStore();
  const { items: savedProducts } = useWishlistStore();
  const { categories: dynamicCategories, fetchCategories } = useCategoryStore();
  const categories = useMemo(() => [
    ["", "همه دسته‌بندی‌ها"],
    ...dynamicCategories
      .filter((category) => category.isActive !== false && category.showInNavigation !== false)
      .map((category) => [category.slug, categoryPath(category, dynamicCategories)]),
  ], [dynamicCategories]);

  const navigationTree = useMemo(() => {
    const navigable = dynamicCategories.filter(
      (category) => category.isActive !== false && category.showInNavigation !== false,
    );
    const navigableIds = new Set(navigable.map((category) => String(category._id)));
    const roots = [];
    const childrenByParent = new Map();
    const sortCategories = (items) => items.sort((a, b) =>
      Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
      String(a.name?.fa || a.name?.en || "").localeCompare(String(b.name?.fa || b.name?.en || ""), "fa")
    );

    navigable.forEach((category) => {
      const parentId = String(category.parentId || "");
      if (parentId && !navigableIds.has(parentId)) return;
      if (!parentId) {
        roots.push(category);
        return;
      }
      const children = childrenByParent.get(parentId) || [];
      children.push(category);
      childrenByParent.set(parentId, children);
    });

    childrenByParent.forEach(sortCategories);
    return { roots: sortCategories(roots), childrenByParent };
  }, [dynamicCategories, categories]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const slug = location.pathname.startsWith("/category/")
      ? decodeURIComponent(location.pathname.slice("/category/".length))
      : "";
    const currentCategory = dynamicCategories.find((item) => item.slug === slug);
    if (!currentCategory) return;

    setExpandedCategories((current) => {
      const next = { ...current };
      const byId = new Map(dynamicCategories.map((item) => [String(item._id), item]));
      let parentId = String(currentCategory.parentId || "");
      let depth = 0;
      while (parentId && depth++ < 20) {
        next[parentId] = true;
        parentId = String(byId.get(parentId)?.parentId || "");
      }
      return next;
    });
  }, [dynamicCategories, location.pathname]);
  const desktopSearchRef = useRef(null);
  const accountMenuRef = useRef(null);
  const [shippingAnnouncement, setShippingAnnouncement] = useState({
    loading: true,
    error: false,
    flatRate: 0,
    freeShippingThreshold: 0,
    currency: "IRT",
  });
  const [globalPriceBounds, setGlobalPriceBounds] = useState({ minPrice: 0, maxPrice: 1, count: 0 });
  const [filters, setFilters] = useState(defaultFilters);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeSearchSurface, setActiveSearchSurface] = useState(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [searchSuggestions, setSearchSuggestions] = useState({ products: [], loading: false, error: false });
  const mobileSearchDialogRef = useDialogAccessibility(mobileSearchOpen, () => {
    setMobileSearchOpen(false);
    setActiveSearchSurface(null);
  });
  const suggestionQuery = filters.q.trim();
  const appliedFilterParams = new URLSearchParams(
    location.pathname === "/shop" ? location.search : "",
  );
  const appliedSort = appliedFilterParams.get("sort") || "newest";
  const activeFilterCount = [
    appliedFilterParams.get("q"),
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
    let active = true;
    axios.get("/shipping?subtotal=0")
      .then(({ data }) => {
        if (!active) return;
        setShippingAnnouncement({
          loading: false,
          error: false,
          flatRate: Number(data.flatRate || 0),
          freeShippingThreshold: Number(data.freeShippingThreshold || 0),
          currency: String(data.currency || "IRT").toUpperCase(),
        });
      })
      .catch(() => {
        if (active) setShippingAnnouncement((current) => ({ ...current, loading: false, error: true }));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    axios.get("/products/price-bounds")
      .then(({ data }) => {
        if (!active) return;
        const bounds = data.priceBounds || {};
        const minPrice = Number(bounds.minPrice);
        const maxPrice = Number(bounds.maxPrice);
        const count = Number(bounds.count);
        setGlobalPriceBounds({
          minPrice: Number.isFinite(minPrice) ? Math.max(0, Math.floor(minPrice)) : 0,
          maxPrice: Number.isFinite(maxPrice) ? Math.max(1, Math.ceil(maxPrice)) : 1,
          count: Number.isFinite(count) ? Math.max(0, count) : 0,
        });
      })
      .catch(() => {
        if (active) setGlobalPriceBounds({ minPrice: 0, maxPrice: 1, count: 0 });
      });
    return () => { active = false; };
  }, []);

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
    if (!accountMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (location.pathname || location.search) {
      
      setAccountMenuOpen(false);
    }
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    
    await logout();
    navigate("/");
  };

  const linkClass = ({ isActive }) =>
    `inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] ${isActive ? "bg-[var(--ui-surface-raised)] text-[var(--ui-text)]" : "text-[var(--ui-muted)] hover:bg-[var(--ui-surface-raised)] hover:text-[var(--ui-text)]"}`;

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
    setFilters({ ...defaultFilters, category: "" });
    setActiveSearchSurface(null);
    setDesktopFiltersOpen(false);
    setMobileSearchOpen(false);
    navigate("/category/" + encodeURIComponent(category));
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
        className={`${surface === "desktop" ? "absolute left-0 right-0 top-[calc(100%+0.65rem)] z-[60]" : "relative mt-2"} max-h-80 overflow-y-auto rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-2 shadow-[0_20px_55px_-24px_rgba(37,39,34,0.35)]`}
      >
        {categorySuggestions.length > 0 && (
          <div className="pb-2">
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold text-[var(--ui-muted)]">دسته‌بندی‌های پیشنهادی</p>
            {categorySuggestions.map(([value, label], index) => (

              <button
                type="button"
                aria-label={accountMenuOpen ? "بستن منوی حساب کاربری" : "باز کردن منوی حساب کاربری"}
                aria-expanded={accountMenuOpen}
                aria-controls="account-menu"
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="order-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] text-[var(--ui-text-strong)] shadow-sm transition hover:border-[var(--ui-border-strong)] hover:bg-[var(--ui-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] lg:inline-flex"
              >
                {accountMenuOpen ? <X size={19} aria-hidden="true" /> : <UserRound size={19} aria-hidden="true" />}
              </button>

              <Link
                to="/cart"
                aria-label={cart.length > 0 ? `سبد خرید، ${new Intl.NumberFormat("fa-IR").format(cart.length)} کالا` : "سبد خرید"}
                className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ui-muted)] transition hover:bg-[var(--ui-surface-raised)] hover:text-[var(--ui-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] lg:order-1 lg:h-10 lg:w-auto lg:gap-2 lg:px-3"
              >
                <ShoppingCart size={18} aria-hidden="true" />
                <span className="hidden lg:inline">سبد خرید</span>
                {cart.length > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--ui-accent)] px-1.5 py-0.5 text-xs font-semibold text-[var(--ui-button-text)]">
                    {new Intl.NumberFormat("fa-IR").format(cart.length)}
                  </span>
                )}
              </Link>

              {accountMenuOpen && (
                <div
                  id="account-menu"
                  dir="rtl"
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] hidden w-64 overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-2 shadow-[0_24px_70px_-24px_rgba(37,39,34,0.35)] lg:block lg:left-0 lg:right-auto"
                >
                  <div className="border-b border-border px-3 py-3">
                    <p className="text-sm font-bold text-[var(--ui-text)]">حساب کاربری</p>
                    {user && (
                      <p className="mt-1 break-words text-xs text-[var(--ui-muted)]">{user.name || user.email || "کاربر فروشگاه"}</p>
                    )}
                  </div>

                  <div className="space-y-1 py-2">
                    {!user ? (
                      <>
                        <Link
                          to="/login"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]"
                        >
                          <LogIn size={17} aria-hidden="true" />
                          ورود به حساب
                        </Link>
                        <Link
                          to="/signup"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]"
                        >
                          <UserRound size={17} aria-hidden="true" />
                          ایجاد حساب کاربری
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/profile"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]"
                        >
                          <UserRound size={17} aria-hidden="true" />
                          پروفایل و نشانی‌ها
                        </Link>
                        <Link
                          to="/orders"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]"
                        >
                          <Truck size={17} aria-hidden="true" />
                          سفارش‌های من و رهگیری
                        </Link>
                        {isAdmin && (
                          <Link
                            to="/secret-dashboard"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]"
                          >
                            <Lock size={17} aria-hidden="true" />
                            داشبورد مدیریت
                          </Link>
                        )}
                        <NavLink to="/" end className={linkClass}>صفحه اصلی</NavLink>
                <NavLink to="/shop" className={linkClass}>محصولات</NavLink>
                <NavLink to="/categories" className={linkClass}>دسته‌بندی‌ها</NavLink>
                <NavLink to="/bestsellers" className={linkClass}>محبوب‌ترین‌ها</NavLink>
                <NavLink to="/new-arrivals" className={linkClass}>تازه‌واردها</NavLink>
                <NavLink to="/wishlist" className={linkClass}><Heart size={15} aria-hidden="true" />علاقه‌مندی‌ها{savedProducts.length > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--ui-accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ui-button-text)]">{new Intl.NumberFormat("fa-IR").format(savedProducts.length)}</span>}</NavLink>
              </nav>

              <div
                ref={desktopSearchRef}
                className="relative hidden min-w-0 max-w-none flex-1 items-center md:flex min-[1680px]:max-w-none"
              >
                <form
                  onSubmit={handleDesktopSearch}
                  role="search"
                  aria-label="جست‌وجوی محصولات"
                  className="storefront-search-form flex min-h-12 min-w-0 flex-1 items-center gap-1.5 rounded-2xl border border-[var(--ui-border-strong)] bg-white p-1.5 shadow-[0_8px_26px_-20px_var(--ui-shadow-color)] transition focus-within:border-[var(--ui-accent)] focus-within:ring-4 focus-within:ring-[var(--ui-accent-soft)]"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-surface-raised)] text-[var(--ui-accent)]">
                    <Search size={18} aria-hidden="true" />
                  </span>
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
                    placeholder="نام قطعه، برند یا مدل را جست‌وجو کنید..."
                    className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[var(--ui-text)] outline-none placeholder:text-[var(--ui-muted)]"
                  />
                  <button
                    type="submit"
                    aria-label="جست‌وجو"
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--ui-accent)] px-3.5 text-sm font-bold text-[var(--ui-button-text)] shadow-sm transition hover:bg-[var(--ui-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]"
                  >
                    <Search size={16} aria-hidden="true" />
                    <span className="hidden 2xl:inline">جست‌وجو</span>
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
                    className={`inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] ${desktopFiltersOpen ? "border-[var(--ui-accent)] bg-[var(--ui-hover)] text-[var(--ui-text-strong)]" : "border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-muted)] hover:bg-[var(--ui-surface-raised)]"}`}
                  >
                    <SlidersHorizontal size={16} aria-hidden="true" />
                    <span>فیلترها</span>
                    {activeFilterCount > 0 && (
                      <span
                        aria-label={`${new Intl.NumberFormat("fa-IR").format(activeFilterCount)} فیلتر فعال`}
                        className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--ui-accent)] px-1.5 py-0.5 text-[11px] font-bold leading-none text-[var(--ui-button-text)]"
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
                    className="absolute left-0 right-auto top-[calc(100%+0.75rem)] z-50 max-h-[min(70vh,34rem)] w-[27rem] overflow-y-auto rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-[0_24px_70px_-24px_rgba(37,39,34,0.35)]"
                  >
                    <div className="mb-4">
                      <p className="text-sm font-bold text-[var(--ui-text)]">فیلتر محصولات</p>
                      <p className="mt-1 text-xs text-[var(--ui-muted)]">نتیجه‌ها را دقیق‌تر و سریع‌تر پیدا کنید.</p>
                    </div>
                    {renderFilterFields()}
                    {renderFilterActions()}
                  </form>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                aria-label={activeFilterCount > 0
                  ? `باز کردن جست‌وجو و فیلتر محصولات، ${new Intl.NumberFormat("fa-IR").format(activeFilterCount)} فیلتر فعال`
                  : "باز کردن جست‌وجو و فیلتر محصولات"}
                className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--ui-border-strong)] bg-white p-0 text-[var(--ui-text-strong)] shadow-sm transition hover:border-[var(--ui-accent)] hover:bg-[var(--ui-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] md:hidden"
              >
                <Search size={18} aria-hidden="true" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-[var(--ui-canvas)] bg-[var(--ui-accent)] px-1 py-0.5 text-[10px] font-bold leading-none text-[var(--ui-button-text)]">
                    {new Intl.NumberFormat("fa-IR").format(activeFilterCount)}
                  </span>
                )}
              </button>
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
            className="absolute inset-0 h-full w-full bg-strong/35 backdrop-blur-md"
          />

          <section
            ref={mobileSearchDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-search-heading"
            className="relative z-10 max-h-[min(88dvh,48rem)] w-full max-w-lg animate-[searchPanelIn_180ms_ease-out] overflow-y-auto rounded-[1.75rem] border border-white/70 bg-surface/95 p-4 shadow-[0_32px_100px_-28px_rgba(37,39,34,0.5)] backdrop-blur-2xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-[var(--ui-accent)]">جست‌وجوی هوشمند</p>
                <h2 id="mobile-search-heading" className="font-serif text-2xl font-medium text-[var(--ui-text)]">دنبال چه چیزی هستید؟</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--ui-muted)]">محصولات را جست‌وجو و نتیجه‌ها را فیلتر کنید.</p>
              </div>
              <button
                type="button"
                onClick={() => { setMobileSearchOpen(false); setActiveSearchSurface(null); }}
                aria-label="بستن پنجره جست‌وجو"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-muted)] transition hover:bg-[var(--ui-surface-raised)] hover:text-[var(--ui-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={applyFilters}>
              <label htmlFor="mobile-product-search" className="sr-only">نام یا توضیحات محصول</label>
              <div className="mb-5 flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] p-1.5 transition focus-within:border-[var(--ui-accent)] focus-within:ring-4 focus-within:ring-brand/10">
                <Search size={19} className="mr-2 shrink-0 text-[var(--ui-accent)]" aria-hidden="true" />
                <input
                  id="mobile-product-search"
                  data-dialog-initial-focus
                  type="search"
                  value={filters.q}
                  onFocus={() => setActiveSearchSurface("mobile")}
                  onKeyDown={handleSuggestionKeyDown}
                  onChange={(event) => updateFilter("q", event.target.value)}
                  aria-autocomplete="list"
                  aria-controls="mobile-search-suggestions"
                  aria-expanded={activeSearchSurface === "mobile" && suggestionQuery.length >= 2}
                  autoComplete="off"
                  placeholder="مثلاً پردازنده، کارت گرافیک، حافظه یا مانیتور..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[var(--ui-text)] outline-none placeholder:text-[var(--ui-muted)]"
                />
              </div>

              {renderSearchSuggestions("mobile")}

              <div className="mb-4 flex items-center gap-2 border-b border-[var(--ui-border)] pb-3">
                <SlidersHorizontal size={17} className="text-[var(--ui-accent)]" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-[var(--ui-text)]">فیلترها</h3>
                <span className="text-xs text-[var(--ui-muted)]">قیمت و مرتب‌سازی</span>
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
