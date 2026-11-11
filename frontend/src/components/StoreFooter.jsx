import { useState } from "react";
import { ArrowLeft, CheckCircle2, Heart, Instagram, Mail, MapPin, Send } from "lucide-react";
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
    <footer dir="rtl" className="storefront-footer mt-8 border-t border-[var(--ui-border)] bg-[var(--ui-surface-raised)] text-[var(--ui-text)] sm:mt-10">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[minmax(0,1fr)_auto_minmax(15rem,0.9fr)] lg:gap-8">
          <section className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3">
            <Link to="/" aria-label="Computer Hardware، صفحه اصلی" className="inline-flex items-center gap-2 rounded-lg text-base font-extrabold tracking-tight text-[var(--ui-text)] transition hover:text-[var(--ui-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ui-focus)]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ui-accent)] text-[var(--ui-button-text)]"><CpuFallback /></span>
              <span>Computer Hardware</span>
            </Link>
            <p className="w-full max-w-xs text-[11px] leading-5 text-[var(--ui-muted)]">
              قطعات کامپیوتر با مشخصات فنی روشن و خرید شفاف.
            </p>
            {socialProfiles.some((profile) => profile.href) && (
              <div className="flex items-center gap-1.5" aria-label="شبکه‌های اجتماعی Computer Hardware">
                {socialProfiles.filter((profile) => profile.href).map((profile) => (
                  <a key={profile.id} href={profile.href} target="_blank" rel="noopener noreferrer" aria-label={profile.label}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] text-[var(--ui-text-strong)] transition hover:border-[var(--ui-accent)] hover:bg-[var(--ui-accent-soft)] hover:text-[var(--ui-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]">
                    {socialIcon(profile)}
                  </a>
                ))}
              </div>
            )}
          </section>

          <nav aria-label="پیوندهای اصلی فروشگاه" className="flex flex-wrap content-start gap-x-4 gap-y-2 text-xs font-medium text-[var(--ui-muted)]">
            <Link className="transition hover:text-[var(--ui-accent)]" to="/shop">محصولات</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/categories">دسته‌بندی‌ها</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/shipping-policy">ارسال و تحویل</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/returns-policy">مرجوعی</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/faq">سؤالات متداول</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/orders">پیگیری سفارش</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/support">پشتیبانی</Link>
          </nav>

          <section className="flex min-w-0 items-center gap-3">
            {enamadVerificationUrl ? (
              <a href={enamadVerificationUrl} target="_blank" rel="noopener noreferrer" aria-label="استعلام نماد اعتماد الکترونیکی Computer Hardware"
                className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--ui-border)] bg-white p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]">
                <img src={enamadImage} alt="نماد اعتماد الکترونیکی" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
              </a>
            ) : (
              <span aria-label="نماد اعتماد الکترونیکی" className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--ui-border)] bg-white p-1">
                <img src={enamadImage} alt="نماد اعتماد الکترونیکی" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
              </span>
            )}
            <div className="min-w-0 space-y-1.5">
              {storeAddress && <p className="line-clamp-2 text-[11px] leading-5 text-[var(--ui-muted)]">{storeAddress}</p>}
              {storeMapUrl && (
                <a href={storeMapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--ui-accent)] hover:underline">
                  مشاهده روی نقشه<ArrowLeft size={12} aria-hidden="true" />
                </a>
              )}
              {supportEmail ? (
                <a href={"mailto:" + supportEmail} dir="ltr" className="block break-all text-xs font-semibold text-[var(--ui-text-strong)] hover:text-[var(--ui-accent)]">{supportEmail}</a>
              ) : (
                <Link to="/support" className="block text-xs font-semibold text-[var(--ui-text-strong)] hover:text-[var(--ui-accent)]">ارتباط با پشتیبانی</Link>
              )}
            </div>
          </section>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--ui-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--ui-text-strong)]">خبرنامه</p>
            <form onSubmit={subscribe} className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
              <label htmlFor="newsletter-email" className="sr-only">نشانی ایمیل</label>
              <div className="flex min-h-10 w-full max-w-[22rem] overflow-hidden rounded-xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] p-1 transition focus-within:border-[var(--ui-accent)] focus-within:ring-2 focus-within:ring-[var(--ui-accent-soft)]">
                <input id="newsletter-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ایمیل شما" dir="ltr" className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-left text-xs outline-none placeholder:text-[var(--ui-muted)]" />
                <button type="submit" disabled={submitting} className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-lg bg-[var(--ui-accent)] px-3 text-[11px] font-bold text-[var(--ui-button-text)] transition hover:bg-[var(--ui-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50">
                  {submitting ? "در حال ثبت…" : "ثبت"}<ArrowLeft size={12} aria-hidden="true" />
                </button>
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 text-[10px] leading-4 text-[var(--ui-muted)]">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required className="h-3.5 w-3.5 shrink-0 accent-[var(--ui-accent)]" />
                <span>با ذخیره ایمیل برای خبرنامه موافقم. <Link to="/newsletter-unsubscribe" className="font-semibold text-[var(--ui-accent)] underline underline-offset-2">لغو عضویت</Link></span>
              </label>
            </form>
            {result && <p role="status" className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--ui-success-border)] bg-[var(--ui-success-bg)] p-2 text-[11px] leading-5 text-[var(--ui-success)]"><CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{result}</p>}
          </div>
          <p className="text-[10px] leading-5 text-[var(--ui-muted)]">
            © {formatIranianYear()} Computer Hardware. تمامی حقوق محفوظ است.
          </p>
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
