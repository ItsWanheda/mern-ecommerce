"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpLeft, FolderTree, RefreshCw, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { useCategoryStore } from "../stores/useCategoryStore";

const categoryName = (category) => category?.name?.fa || category?.name?.en || category?.slug || "دسته‌بندی";
const sortCategories = (items) => [...items].sort((a, b) =>
  Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
  categoryName(a).localeCompare(categoryName(b), "fa")
);

const CategoryBranch = ({ category, childrenByParent, depth = 0, ancestors = [] }) => {
  const id = String(category._id || category.slug);
  if (ancestors.includes(id)) return null;

  const children = childrenByParent.get(id) || [];
  const nextAncestors = [...ancestors, id];
  const title = categoryName(category);
  const href = "/category/" + encodeURIComponent(category.slug);
  const description = String(category.description?.fa || category.description?.en || "").trim();

  if (depth === 0) {
    const hasImage = Boolean(category.image);
    return (
      <section className="min-w-0">
        <Link
          to={href}
          aria-label={"مشاهده محصولات دسته " + title}
          className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ui-focus)]"
        >
          <div className={"relative isolate min-h-[15rem] overflow-hidden rounded-3xl border border-[var(--ui-border)] shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl " + (hasImage ? "bg-strong" : "bg-[var(--ui-surface-raised)]")}>
            <div className="absolute inset-0 flex items-center justify-center text-[var(--ui-accent)]">
              <FolderTree size={58} strokeWidth={1.25} aria-hidden="true" />
            </div>
            {hasImage && (
              <img
                src={category.image}
                alt=""
                loading="lazy"
                decoding="async"
                onError={(event) => { event.currentTarget.style.display = "none"; }}
                className="absolute inset-0 z-[1] h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            )}
            <div className={"absolute inset-0 z-[2] " + (hasImage ? "bg-gradient-to-t from-black/80 via-black/25 to-transparent" : "bg-gradient-to-br from-[var(--ui-surface-raised)]/10 via-transparent to-[var(--ui-hover)]/70")} />
            <div className="absolute inset-x-0 bottom-0 z-[3] p-5 sm:p-6">
              <h2 className={"text-xl font-bold sm:text-2xl " + (hasImage ? "text-white" : "text-[var(--ui-text)]")}>{title}</h2>
              <p className={"mt-2 max-h-12 max-w-xl overflow-hidden text-sm leading-6 " + (hasImage ? "text-white/85" : "text-[var(--ui-muted)]")}>
                {description || "برای مشاهده محصولات این دسته و زیر‌دسته‌های آن وارد شوید."}
              </p>
              <span className={"mt-4 inline-flex min-h-9 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold " + (hasImage ? "bg-surface/15 text-white" : "bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]")}>
                مشاهده مجموعه <ArrowUpLeft size={15} aria-hidden="true" />
              </span>
            </div>
          </div>
        </Link>
        {children.length > 0 && (
          <div className="mt-3 space-y-2">
            {children.map((child) => (
              <CategoryBranch key={child._id} category={child} childrenByParent={childrenByParent} depth={depth + 1} ancestors={nextAncestors} />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className={depth > 1 ? "mr-4 min-w-0 border-r border-[var(--ui-border)] pr-3" : "min-w-0"}>
      <Link
        to={href}
        className="group flex min-h-16 min-w-0 items-center gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3 transition hover:border-[var(--ui-border-strong)] hover:bg-[var(--ui-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--ui-surface-raised)] text-[var(--ui-accent)]">
          {category.image ? (
            <img src={category.image} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} className="h-full w-full object-cover" />
          ) : (
            <FolderTree size={19} aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold text-[var(--ui-text)]">{title}</span>
          {description && <span className="mt-1 block max-h-10 overflow-hidden text-xs leading-5 text-[var(--ui-muted)]">{description}</span>}
        </span>
        <ArrowUpLeft size={17} className="shrink-0 text-[var(--ui-accent)] transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </Link>
      {children.length > 0 && (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <CategoryBranch key={child._id} category={child} childrenByParent={childrenByParent} depth={depth + 1} ancestors={nextAncestors} />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoriesPage = () => {
  const { categories, fetchCategories } = useCategoryStore();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchCategories().then(() => {
      if (!active) return;
      setLoadError(useCategoryStore.getState().error || "");
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [fetchCategories, retryKey]);

  const { roots, childrenByParent } = useMemo(() => {
    const visible = categories.filter((category) => category.isActive !== false);
    const visibleIds = new Set(visible.map((category) => String(category._id)));
    const roots = [];
    const childrenByParent = new Map();

    visible.forEach((category) => {
      const parentId = String(category.parentId || "");
      if (!parentId || !visibleIds.has(parentId)) {
        roots.push(category);
        return;
      }
      const children = childrenByParent.get(parentId) || [];
      children.push(category);
      childrenByParent.set(parentId, children);
    });

    childrenByParent.forEach((items, parentId) => childrenByParent.set(parentId, sortCategories(items)));
    return { roots: sortCategories(roots), childrenByParent };
  }, [categories]);

  const activeCount = categories.filter((category) => category.isActive !== false).length;

  return (
    <main dir="rtl" className="min-h-screen bg-[var(--ui-canvas)] px-3 py-8 text-[var(--ui-text)] sm:px-6 sm:py-10 lg:px-8">
      <PageMeta
        title="دسته‌بندی‌های تیک بوتیک"
        description="همه دسته‌بندی‌های فعال تیک بوتیک را مرور کنید و مجموعه موردنظرتان را پیدا کنید."
        path="/categories"
        breadcrumbs={[{ name: "صفحه اصلی", path: "/" }, { name: "دسته‌بندی‌ها", path: "/categories" }]}
      />
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 border-b border-[var(--ui-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[var(--ui-accent)]">
              <ShoppingBag size={15} aria-hidden="true" /> مجموعه تیک بوتیک
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ui-text)] sm:text-4xl">دسته‌بندی‌های فروشگاه</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ui-muted)]">
              همه گروه‌های محصولات را از دسته‌های اصلی تا زیر‌دسته‌ها مرور کنید. با انتخاب هر دسته، محصولات همان مجموعه را ببینید.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-2 text-sm text-[var(--ui-muted)]">
              {new Intl.NumberFormat("fa-IR").format(activeCount)} دسته فعال
            </span>
            <Link to="/shop" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-[var(--ui-button-text)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]">
              همه محصولات <ArrowUpLeft size={16} aria-hidden="true" />
            </Link>
          </div>
        </header>

        {loadError && (
          <div role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--ui-danger-border)] bg-[var(--ui-danger-bg)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-[var(--ui-danger)]">{loadError}</p>
            <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--ui-danger-border)] px-4 text-sm font-semibold text-[var(--ui-danger)]">
              <RefreshCw size={14} aria-hidden="true" /> تلاش دوباره
            </button>
          </div>
        )}

        {isLoading && roots.length === 0 ? (
          <div role="status" className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] text-sm text-[var(--ui-muted)]">
            <RefreshCw size={18} className="animate-spin text-[var(--ui-accent)]" aria-hidden="true" /> در حال دریافت دسته‌بندی‌ها…
          </div>
        ) : roots.length > 0 ? (
          <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:gap-6">
            {roots.map((category) => (
              <CategoryBranch key={category._id} category={category} childrenByParent={childrenByParent} />
            ))}
          </div>
        ) : (
          <section className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-5 py-12 text-center">
            <FolderTree size={32} className="text-[var(--ui-muted)]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[var(--ui-text)]">هنوز دسته‌بندی فعالی ثبت نشده است</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ui-muted)]">دسته‌بندی‌های فعال پس از ثبت توسط مدیریت فروشگاه در این صفحه نمایش داده می‌شوند.</p>
          </section>
        )}
      </div>
    </main>
  );
};

export default CategoriesPage;
