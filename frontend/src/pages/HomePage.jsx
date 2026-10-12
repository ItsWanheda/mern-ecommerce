import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Leaf, PackageCheck, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "../lib/axios";
import CategoryItem from "../components/CategoryItem";
import ProductCard from "../components/ProductCard";
import { useProductStore } from "../stores/useProductStore";
import FeaturedProducts from "../components/FeaturedProducts";

const categories = [
  { href: "/category/jeans", name: "شلوار جین", imageUrl: "/jeans.jpg" },
  { href: "/category/t-shirts", name: "تی‌شرت", imageUrl: "/tshirts.jpg" },
  { href: "/category/shoes", name: "کفش", imageUrl: "/shoes.jpg" },
  { href: "/category/glasses", name: "عینک", imageUrl: "/glasses.png" },
  { href: "/category/jackets", name: "کاپشن و کت", imageUrl: "/jackets.jpg" },
  { href: "/category/suits", name: "کت‌وشلوار", imageUrl: "/suits.jpg" },
  { href: "/category/bags", name: "کیف", imageUrl: "/bags.jpg" },
];

const collections = [
  { title: "استایل روزمره", description: "انتخاب‌های راحت برای هر روز", href: "/category/jeans", image: "/jeans.jpg" },
  { title: "لایه‌های ماندگار", description: "کت و کاپشن برای روزهای خنک", href: "/category/jackets", image: "/jackets.jpg" },
  { title: "جزئیات تکمیل‌کننده", description: "اکسسوری‌هایی با انتخاب هوشمندانه", href: "/category/bags", image: "/bags.jpg" },
];

const benefits = [
  { icon: Truck, title: "ارسال شفاف", text: "هزینه ارسال پیش از پرداخت مشخص است." },
  { icon: ShieldCheck, title: "پرداخت تأییدشده", text: "نتیجه پرداخت در سمت سرور بررسی می‌شود." },
  { icon: PackageCheck, title: "موجودی به‌روز", text: "تعداد قابل سفارش پیش از خرید بررسی می‌شود." },
];

const HomePage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const {
    fetchFeaturedProducts,
    featuredProducts,
    fetchNewestProducts,
    newestProducts,
  } = useProductStore();

  useEffect(() => {
    fetchFeaturedProducts();
    fetchNewestProducts();
    let active = true;
    axios.get("/campaigns")
      .then(({ data }) => { if (active) setCampaigns(data.campaigns || []); })
      .catch((error) => console.error("Could not load campaigns:", error.message));
    return () => { active = false; };
  }, [fetchFeaturedProducts, fetchNewestProducts]);

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#f7f5f0] text-[#252722]">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <section className="relative isolate overflow-hidden rounded-2xl bg-[#e9e5dc]">
          <div className="grid grid-cols-1 items-stretch lg:min-h-[540px] lg:grid-cols-2">
            <div className="relative order-1 min-h-[280px] overflow-hidden lg:order-2 lg:min-h-[540px]">
              <img src="/jackets.jpg" alt="مدل‌های ماندگار کت و کاپشن را ببینید" className="absolute inset-0 h-full w-full object-cover object-center" fetchPriority="high" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#e9e5dc]/30 lg:bg-gradient-to-l lg:from-transparent lg:via-[#e9e5dc]/10 lg:to-[#e9e5dc]/30" />
              <div className="absolute bottom-5 right-5 rounded-full border border-white/60 bg-white/75 px-4 py-2 text-xs font-medium tracking-wide text-[#252722] backdrop-blur-sm">سادگی با جلوه‌ای خاص</div>
            </div>
            <div className="relative z-10 order-2 min-w-0 px-6 py-12 sm:px-10 lg:order-1 lg:px-12 lg:py-16 xl:px-14 xl:py-20">
              <p className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#68745f]"><Sparkles size={15} aria-hidden="true" />سبکی سنجیده، راحتی هر روز</p>
              <h1 className="max-w-xl font-serif text-4xl font-medium leading-[1.08] tracking-tight text-[#252722] sm:text-5xl xl:text-6xl">سبک خودت را پیدا کن.<br />همیشه <span className="italic text-[#68745f]">ماندگار.</span></h1>
              <p className="mt-6 max-w-md text-base leading-7 text-[#62645c] sm:text-lg">پوشاک و اکسسوری‌های کاربردی را ببینید؛ انتخاب‌هایی هماهنگ برای تمام فصل‌ها.</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/shop" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#252722] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]">مشاهده محصولات<ArrowLeft size={17} aria-hidden="true" /></Link>
                <a href="#shop-by-category" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#c7c3b9] px-6 py-3 text-sm font-semibold text-[#252722] transition hover:border-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]">دسته‌بندی‌ها</a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#d5d0c5] pt-5 text-xs text-[#62645c] sm:text-sm">
                <span className="inline-flex items-center gap-2"><Leaf size={16} aria-hidden="true" />انتخاب‌های روزمره</span>
                <span className="inline-flex items-center gap-2"><PackageCheck size={16} aria-hidden="true" />اطلاعات روشن محصول</span>
              </div>
            </div>
          </div>
        </section>

        {campaigns.length > 0 && (
          <section aria-labelledby="campaigns-heading" className="pt-10 sm:pt-12">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#68745f]">تازه در فروشگاه</p><h2 id="campaigns-heading" className="font-serif text-2xl font-medium sm:text-3xl">پیشنهادهای جاری</h2></div>
              <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-semibold text-[#68745f] hover:text-[#252722]">همه محصولات<ArrowLeft size={15} aria-hidden="true" /></Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {campaigns.map((campaign) => (
                <Link to={campaign.href} key={campaign._id} className="group relative isolate flex min-h-[190px] overflow-hidden rounded-2xl border border-[#e4e0d8] bg-[#e9e5dc] p-6 transition hover:border-[#c7c3b9]">
                  {campaign.image && <img src={campaign.image} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-l from-[#252722]/85 via-[#252722]/55 to-transparent" />
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

        <section className="mt-10 grid gap-3 rounded-2xl border border-[#e4e0d8] bg-[#fffefa] p-4 sm:grid-cols-3 sm:gap-5 sm:p-6">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 px-2 py-2 sm:px-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e9e5dc] text-[#68745f]"><Icon size={20} aria-hidden="true" /></span>
              <div><h2 className="text-sm font-semibold text-[#252722]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#77786f]">{text}</p></div>
            </div>
          ))}
        </section>

        <section id="shop-by-category" className="scroll-mt-28 pt-16 sm:pt-20">
          <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#68745f]">انتخاب مناسب شما</p><h2 className="font-serif text-3xl font-medium tracking-tight text-[#252722] sm:text-4xl">خرید بر اساس دسته‌بندی</h2></div>
            <p className="max-w-md text-sm leading-6 text-[#62645c] sm:text-right">از آیتم‌های موردنیازتان شروع کنید و استایلی متناسب با خودتان بسازید.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => <CategoryItem category={category} key={category.name} />)}
          </div>
        </section>

        <section className="pt-16 sm:pt-20" aria-labelledby="collections-heading">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#68745f]">انتخاب‌های هماهنگ</p><h2 id="collections-heading" className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">مجموعه‌های پیشنهادی</h2></div>
            <p className="max-w-md text-sm leading-6 text-[#62645c]">ترکیب‌های ساده برای شروع یک انتخاب تازه.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {collections.map((collection) => (
              <Link to={collection.href} key={collection.title} className="group relative isolate flex min-h-[250px] items-end overflow-hidden rounded-2xl bg-[#e9e5dc] p-6">
                <img src={collection.image} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#252722]/85 via-[#252722]/15 to-transparent" />
                <div className="text-white"><h3 className="font-serif text-2xl font-medium">{collection.title}</h3><p className="mt-2 text-sm text-white/85">{collection.description}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">مشاهده مجموعه<ArrowLeft size={16} aria-hidden="true" /></span></div>
              </Link>
            ))}
          </div>
        </section>

        {newestProducts.length > 0 && (
          <section className="pt-16 sm:pt-20" aria-labelledby="newest-products-heading">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
              <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#68745f]">به‌تازگی اضافه‌شده</p><h2 id="newest-products-heading" className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">جدیدترین محصولات</h2></div>
              <Link to="/shop?sort=newest" className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-[#d5d0c5] px-4 py-2 text-sm font-semibold text-[#252722] transition hover:border-[#252722] sm:self-auto">مشاهده همه<ArrowLeft size={15} aria-hidden="true" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {newestProducts.slice(0, 8).map((product) => <ProductCard key={product._id} product={product} />)}
            </div>
          </section>
        )}

        {featuredProducts.length > 0 && <section className="mt-12 border-t border-[#e4e0d8] pt-8 sm:mt-16 sm:pt-12"><FeaturedProducts featuredProducts={featuredProducts} /></section>}
      </div>
    </main>
  );
};

export default HomePage;
