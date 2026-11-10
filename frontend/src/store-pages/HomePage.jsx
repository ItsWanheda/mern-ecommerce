"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Cpu,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import axios from "../lib/axios";
import { attachCampaignProducts, getCampaignProductIds } from "../lib/campaign-products.js";
import CategoryItem from "../components/CategoryItem";
import ProductCard from "../components/ProductCard";
import { useProductStore } from "../stores/useProductStore";
import { useCategoryStore } from "../stores/useCategoryStore";
import { getCampaignPath } from "../lib/campaign-url";

const benefits = [
  { icon: Truck, title: "ارسال شفاف", text: "هزینه ارسال پیش از پرداخت مشخص است." },
  { icon: ShieldCheck, title: "پرداخت امن", text: "پرداخت از مسیر رسمی و امن انجام می‌شود." },
  { icon: PackageCheck, title: "اطلاعات دقیق", text: "مشخصات فنی و موجودی را پیش از خرید ببینید." },
  { icon: RefreshCw, title: "پشتیبانی خرید", text: "برای انتخاب و پیگیری سفارش همراهتان هستیم." },
];

const SectionHeading = ({ title, href, linkLabel = "مشاهده همه" }) => (
  <div className="mb-4 flex min-h-10 items-center justify-between gap-3 sm:mb-5">
    <h2 className="min-w-0 text-lg font-extrabold tracking-tight text-[var(--ui-text)] sm:text-xl">{title}</h2>
    {href && (
      <Link to={href} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-3 py-2 text-[11px] font-semibold text-[var(--ui-text-strong)] transition hover:border-[var(--ui-accent)] hover:bg-[var(--ui-accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] sm:text-xs">
        {linkLabel}<ArrowLeft size={14} aria-hidden="true" />
      </Link>
    )}
  </div>
);

const ProductGridSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} aria-hidden="true" className="overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)]">
        <div className="aspect-square animate-pulse bg-[var(--ui-surface-raised)]" />
        <div className="space-y-3 p-3 sm:p-4">
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-[var(--ui-surface-raised)]" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-[var(--ui-surface-raised)]" />
          <div className="h-10 animate-pulse rounded-xl bg-[var(--ui-surface-raised)]" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyCollection = ({ title, text, href = "/shop", action = "مشاهده محصولات" }) => (
  <div className="rounded-2xl border border-dashed border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-5 py-8 text-center sm:py-10">
    <Cpu size={27} className="mx-auto text-[var(--ui-accent)]" aria-hidden="true" />
    <h3 className="mt-3 text-sm font-bold text-[var(--ui-text)]">{title}</h3>
    <p className="mt-1 text-xs leading-6 text-[var(--ui-muted)]">{text}</p>
    <Link to={href} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--ui-accent)] px-4 py-2 text-xs font-bold text-[var(--ui-button-text)] transition hover:bg-[var(--ui-accent-hover)]">
      {action}<ArrowLeft size={14} aria-hidden="true" />
    </Link>
  </div>
);

const HomePage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [heroPaused, setHeroPaused] = useState(false);
  const [newestLoaded, setNewestLoaded] = useState(false);
  const [newestError, setNewestError] = useState(false);

  const {
    fetchFeaturedProducts,
    featuredProducts,
    fetchNewestProducts,
    newestProducts,
  } = useProductStore();
  const {
    categories: storeCategories,
    categoriesLoaded,
    categoriesError,
    fetchCategories,
  } = useCategoryStore();

  const categories = useMemo(() => storeCategories
    .filter((category) => !category.parentId && category.isActive !== false && category.showInNavigation !== false)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .map((category) => ({
      href: "/category/" + encodeURIComponent(category.slug),
      name: category.name?.fa || category.name?.en || category.slug,
      imageUrl: category.image || "/hardware-category-placeholder.svg",
    })), [storeCategories]);

  useEffect(() => {
    let active = true;
    fetchFeaturedProducts();
    fetchCategories();

    Promise.resolve(fetchNewestProducts())
      .then((succeeded) => { if (active) setNewestError(succeeded === false); })
      .finally(() => { if (active) setNewestLoaded(true); });

    const loadCampaigns = async () => {
      const { data } = await axios.get("/campaigns");
      const campaignList = Array.isArray(data.campaigns) ? data.campaigns : [];
      const productIds = getCampaignProductIds(campaignList);
      const productResults = await Promise.allSettled(
        productIds.map((productId) => axios.get("/products/" + productId))
      );
      const productsById = new Map();
      productResults.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        const product = result.value?.data;
        if (product?._id && String(product._id) === productIds[index] && product.isActive !== false) {
          productsById.set(productIds[index], product);
        }
      });
      if (active) setCampaigns(attachCampaignProducts(campaignList, productsById));
    };

    loadCampaigns().catch((error) => console.error("Could not load campaigns:", error.message));
    return () => { active = false; };
  }, [fetchFeaturedProducts, fetchNewestProducts, fetchCategories]);

  const catalogProducts = useMemo(() => [...featuredProducts, ...newestProducts]
    .filter((product, index, all) => product?._id && all.findIndex((item) => item?._id === product._id) === index),
  [featuredProducts, newestProducts]);

  // The existing campaign manager supplies the hero slides. Admins can publish
  // several active campaigns with images to create a multi-image home carousel.
  const heroCampaigns = campaigns.filter((campaign) => {
    const hasTitle = typeof campaign?.title === "string" && campaign.title.trim();
    const hasImage = typeof campaign?.image === "string" && campaign.image.trim();
    const href = campaign?.href;
    return hasTitle && hasImage && typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
  });
  const heroCampaign = heroCampaigns.length
    ? heroCampaigns[heroSlideIndex % heroCampaigns.length]
    : null;
  const heroProduct = catalogProducts.find((product) =>
    typeof product?.image === "string" && product.image.trim() &&
    !(typeof product.stock === "number" && product.stock <= 0)
  );
  const heroImage = heroCampaign?.image || heroProduct?.image || "/hardware-category-placeholder.svg";
  const heroHref = heroCampaign ? getCampaignPath(heroCampaign) : "/shop";

  useEffect(() => setHeroImageFailed(false), [heroImage]);
  useEffect(() => {
    if (heroCampaigns.length < 2 || heroPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const intervalId = window.setInterval(() => {
      setHeroSlideIndex((index) => (index + 1) % heroCampaigns.length);
    }, 6500);
    return () => window.clearInterval(intervalId);
  }, [heroCampaigns.length, heroPaused]);

  const showPreviousCampaign = () => setHeroSlideIndex((index) =>
    (index - 1 + heroCampaigns.length) % heroCampaigns.length
  );
  const showNextCampaign = () => setHeroSlideIndex((index) =>
    (index + 1) % heroCampaigns.length
  );

  const discountCampaigns = campaigns
    .filter((campaign) => campaign?.image && campaign?.title)
    .slice(0, 3);
  const campaignProducts = campaigns
    .flatMap((campaign) => Array.isArray(campaign.productIds) ? campaign.productIds : [])
    .filter((product) => product && typeof product === "object" && product._id && product.isActive !== false)
    .filter((product, index, all) => all.findIndex((item) => String(item._id) === String(product._id)) === index);

  const retryNewest = async () => {
    setNewestLoaded(false);
    setNewestError(false);
    try {
      setNewestError((await fetchNewestProducts()) === false);
    } catch {
      setNewestError(true);
    } finally {
      setNewestLoaded(true);
    }
  };

  return (
    <main dir="rtl" className="storefront-page storefront-home min-h-screen bg-[var(--ui-canvas)] text-[var(--ui-text)]">
      <div className="mx-auto max-w-[1440px] space-y-8 px-3 pb-12 pt-5 sm:space-y-10 sm:px-6 sm:pb-16 sm:pt-7 lg:px-8">
        <section
          aria-label="پیشنهاد اصلی فروشگاه"
          className="storefront-hero overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-[0_18px_45px_-38px_var(--ui-shadow-color)]"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          onFocusCapture={() => setHeroPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setHeroPaused(false);
          }}
        >
          <div className="grid min-w-0 items-stretch lg:min-h-[430px] lg:grid-cols-[0.94fr_1.06fr]">
            <div className="order-1 flex min-w-0 flex-col justify-center px-5 py-7 sm:px-8 sm:py-9 lg:px-10 xl:px-12">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-3 py-1.5 text-[11px] font-bold text-[var(--ui-accent)]">
                <Sparkles size={14} aria-hidden="true" />
                {heroCampaign ? "پیشنهاد ویژه فروشگاه" : "فروشگاه تخصصی قطعات کامپیوتر"}
              </span>
              <h1 className="mt-5 max-w-xl text-2xl font-extrabold leading-[1.55] tracking-tight text-[var(--ui-text)] sm:text-3xl sm:leading-[1.5] lg:text-4xl xl:text-[2.7rem]">
                {heroCampaign ? <bdi dir="auto">{heroCampaign.title}</bdi> : <>سیستم دلخواهت را با <span className="text-[var(--ui-accent)]">انتخابی هوشمند</span> بساز.</>}
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-7 text-[var(--ui-muted)] sm:mt-4 sm:text-base sm:leading-8">
                {heroCampaign
                  ? heroCampaign.description || "این پیشنهاد را ببین و قطعات مناسب سیستم خودت را انتخاب کن."
                  : "قطعات را بر اساس بودجه، مشخصات فنی و سازگاری بررسی کن؛ بعد با خیال راحت انتخاب کن."}
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                <Link to={heroHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ui-accent)] px-5 py-2.5 text-sm font-bold text-[var(--ui-button-text)] transition hover:bg-[var(--ui-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]">
                  {heroCampaign ? "مشاهده پیشنهاد" : "مشاهده محصولات"}<ArrowLeft size={16} aria-hidden="true" />
                </Link>
                <Link to="/categories" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]">
                  خرید بر اساس دسته‌بندی
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--ui-border)] pt-4 text-[11px] font-medium text-[var(--ui-muted)] sm:text-xs">
                <span className="inline-flex items-center gap-2"><Cpu size={15} className="text-[var(--ui-accent)]" aria-hidden="true" />انتخاب بر اساس نیاز</span>
                <span className="inline-flex items-center gap-2"><PackageCheck size={15} className="text-[var(--ui-accent)]" aria-hidden="true" />مشخصات قابل بررسی</span>
              </div>
            </div>

            <div className="relative order-2 min-h-[230px] overflow-hidden bg-[var(--ui-surface-raised)] sm:min-h-[310px] lg:min-h-[430px]">
              {heroImageFailed ? (
                <div role="img" aria-label="تصویر محصولات در دسترس نیست" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--ui-surface-raised)] p-8 text-center text-[var(--ui-muted)]">
                  <Cpu size={42} className="text-[var(--ui-accent)]" aria-hidden="true" />
                  <p className="max-w-xs text-sm leading-7">قطعات و تجهیزات کامپیوتر را از دسته‌بندی‌های فروشگاه مرور کنید.</p>
                </div>
              ) : (
                <img
                  src={heroImage}
                  alt={heroCampaign?.title || heroProduct?.name || "قطعات کامپیوتر"}
                  fetchPriority="high"
                  onError={() => setHeroImageFailed(true)}
                  className={`absolute inset-0 h-full w-full ${heroCampaign ? "object-cover object-center" : "object-contain object-center bg-white p-5 sm:p-8 lg:p-10"}`}
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--ui-strong-surface)]/10 via-transparent to-transparent" />
              {heroCampaigns.length > 1 && (
                <div className="absolute inset-x-0 bottom-4 flex items-center justify-center px-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-[var(--ui-surface)]/90 px-2 py-1.5 text-[var(--ui-text)] shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)] backdrop-blur-md" aria-label="انتخاب تصویر پیشنهادها">
                    <button type="button" onClick={showPreviousCampaign} aria-label="تصویر قبلی" className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[var(--ui-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]">
                      <ChevronRight size={17} aria-hidden="true" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      {heroCampaigns.map((campaign, index) => (
                        <button key={campaign._id || index} type="button" onClick={() => setHeroSlideIndex(index)} aria-label={"نمایش تصویر " + (index + 1)} aria-pressed={heroSlideIndex === index} className={"h-1.5 rounded-full transition-all " + (heroSlideIndex === index ? "w-5 bg-[var(--ui-accent)]" : "w-1.5 bg-[var(--ui-border-strong)] hover:bg-[var(--ui-accent)]")} />
                      ))}
                    </div>
                    <button type="button" onClick={showNextCampaign} aria-label="تصویر بعدی" className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[var(--ui-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]">
                      <ChevronLeft size={17} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section aria-label="مزایای خرید از فروشگاه" className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3 sm:grid-cols-4 sm:gap-3 sm:p-4">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-2 sm:gap-3 sm:px-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ui-accent-soft)] text-[var(--ui-accent)] sm:h-10 sm:w-10"><Icon size={18} aria-hidden="true" /></span>
              <span className="min-w-0">
                <strong className="block truncate text-xs font-bold text-[var(--ui-text)] sm:text-sm">{title}</strong>
                <span className="mt-0.5 block text-[10px] leading-4 text-[var(--ui-muted)] sm:text-[11px]">{text}</span>
              </span>
            </div>
          ))}
        </section>

        {discountCampaigns.length > 0 && (
          <section aria-labelledby="special-discounts-heading">
            <SectionHeading title="تخفیف‌های ویژه" href="/campaigns" linkLabel="همه پیشنهادها" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {discountCampaigns.map((campaign) => (
                <Link
                  key={campaign._id}
                  to={getCampaignPath(campaign)}
                  className="group relative isolate flex min-h-[150px] items-end overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-4 sm:min-h-[175px] sm:p-5"
                >
                  <img src={campaign.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <div className="max-w-full text-white">
                    <h3 className="line-clamp-2 text-base font-extrabold leading-7 sm:text-lg"><bdi dir="auto">{campaign.title}</bdi></h3>
                    <span className="mt-2 inline-flex items-center gap-2 text-xs font-bold">مشاهده پیشنهاد<ArrowLeft size={14} aria-hidden="true" /></span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section id="shop-by-category" aria-labelledby="shop-by-category-heading" className="scroll-mt-28">
          <SectionHeading title="دسته‌بندی‌ها" href="/categories" />
          {!categoriesLoaded ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => <div key={index} className="aspect-[1.3/1] animate-pulse rounded-2xl bg-[var(--ui-surface-raised)]" />)}
            </div>
          ) : categoriesError && categories.length === 0 ? (
            <div role="alert" className="rounded-2xl border border-[var(--ui-danger-border)] bg-[var(--ui-danger-bg)] px-5 py-7 text-center text-sm text-[var(--ui-danger)]">
              <p className="font-semibold">دریافت دسته‌بندی‌های فروشگاه ناموفق بود.</p>
              <p className="mt-1 text-xs leading-6">{categoriesError}</p>
              <button type="button" onClick={() => fetchCategories()} className="mt-3 inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--ui-danger-border)] px-4 text-xs font-semibold">تلاش دوباره</button>
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
              {categories.map((category) => <CategoryItem key={category.href} category={category} />)}
            </div>
          ) : (
            <EmptyCollection title="هنوز دسته‌بندی فعالی ثبت نشده است" text="دسته‌بندی‌های فعال پس از ثبت توسط مدیریت فروشگاه اینجا نمایش داده می‌شوند." href="/shop" />
          )}
        </section>



        {campaignProducts.length > 0 && (
          <section aria-labelledby="campaign-products-heading">
            <SectionHeading title="محصولات پیشنهادها" href="/campaigns" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {campaignProducts.slice(0, 4).map((product) => <ProductCard key={product._id} product={product} />)}
            </div>
          </section>
        )}

        <section aria-labelledby="popular-products-heading">
          <SectionHeading title="محبوب‌ترین‌ها" href="/bestsellers" />
          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {featuredProducts.slice(0, 8).map((product) => <ProductCard key={product._id} product={product} />)}
            </div>
          ) : (
            <EmptyCollection
              title="هنوز محصولی برای محبوب‌ترین‌ها انتخاب نشده است"
              text="محصولاتی که مدیریت فروشگاه پیشنهاد می‌کند، پس از فعال‌سازی در این بخش نمایش داده می‌شوند."
              href="/shop"
            />
          )}
        </section>

        <section aria-labelledby="newest-products-heading">
          <SectionHeading title="تازه‌واردها" href="/new-arrivals" />
          {!newestLoaded ? (
            <ProductGridSkeleton />
          ) : newestError ? (
            <div role="alert" className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-5 py-8 text-center">
              <p className="text-sm font-semibold text-[var(--ui-text)]">تازه‌واردها بارگذاری نشدند.</p>
              <p className="mt-1 text-xs text-[var(--ui-muted)]">برای دریافت آخرین محصولات دوباره تلاش کن.</p>
              <button type="button" onClick={retryNewest} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--ui-accent)] px-4 py-2 text-xs font-bold text-[var(--ui-button-text)]">
                <RefreshCw size={14} aria-hidden="true" />تلاش دوباره
              </button>
            </div>
          ) : newestProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {newestProducts.slice(0, 4).map((product) => <ProductCard key={product._id} product={product} />)}
            </div>
          ) : (
            <EmptyCollection title="محصول تازه‌ای برای نمایش وجود ندارد" text="محصولات جدید پس از ثبت در فروشگاه اینجا نمایش داده می‌شوند." href="/shop" />
          )}
        </section>


      </div>
    </main>
  );
};

export default HomePage;
