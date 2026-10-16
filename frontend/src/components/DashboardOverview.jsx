import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, AlertTriangle, ArrowLeft, Boxes, CircleDollarSign, LoaderCircle, RefreshCw, ShoppingBasket, Truck, Users } from "lucide-react";
import axios from "../lib/axios";
import { formatPrice } from "../lib/commerce";
const count = (value) => new Intl.NumberFormat("fa-IR").format(Number(value) || 0);
const DashboardOverview = () => {
  const [, setSearchParams] = useSearchParams();
  const [snapshot, setSnapshot] = useState({ analytics: null, orders: null, stock: null, operations: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    const results = await Promise.allSettled([
      axios.get("/analytics", { params: { days: 7 } }),
      axios.get("/orders/admin", { params: { page: 1, limit: 5 } }),
      axios.get("/products", { params: { page: 1, limit: 5, stock: "out_of_stock", status: "active" } }),
      axios.get("/admin/operations"),
    ]);
    setSnapshot({
      analytics: results[0].status === "fulfilled" ? results[0].value.data.analyticsData : null,
      orders: results[1].status === "fulfilled" ? results[1].value.data : null,
      stock: results[2].status === "fulfilled" ? results[2].value.data : null,
      operations: results[3].status === "fulfilled" ? results[3].value.data : null,
    });
    setError(results.some((result) => result.status === "rejected") ? "برخی شاخص‌ها در دسترس نیستند؛ بخش‌های قابل‌دسترسی نمایش داده شده‌اند." : "");
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const go = (tab) => setSearchParams((current) => { const next = new URLSearchParams(current); next.set("tab", tab); return next; });
  const analytics = snapshot.analytics || {}, ops = snapshot.operations || {};
  const orderRows = Array.isArray(snapshot.orders?.orders) ? snapshot.orders.orders : [];
  const lowStock = Number(snapshot.stock?.pagination?.total || 0);
  const stats = [
    { title: "فروش ثبت‌شده در ۷ روز", value: formatPrice(analytics.totalRevenue || 0), icon: CircleDollarSign, tab: "analytics", detail: count(analytics.totalSales) + " سفارش پرداخت‌شده" },
    { title: "مشتریان ثبت‌شده", value: count(analytics.users), icon: Users, tab: "analytics", detail: "کل حساب‌های کاربری" },
    { title: "محصولات فعال", value: count(analytics.products), icon: ShoppingBasket, tab: "products", detail: "فهرست و موجودی کالا" },
    { title: "در صف ارسال", value: count(ops.fulfillment?.paidAwaitingShipment), icon: Truck, tab: "orders", detail: "سفارش‌های پرداخت‌شده" },
    { title: "بدون موجودی", value: count(lowStock), icon: Boxes, tab: "products", detail: "نیازمند رسیدگی" },
    { title: "رویدادهای مدیریتی در ۲۴ ساعت", value: count(ops.audit?.eventsLast24Hours), icon: Activity, tab: "audit", detail: "ردیابی اقدامات مدیریتی" },
  ];
  return <section dir="rtl" className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-gray-700 bg-gray-800 p-5 sm:p-7">
      <div><p className="text-xs font-semibold tracking-wide text-[var(--brand-muted)]">نمای کلی فروشگاه</p><h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">خوش آمدید به پنل مدیریت</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">فروش، سفارش‌های در صف، موجودی و سلامت عملیات را از یک نقطه بررسی کنید.</p></div>
      <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gray-600 px-4 py-2 text-sm text-gray-200 disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />به‌روزرسانی</button>
    </header>
    {error && <p role="status" className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">{error}</p>}
    {loading && !snapshot.analytics && !snapshot.orders && !snapshot.stock && !snapshot.operations ? <div role="status" className="flex min-h-52 items-center justify-center gap-3 text-sm text-gray-400"><LoaderCircle size={22} className="animate-spin" aria-hidden="true" />در حال جمع‌آوری شاخص‌ها…</div> :
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stats.map(({ title, value, icon: Icon, tab, detail }) => <button key={title} type="button" onClick={() => go(tab)} className="group rounded-2xl border border-gray-700 bg-gray-800 p-5 text-right transition hover:border-[var(--brand-muted)] hover:bg-gray-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-muted)]"><span className="flex items-center justify-between gap-3 text-sm text-gray-300"><span>{title}</span><Icon size={20} className="text-[var(--brand-muted)]" aria-hidden="true" /></span><span className="mt-4 block break-words text-2xl font-bold text-white sm:text-3xl">{value}</span><span className="mt-2 block text-xs text-gray-400">{detail}</span></button>)}</div>}
    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-bold text-white">سفارش‌های اخیر</h3><p className="mt-1 text-xs text-gray-400">برای مشاهده آدرس و رهگیری وارد صف سفارش‌ها شوید.</p></div><button type="button" onClick={() => go("orders")} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-gray-600 px-3 text-xs text-gray-200 hover:bg-gray-700">همه سفارش‌ها<ArrowLeft size={14} aria-hidden="true" /></button></div>
      {orderRows.length ? <div className="divide-y divide-gray-700">{orderRows.map((order) => <button key={order._id} type="button" onClick={() => go("orders")} className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-right hover:bg-gray-700/30"><span className="min-w-0"><span dir="ltr" className="block break-all text-xs font-semibold text-white">{String(order._id).slice(-10)}</span><span className="mt-1 block text-xs text-gray-400">{order.user?.name || order.user?.email || "مشتری"} · {order.shipmentStatus || "در صف آماده‌سازی"}</span></span><span dir="ltr" className="shrink-0 text-sm font-semibold text-[var(--brand-muted)]">{formatPrice(order.totalAmount || 0)}</span></button>)}</div> : <p className="py-6 text-sm text-gray-400">سفارشی برای نمایش وجود ندارد.</p>}</section>
      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5"><h3 className="font-bold text-white">اقدام‌های سریع</h3><div className="mt-4 grid gap-2">
        <button type="button" onClick={() => go("create")} className="flex min-h-11 items-center justify-between rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]">افزودن محصول<ArrowLeft size={15} aria-hidden="true" /></button>
        <button type="button" onClick={() => go("products")} className="flex min-h-11 items-center justify-between rounded-xl border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">بررسی موجودی<ArrowLeft size={15} aria-hidden="true" /></button>
        <button type="button" onClick={() => go("campaigns")} className="flex min-h-11 items-center justify-between rounded-xl border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">مدیریت کمپین‌ها<ArrowLeft size={15} aria-hidden="true" /></button>
        <button type="button" onClick={() => go("operations")} className="flex min-h-11 items-center justify-between rounded-xl border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"><span className="inline-flex items-center gap-2"><AlertTriangle size={15} aria-hidden="true" />وضعیت سامانه</span><ArrowLeft size={15} aria-hidden="true" /></button>
      </div><p className="mt-4 text-[11px] leading-5 text-gray-500">گزارش‌ها از داده‌های فعلی فروشگاه محاسبه می‌شوند؛ اگر سرویسی در دسترس نباشد، سایر شاخص‌ها نمایش داده می‌شوند.</p></section>
    </div>
  </section>;
};
export default DashboardOverview;
