"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { ArrowLeft, ChevronLeft, ChevronRight, Leaf, PackageCheck, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "../lib/axios";
import { attachCampaignProducts, getCampaignProductIds } from "../lib/campaign-products.js";
import CategoryItem from "../components/CategoryItem";
import ProductCard from "../components/ProductCard";
import { useProductStore } from "../stores/useProductStore";
import FeaturedProducts from "../components/FeaturedProducts";
import { formatPrice } from "../lib/commerce";
import { useCategoryStore } from "../stores/useCategoryStore";
import { getCampaignPath } from "../lib/campaign-url";

gsap.registerPlugin(ScrollTrigger);

const legacyCategoryCards = [
  { href: "/category/jeans", name: "شلوار جین", imageUrl: "/jeans.jpg" },
  { href: "/category/t-shirts", name: "تی‌شرت", imageUrl: "/tshirts.jpg" },
  { href: "/category/shoes", name: "کفش", imageUrl: "/shoes.jpg" },
  { href: "/category/glasses", name: "عینک", imageUrl: "/glasses.png" },
  { href: "/category/jackets", name: "کاپشن و کت", imageUrl: "/jackets.jpg" },
  { href: "/category/suits", name: "کت‌وشلوار", imageUrl: "/suits.jpg" },
  { href: "/category/bags", name: "کیف", imageUrl: "/bags.jpg" },
];

const collections = [
  { title: "استایل روزمره", description: "پایه‌های راحت برای ترکیب روزانه", href: "/looks/daily-style", image: "/jeans.jpg", categories: ["jeans", "t-shirts", "shoes"] },
  { title: "لایه‌های ماندگار", description: "ترکیب کت و شلوار برای روزهای خنک", href: "/looks/layers", image: "/jackets.jpg", categories: ["jackets", "jeans", "t-shirts"] },
  { title: "جزئیات تکمیل‌کننده", description: "اکسسوری‌های ساده برای تکمیل ظاهر", href: "/looks/details", image: "/bags.jpg", categories: ["bags", "glasses", "shoes"] },
];

const benefits = [
  { icon: Truck, title: "ارسال و تحویل", text: "هزینه و شرط ارسال رایگان را پیش از پرداخت بررسی کنید.", href: "/shipping-policy" },
  { icon: PackageCheck, title: "مرجوعی و تعویض", text: "وضعیت سیاست مرجوعی و راه هماهنگی پیش از خرید.", href: "/returns-policy" },
  { icon: ShieldCheck, title: "راهنما و پشتیبانی", text: "پاسخ پرسش‌های خرید و راه ارتباط رسمی فروشگاه.", href: "/support" },
];

const CampaignCountdown = ({ endsAt }) => {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, []);
  const remaining = now === null ? null : Math.max(0, new Date(endsAt).getTime() - now);
  const seconds = remaining === null ? 0 : Math.floor(remaining / 1000);
  const units = [
    [Math.floor(seconds / 86400), "روز"],
    [Math.floor((seconds % 86400) / 3600), "ساعت"],
    [Math.floor((seconds % 3600) / 60), "دقیقه"],
    [seconds % 60, "ثانیه"],
  ];
  const number = (value) => new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2, useGrouping: false }).format(value);
  return (
    <div dir="rtl" aria-label="زمان باقی‌مانده تا پایان پیشنهاد" className="flex flex-wrap items-center gap-2">
      {units.map(([value, label]) => (
        <span key={label} className="inline-flex min-w-[3.6rem] flex-col items-center rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-2 py-1.5">
          <strong className="text-base tabular-nums text-[var(--ui-text)]">{remaining === null ? "—" : number(value)}</strong>
          <span className="text-[10px] text-[var(--ui-muted)]">{label}</span>
        </span>
      ))}
    </div>
  );
};

const HomePage = () => {
  const pageRef = useRef(null);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [bestsellers, setBestsellers] = useState([]);
  const [bestsellersLoaded, setBestsellersLoaded] = useState(false);
  const [bestsellersError, setBestsellersError] = useState(false);
  const [newestLoaded, setNewestLoaded] = useState(false);
  const [newestError, setNewestError] = useState(false);
  const { categories: storeCategories, fetchCategories } = useCategoryStore();
  const categories = storeCategories.length
    ? storeCategories
        .filter((category) => !category.parentId && category.showInNavigation !== false)
        .map((category) => ({
          href: "/category/" + category.slug,
          name: category.name?.fa || category.name?.en || category.slug,
          imageUrl: category.image || "/tshirts.jpg",
        }))
    : legacyCategoryCards;
  const {
    fetchFeaturedProducts,
    featuredProducts,
    fetchNewestProducts,
    newestProducts,

  } = useProductStore();

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const context = gsap.context(() => {
      const hero = page.querySelector("[data-gsap-hero]");
      if (hero) {
        gsap.fromTo(hero, { autoAlpha: 0, y: 18 }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          clearProps: "opacity,visibility,transform",
        });
      }

      page.querySelectorAll("[data-gsap-reveal]").forEach((section) => {
        gsap.fromTo(section, { autoAlpha: 0, y: 20 }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          clearProps: "opacity,visibility,transform",
          scrollTrigger: {
            trigger: section,
            start: "top 88%",
            once: true,
          },
        });
      });
    }, page);

    return () => context.revert();
  }, []);

  useEffect(() => {
    let active = true;
    fetchFeaturedProducts();
    fetchCategories();
    Promise.resolve(fetchNewestProducts())
      .then((succeeded) => { if (active) setNewestError(succeeded === false); })
      .finally(() => { if (active) setNewestLoaded(true); });
    const loadCampaigns = async () => {
      // The currently deployed API returns campaign product IDs. Resolve a
      // small, deduplicated set through its existing public product endpoint
      // instead of relying on the newer includeProducts query enhancement.
      const { data } = await axios.get("/campaigns");
      const campaignList = Array.isArray(data.campaigns) ? data.campaigns : [];
      const productIds = getCampaignProductIds(campaignList);
      const productResults = await Promise.allSettled(
        productIds.map((productId) => axios.get(`/products/${productId}`))
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
    axios.get("/products/bestsellers?limit=8")
      .then(({ data }) => {
        if (!active) return;
        setBestsellers(Array.isArray(data.products) ? data.products : []);
        setBestsellersError(false);
      })
      .catch((error) => {
        if (!active) return;
        setBestsellersError(true);
        console.error("Could not load bestsellers:", error.message);
      })
      .finally(() => { if (active) setBestsellersLoaded(true); });
    return () => { active = false; };
  }, [fetchFeaturedProducts, fetchNewestProducts, fetchCategories]);

  const catalogProducts = [...featuredProducts, ...bestsellers, ...newestProducts]
    .filter((product, index, products) => product?._id && products.findIndex((item) => item?._id === product._id) === index);

  // Active campaigns with an image and local destination rotate through the
  // leading home banner. The existing campaign manager controls their order.
  const heroCampaigns = campaigns.filter((campaign) => {
    const hasTitle = typeof campaign?.title === "string" && campaign.title.trim();
    const hasImage = typeof campaign?.image === "string" && campaign.image.trim();
    const href = campaign?.href;
    return hasTitle && hasImage && typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
  });
  const heroCampaign = heroCampaigns.length ? heroCampaigns[heroSlideIndex % heroCampaigns.length] : undefined;
  useEffect(() => {
    if (heroCampaigns.length < 2) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const intervalId = window.setInterval(() => {
      setHeroSlideIndex((index) => (index + 1) % heroCampaigns.length);
    }, 6200);
    return () => window.clearInterval(intervalId);
  }, [heroCampaigns.length]);
  const showPreviousCampaign = () => setHeroSlideIndex((index) => (index - 1 + heroCampaigns.length) % heroCampaigns.length);
  const showNextCampaign = () => setHeroSlideIndex((index) => (index + 1) % heroCampaigns.length);
  const heroProduct = catalogProducts.find((product) =>
    typeof product?.image === "string" &&
    product.image.trim() &&
    !(typeof product.stock === "number" && product.stock <= 0)
  );
  const heroImage = heroCampaign?.image || heroProduct?.image || "/jackets.jpg";
  useEffect(() => setHeroImageFailed(false), [heroImage]);
  const secondaryCampaigns = campaigns.filter(
    (campaign) => !heroCampaign || campaign._id !== heroCampaign._id
  );
  const campaignProducts = campaigns
    .flatMap((campaign) => Array.isArray(campaign.productIds) ? campaign.productIds : [])
    .filter((product) => product && typeof product === "object" && product._id && product.isActive !== false)
    .filter((product, index, products) =>
      products.findIndex((item) => String(item._id) === String(product._id)) === index
    );
  const closestEndingCampaign = campaigns
    .filter((campaign) => Number.isFinite(new Date(campaign.endsAt).getTime()))
    .sort((left, right) => new Date(left.endsAt).getTime() - new Date(right.endsAt).getTime())[0];

  const retryBestsellers = async () => {
    setBestsellersLoaded(false);
    setBestsellersError(false);
    try {
      const { data } = await axios.get("/products/bestsellers?limit=8");
      setBestsellers(Array.isArray(data.products) ? data.products : []);
    } catch (error) {
      setBestsellersError(true);
      console.error("Could not retry bestsellers:", error.message);
    } finally {
      setBestsellersLoaded(true);
    }
  };

  const retryNewest = async () => {
    setNewestLoaded(false);
    setNewestError(false);
    try {
      const succeeded = await fetchNewestProducts();
      setNewestError(succeeded === false);
    } catch {
      setNewestError(true);
    } finally {
      setNewestLoaded(true);
    }
  };

  const sampleProductsForLook = (collection) => {
    const used = new Set();
    return collection.categories
      .map((category) => catalogProducts.find((product) => product.category === category && !used.has(product._id)))
      .filter((product) => {
        if (!product) return false;
        used.add(product._id);
        return true;
      })
      .slice(0, 3);
  };

  return (
    <main ref={pageRef} dir="rtl" className="min-h-screen overflow-hidden bg-canvas text-ink">
      
      <div className="mx-auto max-w-[1920px] px-3 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8 2xl:px-12">
        <section data-gsap-hero className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface-muted">
          <div className="grid grid-cols-1 items-stretch lg:min-h-[540px] lg:grid-cols-2">
            <div className="relative order-1 min-h-[250px] overflow-hidden sm:min-h-[320px] lg:order-2 lg:min-h-[540px]">
              {!heroImageFailed ? (
                <img
                  src={heroImage}
                  alt={heroCampaign ? heroCampaign.title : heroProduct?.name || "پوشاک تیک بوتیک"}
                  className={`absolute inset-0 h-full w-full ${heroCampaign ? "object-cover object-center" : "object-contain object-center p-6 sm:p-8 lg:p-10"}`}
                  fetchPriority="high"
                  onError={() => setHeroImageFailed(true)}
                />
              ) : (
                <div role="img" aria-label="تصویر پیشنهادی در دسترس نیست" className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-border via-surface-raised to-surface-raised p-8 text-center text-muted">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border border-border-strong bg-surface/45 font-serif text-4xl" aria-hidden="true">T</span>
                  <span className="max-w-xs text-sm font-medium leading-6">برای مشاهده محصولات پیشنهادی، مجموعه تیک بوتیک را ببینید.</span>
                </div>
              )}
              <div className={`absolute inset-0 ${heroCampaign ? "bg-gradient-to-l from-strong/30 via-transparent to-transparent" : "bg-gradient-to-t from-surface-muted/20 via-transparent to-transparent"}`} />
              {heroCampaign ? (
                <div className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full border border-white/60 bg-surface/80 px-4 py-2 text-xs font-semibold text-ink shadow-sm backdrop-blur-sm">
                  <Sparkles size={14} aria-hidden="true" />
                  پیشنهاد فعال فروشگاه
                </div>
              ) : heroProduct ? (
                <Link
                  to={`/product/${heroProduct._id}`}
                  className="absolute bottom-4 right-4 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-white/70 bg-surface/90 p-3 text-ink shadow-lg backdrop-blur-md transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:bottom-5 sm:right-5 sm:p-4"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-medium text-brand sm:text-xs">از محصولات تیک بوتیک</span>
                    <span className="mt-1 block line-clamp-1 text-xs font-semibold sm:text-sm">{heroProduct.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-ink sm:text-sm">{formatPrice(heroProduct.price)}</span>
                </Link>
              ) : (
                <div className="absolute bottom-5 right-5 rounded-full border border-white/60 bg-surface/75 px-4 py-2 text-xs font-medium text-ink backdrop-blur-sm">
                  سادگی با جلوه‌ای خاص
                </div>
              )}
              {heroCampaigns.length > 1 && (
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full border border-white/30 bg-[var(--ui-strong-surface)]/75 px-2.5 py-2 text-white shadow-lg backdrop-blur-md" aria-label="اسلایدر پیشنهادهای ویژه">
                  <button type="button" onClick={showPreviousCampaign} aria-label="پیشنهاد قبلی" className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><ChevronRight size={17} aria-hidden="true" /></button>
                  <div className="flex items-center gap-1.5">
                    {heroCampaigns.map((campaign, index) => (
                      <button key={campaign._id || index} type="button" onClick={() => setHeroSlideIndex(index)} aria-label={"نمایش پیشنهاد " + (index + 1)} aria-pressed={heroSlideIndex === index} className={"h-2 rounded-full transition-all " + (heroSlideIndex === index ? "w-7 bg-white" : "w-2 bg-white/55 hover:bg-white/80")} />
                    ))}
                  </div>
                  <button type="button" onClick={showNextCampaign} aria-label="پیشنهاد بعدی" className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><ChevronLeft size={17} aria-hidden="true" /></button>
                </div>
              )}
            </div>
            <div className="relative z-10 order-2 min-w-0 px-5 py-8 sm:px-10 sm:py-12 lg:order-1 lg:px-12 lg:py-16 xl:px-14 xl:py-20">
              <p className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand sm:mb-5 sm:text-xs sm:tracking-[0.22em]">
                <Sparkles size={15} aria-hidden="true" />
                {heroCampaign ? "پیشنهاد ویژه تیک بوتیک" : "انتخاب‌های هماهنگ برای هر روز"}
              </p>
              <h1 className="max-w-xl font-serif text-3xl font-medium leading-[1.12] tracking-tight text-ink sm:text-5xl sm:leading-[1.08] xl:text-6xl">
                {heroCampaign ? heroCampaign.title : (
                  <>استایلی که برای تو <br className="hidden sm:block" /><span className="italic text-brand">ساخته شده.</span></>
                )}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted sm:mt-6 sm:text-lg sm:leading-7">
                {heroCampaign
                  ? heroCampaign.description || "این پیشنهاد را ببینید و محصولات مرتبط را انتخاب کنید."
                  : "از میان پوشاک و اکسسوری‌های فروشگاه، انتخابی هماهنگ با سبک خودت پیدا کن."}
              </p>
              <div className="mt-6 flex flex-col items-stretch gap-2 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                {heroCampaign ? (
                  <Link to={getCampaignPath(heroCampaign)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-strong px-6 py-3 text-sm font-semibold text-white transition hover:bg-strong-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-auto">
                    مشاهده پیشنهاد<ArrowLeft size={17} aria-hidden="true" />
                  </Link>
                ) : (
                  <Link to="/shop" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-strong px-6 py-3 text-sm font-semibold text-white transition hover:bg-strong-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-auto">
                    مشاهده محصولات<ArrowLeft size={17} aria-hidden="true" />
                  </Link>
                )}
                <a href="#shop-by-category" className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-border-strong px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-auto">
                  {heroCampaign ? "خرید بر اساس دسته‌بندی" : "دسته‌بندی‌ها"}
                </a>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-border-strong pt-4 text-[11px] text-muted sm:mt-8 sm:gap-x-6 sm:gap-y-3 sm:pt-5 sm:text-sm">
                <span className="inline-flex items-center gap-2"><Leaf size={16} aria-hidden="true" />انتخاب‌های روزمره</span>
                <span className="inline-flex items-center gap-2"><PackageCheck size={16} aria-hidden="true" />اطلاعات روشن محصول</span>
              </div>
            </div>
          </div>
        </section>

        <section id="shop-by-category" data-gsap-reveal className="scroll-mt-28 pt-12 sm:pt-16 lg:pt-20">
          <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand sm:mb-2 sm:text-xs sm:tracking-[0.2em]">انتخاب مناسب شما</p>
              <h2 className="font-serif text-2xl font-medium tracking-tight text-ink sm:text-4xl">خرید بر اساس دسته‌بندی</h2>
              <p className="mt-2 max-w-md text-xs leading-5 text-muted sm:text-sm sm:leading-6">دسته‌بندی موردنظرتان را انتخاب کنید.</p>
            </div>
          </div>
          <div
            aria-label="دسته‌بندی‌های فروشگاه"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5"
          >
            {categories.map((category) => (
              <CategoryItem key={category.name} category={category} />
            ))}
          </div>
        </section>

        {(secondaryCampaigns.length > 0 || campaignProducts.length > 0 || campaigns.length > 0) && (
<section id="special-offers" aria-labelledby="campaigns-heading" className="pt-9 sm:pt-12">
            <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6 sm:gap-4">
              <div><p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand sm:mb-2 sm:text-xs sm:tracking-[0.2em]">ویژه و محدود</p><h2 id="campaigns-heading" className="font-serif text-2xl font-medium sm:text-3xl">شگفت‌انگیزها و پیشنهادهای ویژه</h2></div>
              <Link to="/campaigns" className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-border-strong px-3 text-xs font-semibold text-brand transition hover:border-ink hover:text-ink sm:border-0 sm:px-0 sm:text-sm">همه پیشنهادها<ArrowLeft size={15} aria-hidden="true" /></Link>
            </div>
            {closestEndingCampaign && (
              <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <p className="text-xs font-semibold text-[var(--ui-accent)]">فرصت باقی‌مانده</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ui-text)]">{closestEndingCampaign.title}</p>
                </div>
                <CampaignCountdown endsAt={closestEndingCampaign.endsAt} />
              </div>
            )}
            {campaignProducts.length > 0 && (
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-label="محصولات منتخب کمپین‌ها">
                {campaignProducts.map((product) => <ProductCard key={product._id} product={product} />)}
              </div>
            )}
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
              {secondaryCampaigns.map((campaign) => (
                <Link to={getCampaignPath(campaign)} key={campaign._id} className="group relative isolate flex min-h-[210px] min-w-[88%] snap-center overflow-hidden rounded-2xl border border-border bg-surface-muted p-5 transition hover:border-border-strong sm:min-h-[230px] sm:min-w-[48%] sm:p-6 xl:min-w-[32%]">
                  {campaign.image && <img src={campaign.image} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-l from-strong/85 via-strong/55 to-transparent" />
                  <div className="my-auto max-w-[80%] text-white">
                    <p className="text-xs font-semibold tracking-[0.16em] text-white/75">پیشنهاد ویژه</p>
                    <h3 className="mt-3 font-serif text-2xl font-medium">{campaign.title}</h3>
                    {campaign.description && <p className="mt-2 text-sm leading-6 text-white/85">{campaign.description}</p>}
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">مشاهده پیشنهاد<ArrowLeft size={16} aria-hidden="true" /></span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {bestsellersLoaded && (bestsellers.length > 0 || bestsellersError) && (
          <section className="pt-12 sm:pt-16 lg:pt-20" aria-labelledby="bestsellers-heading">
            <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
              <div>
                <p className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand sm:mb-2 sm:text-xs sm:tracking-[0.2em]"><Sparkles size={14} aria-hidden="true" />محبوب بر اساس سفارش‌های تکمیل‌شده</p>
                <h2 id="bestsellers-heading" className="font-serif text-2xl font-medium tracking-tight sm:text-4xl">پرفروش‌های فروشگاه</h2>
                <p className="mt-2 text-xs leading-5 text-muted sm:text-sm sm:leading-6">بر اساس تعداد کالا در سفارش‌هایی که پرداختشان تأیید شده است.</p>
              </div>
              <Link to="/bestsellers" className="inline-flex min-h-10 shrink-0 items-center gap-2 self-start rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-ink transition hover:border-ink sm:self-auto sm:text-sm">
                مشاهده همه محصولات<ArrowLeft size={15} aria-hidden="true" />
              </Link>
            </div>
            {bestsellersError ? (
              <div role="alert" className="rounded-2xl border border-border bg-surface px-5 py-8 text-center sm:py-10">
                <p className="text-sm font-semibold text-ink-strong">پرفروش‌ها بارگذاری نشدند.</p>
                <p className="mt-1 text-xs leading-5 text-muted-soft">اتصال را بررسی کنید و دوباره تلاش کنید.</p>
                <button type="button" onClick={retryBestsellers} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-strong px-4 py-2 text-sm font-semibold text-white transition hover:bg-strong-hover">تلاش دوباره</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {bestsellers.slice(0, 8).map((product) => <ProductCard key={product._id} product={product} />)}
              </div>
            )}
          </section>
        )}

        <section data-gsap-reveal className="pt-12 sm:pt-16 lg:pt-20" aria-labelledby="newest-products-heading">
          <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand sm:mb-2 sm:text-xs sm:tracking-[0.2em]">
                <Sparkles size={14} aria-hidden="true" />
                تازه به فروشگاه اضافه شده
              </p>
              <h2 id="newest-products-heading" className="font-serif text-2xl font-medium tracking-tight sm:text-4xl">تازه‌واردها</h2>
              <p className="mt-2 text-xs leading-5 text-muted sm:text-sm sm:leading-6">محصولات جدید را با کشیدن به چپ و راست مرور کنید.</p>
            </div>
            <Link to="/new-arrivals" className="inline-flex min-h-10 shrink-0 items-center gap-2 self-start rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-ink transition hover:border-ink sm:self-auto sm:text-sm">
              مشاهده همه
              <ArrowLeft size={15} aria-hidden="true" />
            </Link>
          </div>

          {!newestLoaded ? (
            <div aria-label="در حال بارگذاری محصولات تازه" className="flex gap-3 overflow-hidden sm:gap-4">
              {[0, 1, 2].map((item) => (
                <div key={item} className="min-w-[68%] shrink-0 animate-pulse overflow-hidden rounded-2xl border border-border bg-surface sm:min-w-[36%] lg:min-w-[24%]">
                  <div className="aspect-[4/5] bg-surface-muted" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 rounded-full bg-surface-muted" />
                    <div className="h-4 w-1/2 rounded-full bg-surface-muted" />
                    <div className="h-10 rounded-full bg-surface-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : newestError ? (
            <div role="alert" className="rounded-2xl border border-border bg-surface px-5 py-8 text-center sm:py-10">
              <PackageCheck size={24} className="mx-auto text-brand" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-ink-strong">تازه‌واردها بارگذاری نشدند.</p>
              <p className="mt-1 text-xs leading-5 text-muted-soft">برای دریافت تازه‌ترین محصولات دوباره تلاش کنید.</p>
              <button type="button" onClick={retryNewest} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-strong px-4 py-2 text-sm font-semibold text-white transition hover:bg-strong-hover">تلاش دوباره</button>
            </div>
          ) : newestProducts.length > 0 ? (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
              {newestProducts.slice(0, 8).map((product) => (
                <div key={product._id} className="w-[min(68%,17rem)] min-w-0 shrink-0 snap-start sm:w-[min(36%,18rem)] lg:w-[min(24%,19rem)]">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface px-5 py-8 text-center sm:py-10">
              <PackageCheck size={24} className="mx-auto text-brand" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-ink-strong">محصول تازه‌ای برای نمایش نیست.</p>
              <p className="mt-1 text-xs text-muted-soft">بعداً دوباره سر بزنید یا محصولات فروشگاه را ببینید.</p>
              <Link to="/shop" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-strong px-4 py-2 text-sm font-semibold text-white transition hover:bg-strong-hover">رفتن به فروشگاه</Link>
            </div>
          )}
        </section>

        {featuredProducts.length > 0 && <section className="mt-12 border-t border-border pt-8 sm:mt-16 sm:pt-12"><FeaturedProducts featuredProducts={featuredProducts} /></section>}

        <section data-gsap-reveal className="pt-12 sm:pt-16 lg:pt-20" aria-labelledby="collections-heading">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand">انتخاب‌های هماهنگ</p><h2 id="collections-heading" className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">مجموعه‌های پیشنهادی</h2></div>
            <p className="max-w-md text-sm leading-6 text-muted">ترکیب‌های ساده برای شروع یک انتخاب تازه.</p>
          </div>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-4">
            {collections.map((collection) => {
              const lookProducts = sampleProductsForLook(collection);
              return (
                <Link to={collection.href} key={collection.title} className="group relative isolate flex min-h-[260px] min-w-[84%] snap-center items-end overflow-hidden rounded-2xl bg-surface-muted p-4 sm:min-h-[290px] sm:p-5 md:min-w-0">
                  <img src={collection.image} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-strong/95 via-strong/65 to-strong/10" />
                  <div className="w-full text-white">
                    <h3 className="font-serif text-2xl font-medium">{collection.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/85">{collection.description}</p>
                    {lookProducts.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2" aria-label="نمونه‌هایی از کالاهای این استایل">
                        {lookProducts.slice(0, 2).map((product) => (
                          <span key={product._id} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/25 bg-surface/95 p-2 text-ink shadow-sm backdrop-blur-sm">
                            {product.image ? <img src={product.image} alt="" loading="lazy" className="h-12 w-10 shrink-0 rounded-lg bg-surface-muted object-cover" /> : <span className="h-12 w-10 shrink-0 rounded-lg bg-surface-muted" />}
                            <span className="min-w-0"><span className="block line-clamp-2 text-[11px] font-semibold leading-4">{product.name}</span><span className="mt-1 block text-[10px] tabular-nums text-brand">{formatPrice(product.price)}</span></span>
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">مشاهده استایل<ArrowLeft size={16} aria-hidden="true" /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section data-gsap-reveal className="mt-8 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-3 sm:gap-5 sm:p-6" aria-label="اطلاعات پیش از خرید">
          {benefits.map(({ icon: Icon, title, text, href }) => (
            <Link key={title} to={href} className="group flex items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-canvas sm:px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand"><Icon size={20} aria-hidden="true" /></span>
              <div className="min-w-0"><h2 className="text-sm font-semibold text-ink">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-soft">{text}</p><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">بیشتر بدانید<ArrowLeft size={13} aria-hidden="true" /></span></div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
};

export default HomePage;
