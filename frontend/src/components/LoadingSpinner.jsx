import { ShoppingBag } from "lucide-react";

const LoadingSpinner = () => {
  return (
    <main
      dir="rtl"
      role="status"
      aria-live="polite"
      aria-label="در حال بارگذاری فروشگاه"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-6 text-ink"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 right-[-6rem] h-80 w-80 rounded-full bg-brand-soft/70 blur-3xl sm:right-[8%]" />
        <div className="absolute -bottom-40 left-[-5rem] h-96 w-96 rounded-full bg-border/70 blur-3xl sm:left-[10%]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-border to-transparent" />
      </div>

      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className="mb-8 inline-flex items-center font-serif text-3xl font-semibold tracking-tight text-ink">
          فروشگاه<span className="mr-1 text-brand">.</span>
        </div>

        <div className="relative mb-7 flex h-24 w-24 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border border-border"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#68745f] motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
            <ShoppingBag size={26} strokeWidth={1.7} aria-hidden="true" />
          </div>
        </div>

        <h1 className="font-serif text-xl font-medium tracking-tight text-ink">
          در حال آماده‌سازی فروشگاه
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-soft">
          لطفاً چند لحظه صبر کنید.
        </p>

        <div
          className="mt-7 flex items-center gap-1.5"
          aria-hidden="true"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand motion-reduce:animate-none" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand/70 [animation-delay:150ms] motion-reduce:animate-none" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand/40 [animation-delay:300ms] motion-reduce:animate-none" />
        </div>
      </div>
    </main>
  );
};

export default LoadingSpinner;
