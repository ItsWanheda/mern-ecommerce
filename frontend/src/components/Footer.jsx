import { ArrowLeft, CheckCircle2, ShoppingBag, Truck } from "lucide-react";
import { Link } from "react-router-dom";

const footerCategories = [["jeans","شلوار جین"],["t-shirts","تی‌شرت"],["shoes","کفش"],["jackets","کت و کاپشن"],["bags","کیف و اکسسوری"]];
const Footer = () => (
  <footer dir="rtl" className="border-t border-[#e4e0d8] bg-[#eeece5] text-[#252722]">
    <div className="mx-auto grid max-w-7xl gap-9 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-12 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr] lg:gap-12 lg:px-8">
      <div>
        <Link to="/" aria-label="صفحه اصلی فروشگاه" className="inline-flex items-center font-serif text-2xl font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#68745f]">فروشگاه<span className="mr-1 text-[#68745f]">.</span></Link>
        <p className="mt-4 max-w-xs text-sm leading-7 text-[#55584f]">انتخاب‌هایی سنجیده برای استایل روزمره؛ تجربه‌ای ساده از کشف محصول تا ثبت سفارش.</p>
        <Link to="/shop" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#252722] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]">شروع خرید <ArrowLeft size={16} aria-hidden="true" /></Link>
      </div>
      <nav aria-label="پیوندهای فروشگاه"><h2 className="text-sm font-bold">فروشگاه</h2><ul className="mt-4 space-y-3 text-sm text-[#55584f]"><li><Link className="transition hover:text-[#252722]" to="/">صفحه اصلی</Link></li><li><Link className="transition hover:text-[#252722]" to="/shop">همه محصولات</Link></li><li><Link className="transition hover:text-[#252722]" to="/shop?sort=newest">تازه‌واردها</Link></li><li><Link className="transition hover:text-[#252722]" to="/#special-offers">پیشنهادهای ویژه</Link></li></ul></nav>
      <nav aria-label="دسته‌بندی‌های محبوب"><h2 className="text-sm font-bold">دسته‌بندی‌های محبوب</h2><ul className="mt-4 space-y-3 text-sm text-[#55584f]">{footerCategories.map(([slug,label])=><li key={slug}><Link className="transition hover:text-[#252722]" to={`/category/${slug}`}>{label}</Link></li>)}</ul></nav>
      <div><h2 className="text-sm font-bold">تجربه خرید شفاف</h2><div className="mt-4 space-y-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e0e5d9] text-[#536049]"><CheckCircle2 size={18} aria-hidden="true" /></span><p className="pt-1 text-sm leading-6 text-[#55584f]">وضعیت موجودی پیش از خرید بررسی می‌شود.</p></div><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e0e5d9] text-[#536049]"><Truck size={18} aria-hidden="true" /></span><p className="pt-1 text-sm leading-6 text-[#55584f]">هزینه ارسال در خلاصه سفارش نمایش داده می‌شود.</p></div><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e0e5d9] text-[#536049]"><ShoppingBag size={18} aria-hidden="true" /></span><p className="pt-1 text-sm leading-6 text-[#55584f]">مبلغ سفارش پیش از انتقال به درگاه قابل مشاهده است.</p></div></div></div>
    </div>
    <div className="border-t border-[#d5d0c5]"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-[#55584f] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p>© {new Date().getFullYear()} فروشگاه. تمامی حقوق محفوظ است.</p><p>طراحی‌شده برای تجربه‌ای ساده، روشن و قابل اعتماد.</p></div></div>
  </footer>
);
export default Footer;
