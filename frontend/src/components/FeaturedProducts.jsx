import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";

const FeaturedProducts = ({ featuredProducts = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setItemsPerPage(1);
      else if (window.innerWidth < 1024) setItemsPerPage(2);
      else if (window.innerWidth < 1280) setItemsPerPage(3);
      else setItemsPerPage(4);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => setCurrentIndex(0), [itemsPerPage, featuredProducts.length]);
  const maxIndex = Math.max(0, featuredProducts.length - itemsPerPage);
  const nextSlide = () => setCurrentIndex((index) => Math.min(index + itemsPerPage, maxIndex));
  const prevSlide = () => setCurrentIndex((index) => Math.max(0, index - itemsPerPage));

  return (
    <section className="py-8 sm:py-10" aria-labelledby="featured-products-heading">
      <div className="mb-7 flex flex-col gap-3 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#68745f]">Selected for you</p><h2 id="featured-products-heading" className="font-serif text-3xl font-medium tracking-tight text-[#252722] sm:text-4xl">Featured pieces</h2></div>
        <p className="max-w-sm text-sm leading-6 text-[#62645c] sm:text-right">A considered edit of pieces worth a closer look.</p>
      </div>
      <div className="relative">
        <div className="overflow-hidden"><div className="flex items-stretch transition-transform duration-300 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${(currentIndex / Math.max(featuredProducts.length, 1)) * 100}%)` }}>
          {featuredProducts.map((product) => <div key={product._id} className="shrink-0 px-2 pb-2" style={{ flexBasis: `${100 / itemsPerPage}%` }}><ProductCard product={product} /></div>)}
        </div></div>
        {featuredProducts.length > itemsPerPage && <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-xs tabular-nums text-[#77786f]" aria-live="polite">{Math.min(currentIndex + itemsPerPage, featuredProducts.length)} of {featuredProducts.length} pieces</p>
          <div className="flex gap-2">
            <button type="button" onClick={prevSlide} disabled={currentIndex === 0} aria-label="قبلی featured products" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d5d0c5] text-[#252722] transition hover:border-[#252722] disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft size={19} aria-hidden="true" /></button>
            <button type="button" onClick={nextSlide} disabled={currentIndex >= maxIndex} aria-label="بعدی featured products" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d5d0c5] text-[#252722] transition hover:border-[#252722] disabled:cursor-not-allowed disabled:opacity-35"><ChevronRight size={19} aria-hidden="true" /></button>
          </div>
        </div>}
      </div>
    </section>
  );
};
export default FeaturedProducts;
