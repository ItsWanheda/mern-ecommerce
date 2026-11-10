import { ArrowUpLeft } from "lucide-react";
import { Link } from "react-router-dom";

const CategoryItem = ({ category }) => (
  <article className="category-tile group min-w-0 overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--ui-border-strong)] hover:shadow-[0_14px_32px_-24px_var(--ui-shadow-color)]">
    <Link
      to={category.href}
      className="block h-full min-w-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--ui-focus)]"
      aria-label={`مشاهده ${category.name}`}
    >
      <div className="category-tile__image flex aspect-[1.3/1] w-full items-center justify-center overflow-hidden bg-[var(--ui-surface-raised)] p-3 sm:aspect-[1.45/1]">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none"
          />
        ) : (
          <span aria-hidden="true" className="text-3xl text-[var(--ui-muted)]">◇</span>
        )}
      </div>
      <div className="flex min-h-[4.25rem] items-center justify-between gap-2 px-3 py-3 sm:px-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-xs font-bold leading-5 text-[var(--ui-text)] sm:text-sm">
            <bdi dir="auto">{category.name}</bdi>
          </h3>
          <p className="mt-0.5 text-[10px] text-[var(--ui-muted)] sm:text-[11px]">مشاهده محصولات</p>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ui-accent-soft)] text-[var(--ui-accent)] transition group-hover:bg-[var(--ui-accent)] group-hover:text-[var(--ui-button-text)]">
          <ArrowUpLeft size={16} aria-hidden="true" />
        </span>
      </div>
    </Link>
  </article>
);

export default CategoryItem;
