import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, Save, Truck } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { formatPrice } from "../lib/commerce";

const statuses = [
  ["processing", "در حال آماده‌سازی"],
  ["packed", "بسته‌بندی شد"],
  ["shipped", "ارسال شد"],
  ["delivered", "تحویل داده شد"],
  ["returned", "مرجوع شد"],
];
const labels = Object.fromEntries(statuses);

const formatDate = (value) => value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const nextOptions = (status) => {
  const current = status || "processing";
  if (current === "not_ready") return ["processing"];
  const rank = { processing: 1, packed: 2, shipped: 3, delivered: 4, returned: 5 };
  return statuses.map(([value]) => value).filter((value) =>
    value === current || (value === "returned" ? current === "delivered" : rank[value] === rank[current] + 1)
  );
};

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get("/orders/admin", { params: { page, limit: 25, ...(filter ? { shipmentStatus: filter } : {}) } });
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setPagination(data.pagination || { totalPages: 1, total: 0 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "بارگذاری سفارش‌ها انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const draftFor = (order) => ({
    status: !order.shipmentStatus || order.shipmentStatus === "not_ready" ? "processing" : order.shipmentStatus,
    shippingCarrier: order.shippingCarrier || "",
    trackingCode: order.trackingCode || "",
    note: "",
    ...(drafts[order._id] || {}),
  });

  const changeDraft = (orderId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [orderId]: { ...(current[orderId] || {}), [field]: value },
    }));
  };

  const saveShipment = async (order) => {
    const draft = draftFor(order);
    setSavingId(order._id);
    try {
      await axios.patch(`/orders/${order._id}/shipment`, draft);
      toast.success("وضعیت ارسال و اطلاعات رهگیری ذخیره شد");
      setDrafts((current) => {
        const next = { ...current };
        delete next[order._id];
        return next;
      });
      await loadOrders();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "ذخیره وضعیت ارسال ناموفق بود");
    } finally {
      setSavingId("");
    }
  };

  const fieldClass = "mt-1 w-full rounded-lg border border-gray-600 bg-gray-900/70 px-3 py-2 text-sm text-white outline-none focus:border-[#9aa58e] focus:ring-2 focus:ring-[#68745f]/30";
  return (
    <section dir="rtl" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">مدیریت سفارش و رهگیری ارسال</h2>
          <p className="mt-1 text-sm leading-6 text-gray-400">فقط سفارش‌های پرداخت‌شده نمایش داده می‌شوند. وضعیت هر سفارش را به‌ترتیب به‌روزرسانی کنید.</p>
        </div>
        <button type="button" onClick={loadOrders} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gray-600 px-4 py-2 text-sm text-gray-200 disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />به‌روزرسانی</button>
      </div>

      <label className="block max-w-sm text-sm text-gray-300">فیلتر وضعیت ارسال
        <select className={fieldClass} value={filter} onChange={(event) => { setPage(1); setFilter(event.target.value); }}>
          <option value="">همه سفارش‌های پرداخت‌شده</option>
          <option value="not_ready">در انتظار آماده‌سازی</option>
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      {loading ? <div role="status" className="flex min-h-36 items-center justify-center gap-3 text-sm text-gray-400"><LoaderCircle className="animate-spin" size={20} aria-hidden="true" />در حال بارگذاری…</div>
        : error ? <p role="alert" className="rounded-xl border border-red-700/40 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>
        : orders.length === 0 ? <div className="rounded-2xl border border-gray-700 bg-gray-800 p-8 text-center text-sm text-gray-400">سفارشی با این وضعیت وجود ندارد.</div>
        : <div className="space-y-4">
          {orders.map((order) => {
            const draft = draftFor(order);
            const address = order.shippingAddress;
            return (
              <article key={order._id} className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-700 bg-gray-900/30 p-4 sm:p-5">
                  <div>
                    <p className="text-xs text-gray-400">شماره سفارش</p>
                    <p dir="ltr" className="mt-1 break-all text-sm font-bold text-white">{order._id}</p>
                    <p className="mt-1 text-xs text-gray-400">{formatDate(order.createdAt)} · {order.user?.name || order.user?.email || "مشتری"}</p>
                  </div>
                  <div className="text-left">
                    <p dir="ltr" className="text-lg font-bold text-[#9aa58e]">{formatPrice(order.totalAmount)}</p>
                    <span className="mt-1 inline-flex rounded-full bg-[#68745f]/20 px-3 py-1 text-xs text-[#d7dfce]">{labels[draft.status] || "در انتظار آماده‌سازی"}</span>
                  </div>
                </div>
                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                  <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Truck size={16} aria-hidden="true" />نشانی مشتری</h3>
                    {address ? (
                      <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-3 text-sm leading-6 text-gray-300">
                        <p className="font-semibold text-white">{address.recipientName} · <span dir="ltr" className="inline-block">{address.phone}</span></p>
                        <p>{[address.province, address.city, address.district].filter(Boolean).join("، ")}</p>
                        <p>{address.addressLine}</p>
                        <p>کد پستی: <span dir="ltr" className="inline-block">{address.postalCode}</span></p>
                        {address.notes && <p className="mt-1 text-xs text-gray-400">یادداشت: {address.notes}</p>}
                      </div>
                    ) : <p className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3 text-sm text-amber-200">این سفارش آدرس ذخیره‌شده ندارد؛ برای هماهنگی با مشتری تماس بگیرید.</p>}
                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-3">
                      <h3 className="mb-2 text-sm font-bold text-white">اقلام سفارش</h3>
                      {(order.products || []).map((item, index) => <p key={`${order._id}-${index}`} className="py-1 text-xs text-gray-300">{item.productName || item.product?.name || "محصول"} × {new Intl.NumberFormat("fa-IR").format(item.quantity)}</p>)}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-sm font-bold text-white">وضعیت و کد رهگیری</h3>
                    <label className="block text-sm text-gray-300">وضعیت بعدی
                      <select className={fieldClass} value={draft.status} onChange={(event) => changeDraft(order._id, "status", event.target.value)}>
                        {nextOptions(order.shipmentStatus || "processing").map((status) => <option key={status} value={status}>{labels[status] || status}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm text-gray-300">شرکت حمل / پیک
                      <input maxLength={100} className={fieldClass} value={draft.shippingCarrier} onChange={(event) => changeDraft(order._id, "shippingCarrier", event.target.value)} placeholder="پست، تیپاکس، چاپار، پیک…" />
                    </label>
                    <label className="block text-sm text-gray-300">کد رهگیری
                      <input dir="ltr" maxLength={120} className={fieldClass} value={draft.trackingCode} onChange={(event) => changeDraft(order._id, "trackingCode", event.target.value)} placeholder="Tracking code" />
                    </label>
                    <label className="block text-sm text-gray-300">یادداشت برای تاریخچه سفارش (اختیاری)
                      <textarea maxLength={500} rows={2} className={fieldClass} value={draft.note} onChange={(event) => changeDraft(order._id, "note", event.target.value)} placeholder="یادداشت داخلی یا توضیح وضعیت" />
                    </label>
                    {order.shippedAt && <p className="text-xs text-gray-400">ارسال: {formatDate(order.shippedAt)}</p>}
                    {order.deliveredAt && <p className="text-xs text-gray-400">تحویل: {formatDate(order.deliveredAt)}</p>}
                    <button type="button" onClick={() => saveShipment(order)} disabled={savingId === order._id} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#68745f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#41443b] disabled:opacity-50">
                      {savingId === order._id ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}ذخیره رهگیری
                    </button>
                  </section>
                </div>
              </article>
            );
          })}
          <div className="flex items-center justify-between gap-3 text-sm text-gray-400">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-full border border-gray-600 px-4 py-2 disabled:opacity-40">جدیدتر</button>
            <span>صفحه {new Intl.NumberFormat("fa-IR").format(page)} از {new Intl.NumberFormat("fa-IR").format(Math.max(1, pagination.totalPages || 1))}</span>
            <button type="button" disabled={page >= (pagination.totalPages || 1) || loading} onClick={() => setPage((value) => value + 1)} className="rounded-full border border-gray-600 px-4 py-2 disabled:opacity-40">قدیمی‌تر</button>
          </div>
        </div>}
    </section>
  );
};

export default OrderManagement;
