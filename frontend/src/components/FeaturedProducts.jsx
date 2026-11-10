"use client";

import { useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import { Link } from "react-router-dom";

const FeaturedProducts = ({ featuredProducts = [] }) => {
  const trackRef = useRef(null);
  const scrollTrack = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * Math.max(track.clientWidth * 0.78, 280),
      behavior: "smooth",
    });
  };

  return (
    <section dir="rtl" className="py-8 sm:py-10" aria-labelledby="featured-products-heading">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="featured-products-heading" className="text-xl font-extrabold tracking-tight text-[var(--ui-text)] sm:text-2xl">محبوب‌ترین‌ها</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          
          <Link to="/bestsellers" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-ink-strong transition hover:border-ink">
            مشاهده همه<ArrowLeft size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="relative">
        <div
          id="featured-products-track"
          ref={trackRef}
          tabIndex={0}
          aria-label="محبوب‌ترین‌ها؛ برای دیدن محصولات بیشتر به چپ و راست حرکت کنید"
          className="desktop-product-scrollbar flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto overscroll-x-contain pb-4 sm:gap-4"
        >
          {featuredProducts.map((product) => (
            <div
              key={product._id}
              className="w-[min(72%,17rem)] min-w-0 shrink-0 snap-start sm:w-[min(36%,18rem)] lg:w-[min(24%,19rem)]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {featuredProducts.length > 3 && (
          <div className="mt-3 hidden items-center justify-end gap-2 md:flex">
            <button
              type="button"
              aria-controls="featured-products-track"
              onClick={() => scrollTrack(1)}
              aria-label="محصولات قبلی"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-strong text-ink transition hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <ChevronRight size={19} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-controls="featured-products-track"
              onClick={() => scrollTrack(-1)}
              aria-label="محصولات بعدی"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-strong text-ink transition hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <ChevronLeft size={19} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
