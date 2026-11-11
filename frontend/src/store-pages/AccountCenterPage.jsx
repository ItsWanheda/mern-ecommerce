"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, Download, Laptop, LogOut, Mail, Monitor, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";
import toast from "react-hot-toast";
import axios from "../lib/axios";

const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-input-bg)] px-3 py-2.5 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--ui-focus)]";
const faDate = value => value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export default function AccountCenterPage() {
  const logout = useUserStore(state => state.logout);
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState({ orderUpdates: true, securityAlerts: true, productNews: false, promotionalEmails: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [profileForm, setProfileForm] = useState({ name: "", primaryPhone: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [twoFactor, setTwoFactor] = useState({ secret: "", code: "" });

  const handleLogout = async () => {
    setBusy("logout");
    await logout();
    window.location.assign("/login");
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s, n, p] = await Promise.all([
        axios.get("/account/overview"), axios.get("/account/sessions"),
        axios.get("/account/notifications"), axios.get("/account/preferences"),
      ]);
      setOverview(a.data); setProfileForm({ name: a.data.profile?.name || "", primaryPhone: a.data.profile?.primaryPhone || "" }); setSessions(s.data.sessions || []);
      setNotifications(n.data.notifications || []); setPreferences(p.data.preferences || preferences);
    } catch (error) {
      toast.error(error.response?.data?.message || "بارگذاری مرکز حساب انجام نشد.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (key, action, success) => {
    setBusy(key);
    try { await action(); toast.success(success); await load(); }
    catch (error) { toast.error(error.response?.data?.message || "انجام عملیات ناموفق بود."); }
    finally { setBusy(""); }
  };

  const submitProfile = event => {
    event.preventDefault();
    void run("profile", async () => { await axios.patch("/account/profile", profileForm); }, "اطلاعات حساب ذخیره شد.");
  };
  const submitPassword = event => {
    event.preventDefault();
    void run("password", async () => {
      await axios.patch("/account/password", passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
    }, "رمز عبور تغییر کرد؛ نشست‌های قبلی لغو شدند.");
  };
  const submitEmail = event => {
    event.preventDefault();
    void run("email", async () => {
      await axios.post("/account/email/change", emailForm);
      setEmailForm({ email: "", password: "" });
    }, "پیوند تأیید به ایمیل جدید ارسال شد.");
  };
  const updatePreference = async (key, value) => {
    const next = { ...preferences, [key]: value }; setPreferences(next);
    try { await axios.patch("/account/preferences", { preferences: { [key]: value } }); }
    catch (error) { setPreferences(preferences); toast.error(error.response?.data?.message || "ذخیره تنظیمات ناموفق بود."); }
  };
  const revoke = id => void run("session-" + id, () => axios.delete("/account/sessions/" + encodeURIComponent(id)), "نشست دستگاه لغو شد.");
  const markRead = async id => {
    try { await axios.patch("/account/notifications/" + id + "/read"); await load(); }
    catch { toast.error("به‌روزرسانی اعلان انجام نشد."); }
  };
  const requestDelete = async event => {
    event.preventDefault();
    setBusy("delete");
    try {
      await axios.post("/account/deletion-request", { password: deletePassword });
      toast.success("درخواست حذف حساب ثبت شد.");
      window.location.assign("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "ثبت درخواست حذف حساب انجام نشد.");
      setBusy("");
    }
  };
  const downloadExport = async () => {
    setBusy("export");
    try {
      const response = await axios.get("/account/export", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "account-data-export.json";
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.message || "دریافت خروجی اطلاعات حساب انجام نشد.");
    } finally { setBusy(""); }
  };
  const setup2fa = () => void run("2fa-setup", async () => {
    const { data } = await axios.post("/account/two-factor/setup");
    setTwoFactor(current => ({ ...current, secret: data.secret }));
  }, "کلید راه‌اندازی ساخته شد.");
  const enable2fa = event => {
    event.preventDefault();
    void run("2fa-enable", async () => {
      await axios.post("/account/two-factor/enable", { code: twoFactor.code });
      setTwoFactor({ secret: "", code: "" });
    }, "تأیید دومرحله‌ای فعال شد.");
  };
  const disable2fa = () => {
    const password = window.prompt("برای غیرفعال‌سازی، رمز عبور حساب را وارد کنید.");
    const code = window.prompt("کد ۶ رقمی برنامه احراز هویت را وارد کنید.");
    if (!password || !code) return;
    void run("2fa-disable", () => axios.post("/account/two-factor/disable", { password, code }), "تأیید دومرحله‌ای غیرفعال شد.");
  };

  if (loading) return <main dir="rtl" className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-[var(--ui-muted)]" role="status">در حال بارگذاری مرکز حساب…</main>;
  const profile = overview?.profile || {};
  const stats = overview?.stats || {};
  return (
    <main dir="rtl" className="storefront-page mx-auto min-h-screen max-w-[1440px] space-y-6 px-3 py-8 text-[var(--ui-text)] sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 sm:p-7">
        <div><p className="text-sm font-semibold text-[var(--ui-accent)]">مدیریت حساب</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">مرکز حساب کاربری</h1><p className="mt-2 text-sm text-[var(--ui-muted)]">اطلاعات، امنیت، دستگاه‌ها و حریم خصوصی حساب خود را مدیریت کنید.</p></div>
        <div className="flex flex-wrap items-center gap-2"><Link to="/profile" className="rounded-full border border-[var(--ui-border)] px-4 py-2 text-sm font-semibold">پروفایل و نشانی‌ها</Link><button type="button" onClick={handleLogout} disabled={busy === "logout"} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--ui-danger)] px-4 py-2 text-sm font-semibold text-[var(--ui-danger)] transition hover:bg-[var(--ui-danger-bg)] disabled:opacity-50"><LogOut size={16} aria-hidden="true" />خروج از حساب</button></div>
      </header>

        <nav aria-label="دسترسی‌های حساب" className="flex flex-wrap gap-2">
          <Link to="/orders" className="rounded-full border border-[var(--ui-border)] px-4 py-2 text-sm">سفارش‌ها و پشتیبانی</Link>
          <Link to="/wishlist" className="rounded-full border border-[var(--ui-border)] px-4 py-2 text-sm">علاقه‌مندی‌ها</Link>
          <Link to="/profile" className="rounded-full border border-[var(--ui-border)] px-4 py-2 text-sm">نشانی‌ها</Link>
        </nav>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[[UserRound,"نام حساب",profile.name || "—"],[Mail,"ایمیل",profile.email || "—"],[Laptop,"تعداد سفارش‌ها",stats.orderCount ?? 0],[Bell,"درخواست‌های باز",stats.openCases ?? 0]].map(([Icon,label,value]) => <article key={label} className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4"><Icon size={19} className="text-[var(--ui-accent)]"/><p className="mt-3 text-xs text-[var(--ui-muted)]">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></article>)}
      </section>

      <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">آخرین سفارش‌ها</h2><Link to="/orders" className="text-sm font-semibold text-[var(--ui-accent)] underline">مشاهده همه سفارش‌ها</Link></div>
        {overview?.latestOrders?.length ? <div className="grid gap-3 md:grid-cols-3">{overview.latestOrders.map(order=><article key={order._id} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-3"><p className="text-xs text-[var(--ui-muted)]">{faDate(order.createdAt)}</p><p className="mt-2 text-lg font-bold">{new Intl.NumberFormat("fa-IR").format(order.totalAmount || 0)} تومان</p><p className="mt-1 text-xs text-[var(--ui-muted)]">پرداخت: {order.paymentStatus === "paid" ? "پرداخت‌شده" : order.paymentStatus === "pending" ? "در انتظار پرداخت" : order.paymentStatus || "نامشخص"}</p><p className="mt-1 text-xs text-[var(--ui-muted)]">ارسال: {order.shipmentStatus || "در انتظار پردازش"}</p></article>)}</div> : <p className="rounded-xl border border-dashed border-[var(--ui-border)] p-5 text-sm text-[var(--ui-muted)]">هنوز سفارشی ثبت نشده است.</p>}
      </section>

      <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5">
        <div className="mb-4 flex items-center gap-2"><UserRound className="text-[var(--ui-accent)]"/><h2 className="text-lg font-bold">اطلاعات شخصی</h2></div>
        <form onSubmit={submitProfile} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-[var(--ui-muted)]">نام و نام خانوادگی<input className={fieldClass} minLength={2} maxLength={100} value={profileForm.name} onChange={e=>setProfileForm(v=>({...v,name:e.target.value}))} required/></label>
          <label className="block text-sm text-[var(--ui-muted)]">شماره موبایل اصلی<input className={fieldClass} dir="ltr" inputMode="tel" maxLength={11} value={profileForm.primaryPhone} onChange={e=>setProfileForm(v=>({...v,primaryPhone:e.target.value}))} placeholder="09xxxxxxxxx"/></label>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[var(--ui-muted)]">شماره موبایل برای ورود/تماس ثبت می‌شود؛ تأیید پیامکی هنوز فعال نشده است.</p><button disabled={busy==="profile"} className="min-h-10 rounded-xl bg-[var(--ui-accent)] px-4 text-sm font-semibold text-[var(--ui-button-text)]">ذخیره اطلاعات</button></div>
        </form>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="text-[var(--ui-accent)]"/><h2 className="text-lg font-bold">امنیت حساب</h2></div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--ui-surface-raised)] p-3"><div><p className="text-sm font-semibold">تأیید ایمیل</p><p className="mt-1 text-xs text-[var(--ui-muted)]">{profile.emailVerifiedAt ? "ایمیل تأیید شده است." : profile.pendingEmail ? "در انتظار تأیید: " + profile.pendingEmail : "ایمیل هنوز تأیید نشده است."}</p></div><span className={profile.emailVerifiedAt ? "text-xs font-semibold text-[var(--ui-success)]" : "text-xs font-semibold text-[var(--ui-warning)]"}>{profile.emailVerifiedAt ? "تأییدشده" : "در انتظار تأیید"}</span></div>
          {!profile.emailVerifiedAt && <button type="button" disabled={busy==="verify"} onClick={() => void run("verify", () => axios.post("/account/email/verification"), "پیوند تأیید ارسال شد.")} className="min-h-10 rounded-xl border border-[var(--ui-border)] px-4 text-sm font-semibold disabled:opacity-50">ارسال دوباره پیوند تأیید</button>}
          <form onSubmit={submitPassword} className="space-y-3 border-t border-[var(--ui-border)] pt-4"><h3 className="font-semibold">تغییر رمز عبور</h3><label className="block text-sm text-[var(--ui-muted)]">رمز عبور فعلی<input className={fieldClass} type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={e=>setPasswordForm(v=>({...v,currentPassword:e.target.value}))} required/></label><label className="block text-sm text-[var(--ui-muted)]">رمز عبور جدید<input className={fieldClass} type="password" autoComplete="new-password" minLength={12} value={passwordForm.newPassword} onChange={e=>setPasswordForm(v=>({...v,newPassword:e.target.value}))} required/></label><button disabled={busy==="password"} className="min-h-10 rounded-xl bg-[var(--ui-accent)] px-4 text-sm font-semibold text-[var(--ui-button-text)] disabled:opacity-50">ذخیره رمز جدید</button></form>
          <form onSubmit={submitEmail} className="space-y-3 border-t border-[var(--ui-border)] pt-4"><h3 className="font-semibold">تغییر ایمیل حساب</h3><label className="block text-sm text-[var(--ui-muted)]">ایمیل جدید<input className={fieldClass} type="email" dir="ltr" value={emailForm.email} onChange={e=>setEmailForm(v=>({...v,email:e.target.value}))} required/></label><label className="block text-sm text-[var(--ui-muted)]">تأیید با رمز عبور<input className={fieldClass} type="password" autoComplete="current-password" value={emailForm.password} onChange={e=>setEmailForm(v=>({...v,password:e.target.value}))} required/></label><button disabled={busy==="email"} className="min-h-10 rounded-xl border border-[var(--ui-border)] px-4 text-sm font-semibold disabled:opacity-50">ارسال پیوند تأیید ایمیل جدید</button></form>
        </section>

        <section className="space-y-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5">
          <div className="flex items-center gap-2"><Monitor className="text-[var(--ui-accent)]"/><h2 className="text-lg font-bold">دستگاه‌ها و نشست‌های فعال</h2></div>
          {sessions.length ? sessions.map(session=><article key={session._id} className="rounded-xl border border-[var(--ui-border)] p-3"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-2"><Smartphone size={18} className="mt-1 shrink-0 text-[var(--ui-muted)]"/><div className="min-w-0"><p className="break-words text-sm font-semibold">{session.deviceName || "دستگاه ناشناس"} {session.isCurrent && <span className="text-[var(--ui-success)]">· این دستگاه</span>}</p><p className="mt-1 break-all text-xs text-[var(--ui-muted)]" dir="ltr">{session.ipAddress || "IP نامشخص"}</p><p className="mt-1 text-xs text-[var(--ui-muted)]">آخرین فعالیت: {faDate(session.lastUsedAt)}</p></div></div><button type="button" onClick={()=>revoke(session.tokenId)} disabled={session.isCurrent || busy==="session-"+session.tokenId} className="shrink-0 rounded-lg border border-[var(--ui-border)] px-3 py-2 text-xs font-semibold">لغو</button></div></article>) : <p className="text-sm text-[var(--ui-muted)]">نشست فعالی ثبت نشده است.</p>}
          <div className="border-t border-[var(--ui-border)] pt-4"><h3 className="font-semibold">تأیید دومرحله‌ای</h3><p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">با برنامه‌هایی مانند Google Authenticator یک کد یک‌بارمصرف اضافه کنید.</p>{twoFactor.secret ? <form onSubmit={enable2fa} className="mt-3 space-y-2"><p className="break-all rounded-lg bg-[var(--ui-surface-raised)] p-3 font-mono text-sm" dir="ltr">{twoFactor.secret}</p><input className={fieldClass} inputMode="numeric" maxLength={6} placeholder="کد ۶ رقمی" value={twoFactor.code} onChange={e=>setTwoFactor(v=>({...v,code:e.target.value}))}/><button className="min-h-10 rounded-xl bg-[var(--ui-accent)] px-4 text-sm font-semibold text-[var(--ui-button-text)]">فعال‌سازی</button></form> : <button type="button" onClick={profile.twoFactorEnabled ? disable2fa : setup2fa} className="mt-3 min-h-10 rounded-xl border border-[var(--ui-border)] px-4 text-sm font-semibold">{profile.twoFactorEnabled ? "غیرفعال‌سازی تأیید دومرحله‌ای" : "راه‌اندازی تأیید دومرحله‌ای"}</button>}</div>
        </section>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5"><div className="flex items-center gap-2"><Bell className="text-[var(--ui-accent)]"/><h2 className="text-lg font-bold">اعلان‌های امنیتی و تاریخچه ورود</h2></div><div className="mt-4 max-h-[440px] space-y-2 overflow-y-auto">{notifications.length ? notifications.map(item=><article key={item._id} className="rounded-xl bg-[var(--ui-surface-raised)] p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">{item.message}</p><p className="mt-1 text-[11px] text-[var(--ui-muted)]">{faDate(item.createdAt)}</p></div>{!item.readAt && <button type="button" onClick={()=>markRead(item._id)} aria-label="خوانده شد" className="rounded-lg p-1 text-[var(--ui-accent)]"><CheckCircle2 size={18}/></button>}</div></article>) : <p className="text-sm text-[var(--ui-muted)]">هنوز رویداد امنیتی ثبت نشده است.</p>}</div></section>
        <section className="space-y-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5"><h2 className="text-lg font-bold">ترجیحات ارتباطی</h2>{[[ "orderUpdates","به‌روزرسانی سفارش‌ها" ],[ "securityAlerts","هشدارهای امنیتی" ],[ "productNews","اخبار محصولات" ],[ "promotionalEmails","پیشنهادها و ایمیل‌های تبلیغاتی" ]].map(([key,label])=><label key={key} className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--ui-border)] py-2 text-sm"><span>{label}</span><input type="checkbox" checked={Boolean(preferences[key])} onChange={e=>updatePreference(key,e.target.checked)} className="h-4 w-4 accent-[var(--ui-accent)]"/></label>)}
          <button type="button" onClick={downloadExport} disabled={busy==="export"} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--ui-border)] px-4 text-sm font-semibold disabled:opacity-50"><Download size={16}/>دریافت نسخه اطلاعات حساب</button>
          <form onSubmit={requestDelete} className="space-y-2 border-t border-[var(--ui-border)] pt-4"><h3 className="font-semibold text-[var(--ui-danger)]">درخواست حذف حساب</h3><p className="text-xs leading-5 text-[var(--ui-muted)]">حساب غیرفعال می‌شود و دسترسی نشست‌ها لغو خواهد شد. سوابق سفارش برای الزامات مالی حفظ می‌شوند.</p><input className={fieldClass} type="password" placeholder="رمز عبور برای تأیید درخواست" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)} required/><button disabled={busy==="delete"} className="min-h-10 rounded-xl border border-[var(--ui-danger)] px-4 text-sm font-semibold text-[var(--ui-danger)]">ثبت درخواست حذف حساب</button></form>
        </section>
      </div>
      <footer className="text-center text-xs text-[var(--ui-muted)]">برای مدیریت سفارش‌ها و درخواست‌های پشتیبانی از <Link to="/orders" className="font-semibold text-[var(--ui-accent)] underline">بخش سفارش‌ها</Link> استفاده کنید.</footer>
    </main>
  );
}
