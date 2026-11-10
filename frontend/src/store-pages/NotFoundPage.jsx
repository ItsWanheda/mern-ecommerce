import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Home, Search, ShoppingBag } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { useCategoryStore } from "../stores/useCategoryStore";

const NotFoundPage = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { categories, categoriesLoaded, fetchCategories } = useCategoryStore();
  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  const popularCategories = useMemo(() => categories
    .filter((category) => !category.parentId && category.isActive !== false && category.showInNavigation !== false)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .slice(0, 8)
    .map((category) => ({ label: category.name?.fa || category.name?.en || category.slug, to: "/category/" + encodeURIComponent(category.slug) })), [categories]);

  const handleSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    navigate("/shop?q=" + encodeURIComponent(value));
  };

  return (
    <main dir="rtl" className="min-h-[65vh] bg-canvas px-4 py-12 text-ink sm:px-6 sm:py-16">
      <PageMeta title="صفحه پیدا نشد" description="نشانی واردشده معتبر نیست یا این صفحه دیگر در فروشگاه سخت‌افزار در دسترس نیست." path={location.pathname} robots="noindex, nofollow" canonical={false} />
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface text-brand shadow-sm">
          <ShoppingBag size={28} aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-brand">Computer Hardware · صفحه پیدا نشد</p>
        <p aria-label="خطای ۴۰۴" className="mt-3 font-serif text-7xl font-semibold tracking-tight text-ink sm:text-8xl">۴۰۴</p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">این صفحه در فروشگاه نیست</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-muted sm:text-base">
          ممکن است نشانی تغییر کرده باشد یا صفحه دیگر در دسترس نباشد. می‌توانید محصولی را جست‌وجو کنید یا از دسته‌بندی‌های فروشگاه ادامه دهید.
        </p>
        <form onSubmit={handleSearch} className="mt-7 flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm sm:flex-row">
          <label htmlFor="not-found-search" className="sr-only">جست‌وجو در محصولات</label>
          <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-2">
            <Search size={18} className="shrink-0 text-brand" aria-hidden="true" />
            <input id="not-found-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام قطعه، مدل یا سازنده را بنویسید…" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-muted-soft" />
          </div>
          <button type="submit" disabled={!query.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-strong px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-strong-hover disabled:cursor-not-allowed disabled:opacity-50">
            جست‌وجو <ArrowLeft size={15} aria-hidden="true" />
          </button>
        </form>
        <section className="mt-8 w-full max-w-xl" aria-labelledby="popular-categories-title">
          <h2 id="popular-categories-title" className="text-sm font-semibold text-ink-strong">دسته‌بندی‌های پرطرفدار</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {!categoriesLoaded ? <span className="text-xs text-muted-soft">در حال دریافت دسته‌بندی‌ها…</span> : popularCategories.length ? popularCategories.map((category) => (
              <Link key={category.to} to={category.to} className="inline-flex min-h-10 items-center rounded-full border border-border-strong bg-surface px-4 py-2 text-sm text-ink-strong transition hover:border-brand hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                {category.label}
              </Link>
            )) : <span className="text-xs text-muted-soft">هنوز دسته‌بندی فعالی ایجاد نشده است.</span>}
          </div>
        </section>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Link to="/shop" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-strong-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <ShoppingBag size={16} aria-hidden="true" /> مشاهده همه محصولات
          </Link>
          <Link to="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-5 py-2.5 text-sm font-semibold text-ink-strong transition hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <Home size={16} aria-hidden="true" /> صفحه اصلی
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFoundPage;
