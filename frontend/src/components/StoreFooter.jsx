import { useState } from "react";
import { ArrowLeft, CheckCircle2, Heart, Instagram, Mail, Send, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { formatIranianYear } from "../lib/iranian-date";

const supportEmail = import.meta.env.VITE_STORE_SUPPORT_EMAIL || "";
const enamadImage = import.meta.env.VITE_ENAMAD_SEAL_IMAGE_URL || "https://trustseal.enamad.ir/Content/Images/Star2/81.png";
const enamadVerificationUrl = import.meta.env.VITE_ENAMAD_SEAL_LINK_URL || "";
const socialProfiles = [
  { id: "instagram", label: "اینستاگرام", href: import.meta.env.VITE_STORE_INSTAGRAM_URL || "", Icon: Instagram },
  { id: "telegram", label: "تلگرام", href: import.meta.env.VITE_STORE_TELEGRAM_URL || "", Icon: Send },
  { id: "x", label: "ایکس (X)", href: import.meta.env.VITE_STORE_X_URL || "", Icon: null },
];

const StoreFooter = () => {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");

  const subscribe = async (event) => {
    event.preventDefault();
    setResult("");
    if (!consent) {
      toast.error("برای ثبت درخواست، رضایت خود را تأیید کنید.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await axios.post("/newsletter/subscribe", { email, consent: true });
      setResult(response.data?.message || "درخواست شما ثبت شد.");
      setEmail("");
      setConsent(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "ثبت درخواست خبرنامه انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer dir="rtl" className="mt-12 border-t border-border bg-surface-raised text-ink sm:mt-16">
      <div className="mx-auto grid max-w-[1920px] gap-9 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1.3fr] lg:gap-8 lg:px-8 2xl:px-12">
        <section>
          <Link to="/" className="inline-flex rounded-sm font-serif text-2xl font-semibold tracking-tight transition hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">تیک بوتیک</Link>
          <p className="mt-3 max-w-xs text-sm leading-7 text-muted">انتخاب‌های سنجیده برای استایل روزمره؛ با اطلاعات روشن درباره محصول، موجودی و هزینه ارسال.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/shop" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-strong px-4 py-2 text-xs font-semibold text-white transition hover:bg-strong-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">شروع خرید <ArrowLeft size={14} aria-hidden="true" /></Link>
            <Link to="/wishlist" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-strong bg-surface px-4 py-2 text-xs font-semibold text-ink-strong transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><Heart size={14} aria-hidden="true" />علاقه‌مندی‌ها</Link>
          </div>
          <div className="mt-5 border-t border-border-strong pt-4">
            <p className="text-xs font-semibold text-ink-strong">ما را دنبال کنید</p>
            <div className="mt-2 flex items-center gap-2" aria-label="شبکه‌های اجتماعی تیک بوتیک">
              {socialProfiles.map(({ id, label, href, Icon }) => {
                const icon = Icon ? <Icon size={18} aria-hidden="true" /> : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.39L5.58 22H2.45l7.25-8.29L1.8 2h6.4l4.43 6.77L18.9 2Zm-1.1 18h1.73L7.28 3.89H5.42L17.8 20Z" />
                  </svg>
                );
                return href ? (
                  <a key={id} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface text-ink-strong transition hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                    {icon}
                  </a>
                ) : (
                  <span key={id} title={"برای فعال‌سازی، نشانی " + label + " را در تنظیمات سایت وارد کنید."} aria-label={label + " (نشانی تنظیم نشده)"}
                    className="inline-flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full border border-border-strong bg-surface/50 text-muted-soft">
                    {icon}
                  </span>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted-soft">پیوندهای شبکه‌های اجتماعی از تنظیمات سایت خوانده می‌شوند.</p>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-border-strong bg-surface p-3">
              {enamadVerificationUrl ? (
                <a href={enamadVerificationUrl} target="_blank" rel="noopener noreferrer" aria-label="استعلام نماد اعتماد الکترونیکی تیک بوتیک"
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-surface p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                  <img src={enamadImage} alt="نماد اعتماد الکترونیکی" loading="lazy" referrerPolicy="no-referrer" className="h-16 w-16 object-contain" />
                </a>
              ) : (
                <span aria-label="تصویر عمومی نماد اعتماد الکترونیکی؛ لینک اختصاصی اعتبارسنجی هنوز تنظیم نشده است"
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-surface p-1">
                  <img src={enamadImage} alt="تصویر نماد اعتماد الکترونیکی" loading="lazy" referrerPolicy="no-referrer" className="h-16 w-16 object-contain" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-strong">نماد اعتماد الکترونیکی</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-soft">
                  {enamadVerificationUrl
                    ? "برای مشاهده وضعیت و اطلاعات نماد، روی تصویر کلیک کنید."
                    : "برای اعتبارسنجی رسمی فروشگاه، لینک اختصاصی اینماد را در VITE_ENAMAD_SEAL_LINK_URL تنظیم کنید."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <nav aria-label="راهنمای خرید">
          <h2 className="text-sm font-bold">راهنمای خرید</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li><Link className="transition hover:text-ink" to="/shipping-policy">ارسال و تحویل</Link></li>
            <li><Link className="transition hover:text-ink" to="/returns-policy">مرجوعی و تعویض</Link></li>
            <li><Link className="transition hover:text-ink" to="/faq">سؤالات متداول</Link></li>
            <li><Link className="transition hover:text-ink" to="/support">پشتیبانی و تماس</Link></li>
          </ul>
        </nav>

        <nav aria-label="قوانین فروشگاه">
          <h2 className="text-sm font-bold">قوانین و اطلاعات</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li><Link className="transition hover:text-ink" to="/privacy-policy">حریم خصوصی</Link></li>
            <li><Link className="transition hover:text-ink" to="/terms-of-use">شرایط استفاده</Link></li>
            <li><Link className="transition hover:text-ink" to="/newsletter-unsubscribe">لغو عضویت خبرنامه</Link></li>
          </ul>
          <div className="mt-5 rounded-xl border border-border-strong bg-surface/60 p-3">
            <div className="flex items-start gap-2 text-xs leading-5 text-muted"><Truck size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><span>هزینه ارسال و شرط ارسال رایگان در زمان خرید نمایش داده می‌شود.</span></div>
            <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-muted"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" /><span>نتیجه پرداخت در سمت سرور بررسی می‌شود.</span></div>
          </div>
        </nav>

        <section>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><Mail size={18} aria-hidden="true" /></span>
            <div><h2 className="text-base font-semibold">خبرنامه تیک بوتیک</h2><p className="mt-1 text-xs text-muted-soft">خبرهای مجموعه و اطلاعیه‌های تازه</p></div>
          </div>
          <form onSubmit={subscribe} className="mt-4 space-y-3">
            <label htmlFor="newsletter-email" className="sr-only">نشانی ایمیل</label>
            <div className="flex min-h-12 overflow-hidden rounded-xl border border-border-strong bg-surface p-1 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
              <input id="newsletter-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ایمیل شما" dir="ltr" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-left text-sm outline-none placeholder:text-muted-soft" />
              <button type="submit" disabled={submitting} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-strong px-3 text-xs font-semibold text-white transition hover:bg-strong-hover disabled:cursor-not-allowed disabled:opacity-50 sm:px-4">{submitting ? "در حال ثبت…" : "ثبت درخواست"}<ArrowLeft size={14} aria-hidden="true" /></button>
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-5 text-muted">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required className="mt-1 h-3.5 w-3.5 shrink-0 accent-brand" />
              <span>با ثبت ایمیل، با ذخیره نشانی برای خبرنامه موافقم. می‌توانم از صفحه <Link to="/newsletter-unsubscribe" className="font-semibold text-brand-deep underline underline-offset-2">لغو عضویت</Link> درخواست توقف عضویت بدهم.</span>
            </label>
          </form>
          {result && <p role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-brand-soft bg-surface-raised p-3 text-xs leading-5 text-ink-strong"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />{result}</p>}
          <p className="mt-3 text-[11px] leading-5 text-muted-soft">در حال حاضر درخواست عضویت ذخیره می‌شود؛ ارسال ایمیل‌های خبرنامه تا اتصال سرویس ایمیل فعال نیست.</p>
          <p className="mt-4 text-xs leading-5 text-muted">{supportEmail ? <>پشتیبانی: <a href={`mailto:${supportEmail}`} className="font-semibold underline underline-offset-2 hover:text-ink" dir="ltr">{supportEmail}</a></> : <>نشانی ایمیل رسمی پشتیبانی هنوز در تنظیمات فروشگاه ثبت نشده است. <Link to="/support" className="font-semibold text-brand-deep underline underline-offset-2">اطلاعات پشتیبانی</Link></>}</p>

        </section>
      </div>
      <div className="border-t border-border-strong">
        <div className="mx-auto flex max-w-[1920px] flex-col gap-2 px-4 py-4 text-[11px] leading-5 text-muted-soft sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 2xl:px-12">
          <p>© {formatIranianYear()} تیک بوتیک. تمامی حقوق مادی و معنوی وب‌سایت، محتوای آن و نشان تجاری «تیک بوتیک» محفوظ است.</p>
          <p>هرگونه نسخه‌برداری، بازنشر یا استفاده تجاری از محتوا بدون مجوز کتبی ممنوع است.</p>
        </div>
      </div>
    </footer>
  );
};

export default StoreFooter;
