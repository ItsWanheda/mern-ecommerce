import { useState } from "react";
import { ArrowLeft, CheckCircle2, Heart, Instagram, Mail, MapPin, Send, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { formatIranianYear } from "../lib/iranian-date";

const supportEmail = process.env.NEXT_PUBLIC_STORE_SUPPORT_EMAIL || "";
const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || "";
const storeMapUrl = process.env.NEXT_PUBLIC_STORE_MAP_URL || "";
const enamadImage = process.env.NEXT_PUBLIC_ENAMAD_SEAL_IMAGE_URL || "https://trustseal.enamad.ir/Content/Images/Star2/81.png";
const enamadVerificationUrl = process.env.NEXT_PUBLIC_ENAMAD_SEAL_LINK_URL || "";
const socialProfiles = [
  { id: "instagram", label: "اینستاگرام", href: process.env.NEXT_PUBLIC_STORE_INSTAGRAM_URL || "", Icon: Instagram },
  { id: "telegram", label: "تلگرام", href: process.env.NEXT_PUBLIC_STORE_TELEGRAM_URL || "", Icon: Send },
  { id: "x", label: "ایکس (X)", href: process.env.NEXT_PUBLIC_STORE_X_URL || "", Icon: null },
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

  const socialIcon = ({ Icon }) => Icon ? <Icon size={17} aria-hidden="true" /> : (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.39L5.58 22H2.45l7.25-8.29L1.8 2h6.4l4.43 6.77L18.9 2Zm-1.1 18h1.73L7.28 3.89H5.42L17.8 20Z" />
    </svg>
  );

  return (
    <footer dir="rtl" className="storefront-footer mt-12 border-t border-[var(--ui-border)] bg-[var(--ui-surface-raised)] text-[var(--ui-text)] sm:mt-16">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-9 sm:grid-cols-2 sm:gap-10 sm:px-6 sm:py-12 lg:grid-cols-[1.25fr_0.8fr_1fr_1.15fr] lg:gap-8 lg:px-8">
        <section className="min-w-0">
          <Link to="/" className="inline-flex items-center gap-2 rounded-lg text-lg font-extrabold tracking-tight text-[var(--ui-text)] transition hover:text-[var(--ui-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ui-focus)]">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ui-accent)] text-[var(--ui-button-text)]"><CpuFallback /></span>
            <span>Computer Hardware</span>
          </Link>
          <p className="mt-3 max-w-xs text-xs leading-7 text-[var(--ui-muted)] sm:text-sm">
            قطعات و تجهیزات کامپیوتر با مشخصات فنی روشن، موجودی به‌روز و مسیر خرید شفاف.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/shop" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--ui-accent)] px-4 py-2 text-xs font-bold text-[var(--ui-button-text)] transition hover:bg-[var(--ui-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]">
              شروع خرید<ArrowLeft size={14} aria-hidden="true" />
            </Link>
            <Link to="/wishlist" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-3 py-2 text-xs font-semibold text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]">
              <Heart size={14} aria-hidden="true" />علاقه‌مندی‌ها
            </Link>
          </div>

          <div className="mt-5 border-t border-[var(--ui-border)] pt-4">
            <p className="text-xs font-bold text-[var(--ui-text-strong)]">ما را دنبال کنید</p>
            <div className="mt-2 flex items-center gap-2" aria-label="شبکه‌های اجتماعی Computer Hardware">
              {socialProfiles.map((profile) => (
                profile.href ? (
                  <a key={profile.id} href={profile.href} target="_blank" rel="noopener noreferrer" aria-label={profile.label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] text-[var(--ui-text-strong)] transition hover:border-[var(--ui-accent)] hover:bg-[var(--ui-accent-soft)] hover:text-[var(--ui-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]">
                    {socialIcon(profile)}
                  </a>
                ) : (
                  <span key={profile.id} title={"برای فعال‌سازی، نشانی " + profile.label + " را در تنظیمات سایت وارد کنید."} aria-label={profile.label + " (نشانی تنظیم نشده)"}
                    className="inline-flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)]/50 text-[var(--ui-muted)]">
                    {socialIcon(profile)}
                  </span>
                )
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3">
            {enamadVerificationUrl ? (
              <a href={enamadVerificationUrl} target="_blank" rel="noopener noreferrer" aria-label="استعلام نماد اعتماد الکترونیکی Computer Hardware"
                className="inline-flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-xl border border-[var(--ui-border)] bg-white p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]">
                <img src={enamadImage} alt="نماد اعتماد الکترونیکی" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
              </a>
            ) : (
              <span aria-label="تصویر نماد اعتماد الکترونیکی؛ لینک اختصاصی اعتبارسنجی تنظیم نشده است"
                className="inline-flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-xl border border-[var(--ui-border)] bg-white p-1">
                <img src={enamadImage} alt="نماد اعتماد الکترونیکی" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--ui-text-strong)]">نماد اعتماد الکترونیکی</p>
              <p className="mt-1 text-[10px] leading-5 text-[var(--ui-muted)]">
                {enamadVerificationUrl ? "برای مشاهده وضعیت و اطلاعات نماد، روی تصویر کلیک کنید." : "لینک اعتبارسنجی رسمی نماد از تنظیمات فروشگاه قابل ثبت است."}
              </p>
            </div>
          </div>
        </section>

        <nav aria-label="راهنمای خرید">
          <h2 className="text-sm font-extrabold">راهنمای خرید</h2>
          <ul className="mt-4 space-y-3 text-xs text-[var(--ui-muted)] sm:text-sm">
            <li><Link className="transition hover:text-[var(--ui-accent)]" to="/shipping-policy">ارسال و تحویل</Link></li>
            <li><Link className="transition hover:text-[var(--ui-accent)]" to="/returns-policy">مرجوعی و تعویض</Link></li>
            <li><Link className="transition hover:text-[var(--ui-accent)]" to="/faq">سؤالات متداول</Link></li>
            <li><Link className="transition hover:text-[var(--ui-accent)]" to="/support">پشتیبانی و تماس</Link></li>
            <li><Link className="transition hover:text-[var(--ui-accent)]" to="/orders">پیگیری سفارش</Link></li>
          </ul>
          <div className="mt-5 space-y-2 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3">
            <div className="flex items-start gap-2 text-xs leading-6 text-[var(--ui-muted)]"><Truck size={15} className="mt-1 shrink-0 text-[var(--ui-accent)]" aria-hidden="true" /><span>هزینه ارسال و شرط ارسال رایگان پیش از پرداخت نمایش داده می‌شود.</span></div>
            <div className="flex items-start gap-2 text-xs leading-6 text-[var(--ui-muted)]"><ShieldCheck size={15} className="mt-1 shrink-0 text-[var(--ui-accent)]" aria-hidden="true" /><span>نتیجه پرداخت در سمت سرور بررسی می‌شود.</span></div>
          </div>
        </nav>

        <section aria-labelledby="store-address-heading" className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]"><MapPin size={18} aria-hidden="true" /></span>
            <h2 id="store-address-heading" className="text-sm font-extrabold">نشانی فروشگاه</h2>
          </div>
          <div className="mt-4 min-h-[8.5rem] rounded-2xl border border-dashed border-[var(--ui-border-strong)] bg-[var(--ui-surface)] p-4">
            {storeAddress ? (
              <p className="whitespace-pre-line text-sm leading-7 text-[var(--ui-text-strong)]">{storeAddress}</p>
            ) : (
              <p className="text-xs leading-7 text-[var(--ui-muted)]">فضای نشانی فروشگاه آماده است. پس از ثبت آدرس در تنظیمات، اطلاعات این بخش نمایش داده می‌شود.</p>
            )}
            {storeMapUrl && (
              <a href={storeMapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--ui-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--ui-text-strong)] hover:bg-[var(--ui-hover)]">
                مشاهده روی نقشه<ArrowLeft size={13} aria-hidden="true" />
              </a>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]"><Mail size={17} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--ui-text-strong)]">ارتباط با پشتیبانی</p>
              {supportEmail ? (
                <a href={"mailto:" + supportEmail} dir="ltr" className="mt-1 block break-all text-xs text-[var(--ui-muted)] hover:text-[var(--ui-accent)]">{supportEmail}</a>
              ) : (
                <Link to="/support" className="mt-1 block text-xs text-[var(--ui-muted)] hover:text-[var(--ui-accent)]">مشاهده راه‌های ارتباطی</Link>
              )}
            </div>
          </div>
        </section>

        <section className="min-w-0 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]"><Mail size={18} aria-hidden="true" /></span>
            <div>
              <h2 className="text-sm font-extrabold">خبرنامه فروشگاه</h2>
              <p className="mt-1 text-xs text-[var(--ui-muted)]">خبر محصولات جدید و اطلاعیه‌های فروشگاه</p>
            </div>
          </div>
          <form onSubmit={subscribe} className="mt-4 space-y-3">
            <label htmlFor="newsletter-email" className="sr-only">نشانی ایمیل</label>
            <div className="flex min-h-12 overflow-hidden rounded-xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] p-1 transition focus-within:border-[var(--ui-accent)] focus-within:ring-4 focus-within:ring-[var(--ui-accent-soft)]">
              <input id="newsletter-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ایمیل شما" dir="ltr" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-left text-sm outline-none placeholder:text-[var(--ui-muted)]" />
              <button type="submit" disabled={submitting} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--ui-accent)] px-3 text-xs font-bold text-[var(--ui-button-text)] transition hover:bg-[var(--ui-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4">
                {submitting ? "در حال ثبت…" : "ثبت درخواست"}<ArrowLeft size={14} aria-hidden="true" />
              </button>
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-5 text-[var(--ui-muted)]">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required className="mt-1 h-3.5 w-3.5 shrink-0 accent-[var(--ui-accent)]" />
              <span>با ثبت ایمیل، با ذخیره نشانی برای خبرنامه موافقم. امکان لغو عضویت از صفحه <Link to="/newsletter-unsubscribe" className="font-semibold text-[var(--ui-accent)] underline underline-offset-2">لغو عضویت</Link> فراهم است.</span>
            </label>
          </form>
          {result && <p role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--ui-success-border)] bg-[var(--ui-success-bg)] p-3 text-xs leading-5 text-[var(--ui-success)]"><CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{result}</p>}
          <p className="mt-3 text-[11px] leading-5 text-[var(--ui-muted)]">درخواست عضویت ذخیره می‌شود؛ ارسال ایمیل‌های خبرنامه تا اتصال سرویس ایمیل فعال نیست.</p>
        </section>
      </div>
      <div className="border-t border-[var(--ui-border)]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-4 text-[10px] leading-5 text-[var(--ui-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {formatIranianYear()} Computer Hardware. تمامی حقوق مادی و معنوی وب‌سایت و محتوای آن محفوظ است.</p>
          <p>انتخاب هوشمند، خرید مطمئن.</p>
        </div>
      </div>
    </footer>
  );
};

const CpuFallback = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="5" width="14" height="14" rx="2" /><path d="M9 9h6v6H9zM9 1v4m6-4v4m-6 14v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4" />
  </svg>
);

export default StoreFooter;
