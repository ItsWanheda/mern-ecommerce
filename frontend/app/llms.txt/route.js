import { getStorefrontSeoContext } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function GET() {
  let canonical = "";
  try {
    canonical = (await getStorefrontSeoContext()).canonical;
  } catch {
    // A preview or local environment may not have a verified public origin.
  }

  const url = (path) => canonical ? canonical + path : path;
  const content = [
    "# تیک بوتیک",
    "> فروشگاه آنلاین پوشاک و اکسسوری با محتوای فارسی و تجربه خرید راست‌به‌چپ.",
    "",
    "## درباره فروشگاه",
    "تیک بوتیک مجموعه‌ای از پوشاک و اکسسوری را برای مرور، مقایسه و خرید آنلاین ارائه می‌کند. اطلاعات هر کالا، از جمله قیمت، تصاویر، ویژگی‌ها و موجودی، باید از صفحه همان محصول بررسی شود؛ داده‌های کاتالوگ ممکن است تغییر کنند.",
    "",
    "## صفحات اصلی",
    "- [صفحه اصلی](" + url("/") + "): معرفی فروشگاه و پیشنهادهای منتخب.",
    "- [فروشگاه](" + url("/shop") + "): جست‌وجو و مرور محصولات.",
    "- [دسته‌بندی‌ها](" + url("/categories") + "): ساختار دسته‌بندی‌های محصولات.",
    "- [تازه‌واردها](" + url("/new-arrivals") + "): محصولات تازه اضافه‌شده.",
    "- [پرفروش‌ها](" + url("/bestsellers") + "): محصولات پرفروش.",
    "- [محصولات منتخب](" + url("/featured-products") + "): گزیده محصولات فروشگاه.",
    "- [کمپین‌ها](" + url("/campaigns") + "): پیشنهادها و کمپین‌های فعال.",
    "",
    "## راهنما و سیاست‌ها",
    "- [پشتیبانی](" + url("/support") + ")",
    "- [سؤالات متداول](" + url("/faq") + ")",
    "- [روش ارسال](" + url("/shipping-policy") + ")",
    "- [مرجوعی و تعویض](" + url("/returns-policy") + ")",
    "- [حریم خصوصی](" + url("/privacy-policy") + ")",
    "- [شرایط استفاده](" + url("/terms-of-use") + ")",
    "",
    "## داده‌های قابل خزش",
    "- [robots.txt](" + url("/robots.txt") + ")",
    "- [نقشه سایت XML](" + url("/sitemap.xml") + ")",
    "",
    "## نکات صحت اطلاعات",
    "- شناسه محصول در URL صفحه محصول پایدار است؛ برای ارجاع به کالا از URL همان محصول استفاده کنید.",
    "- قیمت و موجودی را از صفحه زنده محصول بخوانید و اطلاعات ذخیره‌شده یا قدیمی را قطعی فرض نکنید.",
    "- قیمت نمایشی فروشگاه بر حسب تومان است. در داده ساختاریافته Offer، واحد پول استاندارد IRR و تبدیل تومان به ریال اعمال می‌شود.",
    "- محتوای مرجع فروشگاه فارسی است؛ نام و توضیح محصولات باید بر اساس اطلاعات ثبت‌شده در همان صفحه نقل شود.",
    "",
  ].join("\n");

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      ...(canonical ? {} : { "X-Robots-Tag": "noindex, nofollow" }),
    },
  });
}
