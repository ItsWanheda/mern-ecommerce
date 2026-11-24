import { useCallback, useEffect, useState } from "react";
import { ChevronDown, LoaderCircle, MapPin, RefreshCw, Save, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";

const permissions = [
  ["catalogue.manage", "مدیریت کاتالوگ"], ["orders.manage", "مدیریت سفارش‌ها"],
  ["customers.manage", "مدیریت مشتریان"], ["support.manage", "پشتیبانی و مرجوعی"],
  ["reports.view", "گزارش‌های فروش"], ["settings.manage", "تنظیمات فروشگاه"],
  ["inventory.manage", "موجودی کالا"], ["audit.view", "تاریخچه اقدامات"],
  ["system.view", "وضعیت سامانه"], ["roles.manage", "مدیریت دسترسی‌ها"],
  ["marketing.manage", "بازاریابی"], ["*", "دسترسی کامل"],
];

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [expandedSessions, setExpandedSessions] = useState({});
  const [sessionsByCustomer, setSessionsByCustomer] = useState({});
  const [sessionsLoading, setSessionsLoading] = useState({});
  const [sessionsError, setSessionsError] = useState({});

  const loadSessions = async (customer) => {
    const customerId = String(customer._id);
    setSessionsLoading((current) => ({ ...current, [customerId]: true }));
    setSessionsError((current) => ({ ...current, [customerId]: "" }));
    try {
      const { data } = await axios.get("/admin/customers/" + customerId + "/sessions", { params: { limit: 20 } });
      setSessionsByCustomer((current) => ({ ...current, [customerId]: Array.isArray(data.sessions) ? data.sessions : [] }));
    } catch (requestError) {
      setSessionsError((current) => ({
        ...current,
        [customerId]: requestError.response?.data?.message || "دریافت تاریخچه نشست‌ها ناموفق بود.",
      }));
    } finally {
      setSessionsLoading((current) => ({ ...current, [customerId]: false }));
    }
  };

  const toggleSessions = (customer) => {
    const customerId = String(customer._id);
    const willOpen = !expandedSessions[customerId];
    setExpandedSessions((current) => ({ ...current, [customerId]: willOpen }));
    if (willOpen && !sessionsByCustomer[customerId] && !sessionsLoading[customerId]) void loadSessions(customer);
  };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await axios.get("/admin/customers", { params: { q: search, page, limit: 25 } });
      setCustomers(data.customers || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setDrafts({});
    } catch (e) { setError(e.response?.data?.message || "بارگذاری مشتریان ناموفق بود."); }
    finally { setLoading(false); }
  }, [page, search]);
  useEffect(() => { void load(); }, [load]);

  const draftFor = (customer) => drafts[customer._id] || {
    role: customer.role,
    isActive: customer.isActive !== false,
    permissions: customer.role !== "admin" ? [] : (Array.isArray(customer.permissions) ? customer.permissions : ["*"]),
  };
  const change = (customer, field, value) => setDrafts((current) => ({
    ...current,
    [customer._id]: { ...(current[customer._id] || draftFor(customer)), [field]: value },
  }));
  const save = async (customer) => {
    const draft = draftFor(customer);
    setSaving(customer._id);
    try {
      await axios.patch("/admin/customers/" + customer._id + "/access", {
        role: draft.role, isActive: draft.isActive,
        ...(draft.role === "admin" ? { permissions: draft.permissions } : {}),
      });
      toast.success("دسترسی حساب ذخیره شد");
      await load();
    } catch (e) { toast.error(e.response?.data?.message || "ذخیره دسترسی ناموفق بود"); }
    finally { setSaving(""); }
  };

  const fieldClass = "min-h-11 w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-input-bg)] px-3 py-2 text-sm text-[var(--ui-text)]";
  return <section dir="rtl" className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-xl font-bold text-[var(--ui-text)]"><Users size={22}/>مدیریت مشتریان و دسترسی مدیران</h2><p className="mt-1 text-sm leading-6 text-[var(--ui-muted)]">نقش، وضعیت حساب و مجوزهای دقیق هر مدیر را مدیریت کنید.</p></div>
      <button type="button" onClick={load} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--ui-border)] px-4 text-sm"><RefreshCw size={15}/>تازه‌سازی</button>
    </header>
    <form onSubmit={(e)=>{e.preventDefault();setPage(1);void load();}} className="flex flex-col gap-2 sm:flex-row">
      <label className="relative min-w-0 flex-1"><span className="sr-only">جست‌وجوی مشتری</span><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ui-muted)]"/><input className={fieldClass+" pr-9"} value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="جست‌وجو با نام یا ایمیل"/></label>
      <button className="min-h-11 rounded-lg bg-[var(--ui-accent)] px-5 text-sm font-semibold text-[var(--ui-button-text)]">جست‌وجو</button>
    </form>
    {error&&<p role="alert" className="rounded-xl border border-[var(--ui-danger-border)] bg-[var(--ui-danger-bg)] p-4 text-sm text-[var(--ui-danger)]">{error}</p>}
    {loading?<div role="status" className="flex min-h-32 items-center justify-center gap-2 text-sm text-[var(--ui-muted)]"><LoaderCircle className="animate-spin"/>در حال بارگذاری مشتریان…</div>
    :customers.length===0?<p className="rounded-xl border border-[var(--ui-border)] p-8 text-center text-sm text-[var(--ui-muted)]">مشتری‌ای پیدا نشد.</p>
    :<div className="space-y-4">{customers.map(customer=>{const draft=draftFor(customer);return <article key={customer._id} className="min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="break-words font-semibold text-[var(--ui-text)]">{customer.name}</p><p dir="ltr" className="mt-1 break-all text-sm text-[var(--ui-muted)]">{customer.email}</p><p className="mt-1 text-xs text-[var(--ui-muted)]">شناسه: <span dir="ltr" className="break-all">{customer._id}</span></p></div>
      <button type="button" onClick={()=>save(customer)} disabled={saving===customer._id} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--ui-accent)] px-4 text-sm font-semibold text-[var(--ui-button-text)] disabled:opacity-50">{saving===customer._id?<LoaderCircle className="animate-spin" size={15}/>:<Save size={15}/>}ذخیره دسترسی</button></div>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[var(--ui-surface-raised)] p-3 text-xs sm:grid-cols-4">
        <div><p className="text-[var(--ui-muted)]">تأیید ایمیل</p><p className="mt-1 font-semibold">{customer.emailVerifiedAt ? "تأیید شده" : "تأیید نشده"}</p></div>
        <div><p className="text-[var(--ui-muted)]">موبایل اصلی</p><p className="mt-1 break-all font-semibold" dir="ltr">{customer.primaryPhone || "ثبت نشده"}</p><p className="mt-1 text-[10px]">{customer.phoneVerifiedAt ? "تأیید شده" : "تأیید نشده"}</p></div>
        <div><p className="text-[var(--ui-muted)]">سفارش‌ها</p><p className="mt-1 font-semibold">{new Intl.NumberFormat("fa-IR").format(customer.orderCount || 0)}</p></div>
        <div><p className="text-[var(--ui-muted)]">مجموع پرداخت‌شده</p><p className="mt-1 font-semibold">{new Intl.NumberFormat("fa-IR").format(customer.paidTotal || 0)} تومان</p></div>
        <div><p className="text-[var(--ui-muted)]">درخواست‌های باز</p><p className="mt-1 font-semibold">{new Intl.NumberFormat("fa-IR").format(customer.openCases || 0)}</p></div>
        <div><p className="text-[var(--ui-muted)]">نشست‌های فعال</p><p className="mt-1 font-semibold">{new Intl.NumberFormat("fa-IR").format(customer.activeSessions || 0)}</p></div>
        <div><p className="text-[var(--ui-muted)]">تأیید دومرحله‌ای</p><p className="mt-1 font-semibold">{customer.twoFactorEnabled ? "فعال" : "غیرفعال"}</p></div>
        <div><p className="text-[var(--ui-muted)]">علاقه‌مندی‌ها</p><p className="mt-1 font-semibold">{new Intl.NumberFormat("fa-IR").format(customer.wishlistCount || 0)}</p></div>
        <div className="col-span-2 sm:col-span-4 grid gap-3 sm:grid-cols-2">
          <div><p className="text-[var(--ui-muted)]">آخرین ورود موفق</p><p className="mt-1 font-semibold">{customer.lastLoginAt ? new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(customer.lastLoginAt)) : "سابقه‌ای ثبت نشده"}</p></div>
          <div><p className="text-[var(--ui-muted)]">آخرین فعالیت ثبت‌شده نشست (ورود یا نوسازی موفق توکن)</p><p className="mt-1 font-semibold">{customer.lastActivityAt ? new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(customer.lastActivityAt)) : "فعالیتی ثبت نشده"}</p></div>
        </div>
        {customer.deletionRequestedAt && <div className="col-span-2 text-[var(--ui-danger)] sm:col-span-4">درخواست حذف حساب: {new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium"}).format(new Date(customer.deletionRequestedAt))}</div>}
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--ui-border)]">
        <button type="button" onClick={() => toggleSessions(customer)} aria-expanded={Boolean(expandedSessions[customer._id])} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-right text-sm font-semibold text-[var(--ui-text)] transition hover:bg-[var(--ui-surface-raised)]">
          <span className="inline-flex items-center gap-2"><MapPin size={16} aria-hidden="true" />مشاهده IP و تاریخچه نشست‌های ورود</span>
          <ChevronDown size={17} className={expandedSessions[customer._id] ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden="true" />
        </button>
        {expandedSessions[customer._id] && (
          <div className="space-y-3 border-t border-[var(--ui-border)] p-3">
            <p className="text-xs leading-6 text-[var(--ui-muted)]">IP و مرورگر ورود در نشست‌های جدید جداگانه ثبت می‌شوند و زمان فعالیت ابتدا هنگام ایجاد نشست ثبت می‌شود و با هر نوسازی موفق توکن به‌روزرسانی می‌شود؛ این مقدار به معنی ثبت تک‌تک درخواست‌ها نیست. برای نشست‌های قدیمی، IP اولیه ممکن است در نسخه قبلی بازنویسی شده باشد و قابل بازیابی نباشد. VPN، NAT و شبکه‌های اشتراکی می‌توانند IP عمومی مشترک داشته باشند؛ IP به‌تنهایی هویت یا موقعیت دقیق فرد را ثابت نمی‌کند.</p>
            {sessionsLoading[customer._id] ? (
              <div role="status" className="flex min-h-20 items-center justify-center gap-2 text-xs text-[var(--ui-muted)]"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" />در حال دریافت تاریخچه نشست‌ها…</div>
            ) : sessionsError[customer._id] ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ui-danger)]" role="alert">
                <span>{sessionsError[customer._id]}</span>
                <button type="button" onClick={() => void loadSessions(customer)} className="rounded-lg border border-[var(--ui-border)] px-3 py-2 text-[var(--ui-text)]">تلاش دوباره</button>
              </div>
            ) : (sessionsByCustomer[customer._id] || []).length === 0 ? (
              <p className="rounded-lg bg-[var(--ui-surface-raised)] p-3 text-xs text-[var(--ui-muted)]">برای این حساب نشست ورود ثبت نشده است.</p>
            ) : (
              <div className="space-y-3">
                {(sessionsByCustomer[customer._id] || []).map((session) => (
                  <article key={session.id} className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--ui-text)]">{session.deviceName || "دستگاه ناشناس"}</p>
                      <span className={session.status === "active" ? "rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-400" : "rounded-full bg-[var(--ui-input-bg)] px-2 py-1 text-[10px] text-[var(--ui-muted)]"}>{session.status === "active" ? "فعال" : session.status === "revoked" ? "لغوشده" : "منقضی"}</span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="min-w-0"><p className="text-[10px] text-[var(--ui-muted)]">IP هنگام ورود</p><p dir="ltr" className="mt-1 break-all text-left font-mono text-sm font-semibold text-[var(--ui-text)]">{session.loginIpAddress || "برای نشست قدیمی قابل بازیابی نیست"}</p></div>
                      <div className="min-w-0"><p className="text-[10px] text-[var(--ui-muted)]">آخرین IP مشاهده‌شده هنگام نوسازی نشست</p><p dir="ltr" className="mt-1 break-all text-left font-mono text-sm font-semibold text-[var(--ui-text)]">{session.lastIpAddress || session.ipAddress || "ثبت نشده"}</p></div>
                      <div className="min-w-0"><p className="text-[10px] text-[var(--ui-muted)]">زمان ایجاد نشست / ورود موفق</p><p className="mt-1 text-xs text-[var(--ui-text)]">{session.createdAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.createdAt)) : "—"}</p></div>
                      <div className="min-w-0"><p className="text-[10px] text-[var(--ui-muted)]">آخرین فعالیت نشست (ورود / نوسازی موفق توکن)</p><p className="mt-1 text-xs text-[var(--ui-text)]">{session.lastUsedAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.lastUsedAt)) : "—"}</p></div>
                      <div className="min-w-0"><p className="text-[10px] text-[var(--ui-muted)]">انقضای نشست</p><p className="mt-1 text-xs text-[var(--ui-text)]">{session.expiresAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.expiresAt)) : "—"}</p></div>
                      {session.revokedAt && <div className="min-w-0"><p className="text-[10px] text-[var(--ui-muted)]">زمان لغو نشست</p><p className="mt-1 text-xs text-[var(--ui-text)]">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.revokedAt))}</p></div>}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="min-w-0 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] p-2.5"><p className="mb-1 text-[10px] text-[var(--ui-muted)]">مرورگر و سیستم عامل هنگام ورود</p><p dir="ltr" className="break-all text-left text-[11px] leading-5 text-[var(--ui-muted)]">{session.loginUserAgent || "برای نشست قدیمی ذخیره نشده"}</p></div>
                      <div className="min-w-0 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] p-2.5"><p className="mb-1 text-[10px] text-[var(--ui-muted)]">آخرین مرورگر و سیستم عامل مشاهده‌شده هنگام نوسازی</p><p dir="ltr" className="break-all text-left text-[11px] leading-5 text-[var(--ui-muted)]">{session.lastUserAgent || session.userAgent || "ثبت نشده"}</p></div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm text-[var(--ui-muted)]">نقش حساب<select className={fieldClass+" mt-1"} value={draft.role} onChange={e=>change(customer,"role",e.target.value)}><option value="customer">مشتری</option><option value="admin">مدیر</option></select></label>
      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--ui-border)] px-3 text-sm text-[var(--ui-text)]"><input type="checkbox" checked={draft.isActive} onChange={e=>change(customer,"isActive",e.target.checked)}/>حساب فعال باشد</label></div>
      {draft.role==="admin"&&<fieldset className="mt-4 rounded-xl border border-[var(--ui-border)] p-3"><legend className="px-2 text-sm font-semibold text-[var(--ui-text)]">مجوزهای مدیر</legend><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{permissions.map(([value,label])=><label key={value} className="flex min-h-10 items-start gap-2 rounded-lg bg-[var(--ui-surface-raised)] p-2 text-sm text-[var(--ui-text)]"><input type="checkbox" className="mt-1 shrink-0" checked={draft.permissions.includes(value)} onChange={e=>change(customer,"permissions",e.target.checked?(value==="*"?["*"]:[...draft.permissions.filter(x=>x!=="*"),value]):draft.permissions.filter(x=>x!==value))}/><span>{label}</span></label>)}</div><p className="mt-2 text-xs leading-5 text-[var(--ui-muted)]">حداقل یک مدیر فعال باید مجوز «مدیریت دسترسی‌ها» یا «دسترسی کامل» را حفظ کند؛ سایر مدیران می‌توانند فقط مجوزهای موردنیاز خود را داشته باشند.</p></fieldset>}
    </article>})}
    <div className="flex items-center justify-between gap-3 text-sm text-[var(--ui-muted)]"><button type="button" disabled={page<=1} onClick={()=>setPage(v=>v-1)} className="min-h-10 rounded-full border border-[var(--ui-border)] px-4 disabled:opacity-40">صفحه قبل</button><span>صفحه {page} از {totalPages}</span><button type="button" disabled={page>=totalPages} onClick={()=>setPage(v=>v+1)} className="min-h-10 rounded-full border border-[var(--ui-border)] px-4 disabled:opacity-40">صفحه بعد</button></div></div>}
  </section>;
}
