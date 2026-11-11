import { useState } from "react";
import { CheckCircle2, Instagram, Mail, MapPin, Phone, Send } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { formatIranianYear } from "../lib/iranian-date";

const supportEmail = process.env.NEXT_PUBLIC_STORE_SUPPORT_EMAIL || "";
const supportPhone = process.env.NEXT_PUBLIC_STORE_SUPPORT_PHONE || "";
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
    <footer dir="rtl" className="storefront-footer mt-8 border-t border-[var(--ui-border-strong)] bg-[var(--ui-surface-muted)] text-[var(--ui-text)] sm:mt-10">
      <div className="mx-auto w-full max-w-none px-4 py-5 sm:px-6 lg:px-10">
        <div className="grid items-center gap-x-7 gap-y-4 xl:grid-cols-[minmax(12rem,1fr)_minmax(18rem,1.25fr)_minmax(15rem,1fr)_auto]">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" aria-label="Computer Hardware، صفحه اصلی" className="inline-flex shrink-0 items-center gap-2 text-sm font-extrabold tracking-tight text-[var(--ui-text)] hover:text-[var(--ui-accent)]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ui-accent)] text-[var(--ui-button-text)]"><CpuFallback /></span>
              <span>Computer Hardware</span>
            </Link>
            {socialProfiles.some((profile) => profile.href) && (
              <div className="flex shrink-0 items-center gap-1" aria-label="شبکه‌های اجتماعی Computer Hardware">
                {socialProfiles.filter((profile) => profile.href).map((profile) => (
                  <a key={profile.id} href={profile.href} target="_blank" rel="noopener noreferrer" aria-label={profile.label}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] text-[var(--ui-text-strong)] transition hover:border-[var(--ui-accent)] hover:text-[var(--ui-accent)]">
                    {socialIcon(profile)}
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav aria-label="پیوندهای اصلی فروشگاه" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-[var(--ui-text-strong)]">
            <Link className="transition hover:text-[var(--ui-accent)]" to="/shop">محصولات</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/categories">دسته‌بندی‌ها</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/shipping-policy">ارسال</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/returns-policy">مرجوعی</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/faq">سؤالات متداول</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/orders">پیگیری سفارش</Link>
            <Link className="transition hover:text-[var(--ui-accent)]" to="/support">پشتیبانی</Link>
          </nav>

          <section aria-label="اطلاعات تماس" className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-[10px] leading-5 text-[var(--ui-text-strong)]">
            {supportPhone && <><Phone size={13} className="text-[var(--ui-accent)]" aria-hidden="true" /><a href={"tel:" + supportPhone.replace(/[^\\d+]/g, "")} dir="ltr" className="truncate text-right font-semibold hover:text-[var(--ui-accent)]">{supportPhone}</a></>}
            {supportEmail && <><Mail size={13} className="text-[var(--ui-accent)]" aria-hidden="true" /><a href={"mailto:" + supportEmail} dir="ltr" className="truncate text-right font-semibold hover:text-[var(--ui-accent)]">{supportEmail}</a></>}
            {storeAddress && <><MapPin size={13} className="text-[var(--ui-accent)]" aria-hidden="true" /><span className="line-clamp-1 min-w-0">{storeAddress}{storeMapUrl && <a href={storeMapUrl} target="_blank" rel="noopener noreferrer" className="mr-2 font-bold text-[var(--ui-accent)] hover:underline">نقشه</a>}</span></>}
          </section>

          <div className="flex items-center gap-3 xl:justify-self-end">
            <form onSubmit={subscribe} className="min-w-0">
              <label htmlFor="newsletter-email" className="mb-1 block text-[10px] font-bold text-[var(--ui-text-strong)]">خبرنامه</label>
              <div className="flex h-9 w-[min(70vw,16rem)] overflow-hidden rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] p-0.5 focus-within:border-[var(--ui-accent)]">
                <input id="newsletter-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ایمیل شما" dir="ltr" className="min-w-0 flex-1 bg-transparent px-2 text-left text-[11px] outline-none placeholder:text-[var(--ui-muted)]" />
                <button type="submit" disabled={submitting} className="inline-flex shrink-0 items-center justify-center rounded-md bg-[var(--ui-accent)] px-2.5 text-[10px] font-bold text-[var(--ui-button-text)] disabled:opacity-50">{submitting ? "…" : "ثبت"}</button>
              </div>
              <label className="mt-1 flex cursor-pointer items-center gap-1 text-[9px] leading-4 text-[var(--ui-muted)]">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required className="h-3 w-3 shrink-0 accent-[var(--ui-accent)]" />
                <span>رضایت با ثبت ایمیل · <Link to="/newsletter-unsubscribe" className="font-semibold text-[var(--ui-accent)] underline">لغو عضویت</Link></span>
              </label>
            </form>
            {enamadVerificationUrl ? (
              <a href={enamadVerificationUrl} target="_blank" rel="noopener noreferrer" aria-label="استعلام نماد اعتماد الکترونیکی Computer Hardware" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--ui-border-strong)] bg-white p-1">
                <img src={enamadImage} alt="نماد اعتماد الکترونیکی" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
              </a>
            ) : (
              <span aria-label="نماد اعتماد الکترونیکی" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--ui-border-strong)] bg-white p-1">
                <img src={enamadImage} alt="نماد اعتماد الکترونیکی" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
              </span>
            )}
          </div>
        </div>
        {result && <p role="status" className="mt-2 text-center text-[10px] font-medium text-[var(--ui-success)]">{result}</p>}
        <p className="mt-4 border-t border-[var(--ui-border-strong)] pt-3 text-center text-[10px] leading-5 text-[var(--ui-muted)]">
          © {formatIranianYear()} Computer Hardware. تمامی حقوق محفوظ است.
        </p>
      </div>
    </footer>

const CpuFallback = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="5" width="14" height="14" rx="2" /><path d="M9 9h6v6H9zM9 1v4m6-4v4m-6 14v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4" />
  </svg>
);

export default StoreFooter;
