import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ClipboardList, LoaderCircle, RefreshCw, Truck } from "lucide-react";
import axios from "../lib/axios";
import { formatPrice } from "../lib/commerce";
import { formatIranianDateTime } from "../lib/iranian-date";

const shipmentLabels = {
  not_ready: "در انتظار تکمیل اطلاعات ارسال",
  processing: "در حال آماده‌سازی",
  packed: "بسته‌بندی شد",
  shipped: "ارسال شد",
  delivered: "تحویل داده شد",
  returned: "مرجوع شد",
};
const paymentLabels = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت تأیید شد",
  failed: "پرداخت ناموفق",
  expired: "منقضی شد",
  unknown: "وضعیت پرداخت ثبت نشده",
};

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get("/orders/mine", { params: { page, limit: 10 } });
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setPagination(data.pagination || { page, totalPages: 1, total: 0 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "بارگذاری سفارش‌ها انجام نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  return (
    <main dir="rtl" className="mx-auto min-h-[65vh] max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#68745f]">حساب کاربری</p>
          <h1 className="mt-1 text-2xl font-bold text-[#252722] sm:text-3xl">سفارش‌های من و رهگیری</h1>
          <p className="mt-2 text-sm leading-6 text-[#77786f]">وضعیت پرداخت، نشانی ثبت‌شده و مراحل ارسال سفارش‌های خود را مشاهده کنید.</p>
        </div>
        <button type="button" onClick={loadOrders} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d5d0c5] bg-white px-4 py-2 text-sm font-semibold text-[#41443b] disabled:opacity-50">
          <RefreshCw size={16} aria-hidden="true" />به‌روزرسانی
        </button>
      </div>

      {loading ? (
        <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-[#77786f]"><LoaderCircle size={20} className="animate-spin" aria-hidden="true" />در حال بارگذاری سفارش‌ها…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm leading-7 text-red-800">
          <p role="alert">{error}</p>
          <button type="button" onClick={loadOrders} className="mt-3 font-semibold underline underline-offset-4">تلاش دوباره</button>
        </div>
      ) : orders.length === 0 ? (
        <section className="rounded-2xl border border-[#e4e0d8] bg-white p-8 text-center sm:p-12">
          <ClipboardList size={36} className="mx-auto text-[#68745f]" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold text-[#252722]">هنوز سفارشی ثبت نشده است</h2>
          <p className="mt-2 text-sm text-[#77786f]">بعد از ثبت سفارش، وضعیت پرداخت و اطلاعات رهگیری در همین صفحه نمایش داده می‌شود.</p>
          <Link to="/shop" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#252722] px-5 py-2 text-sm font-semibold text-white"><ArrowLeft size={16} aria-hidden="true" />مشاهده محصولات</Link>
        </section>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const address = order.shippingAddress;
            const paymentStatus = order.paymentStatus || "unknown";
            const shipmentStatus = order.shipmentStatus || (paymentStatus === "paid" ? "processing" : "not_ready");
            const shipmentStatusLabel = shipmentLabels[shipmentStatus] || shipmentStatus;
            const paymentStatusClass = paymentStatus === "paid"
              ? "bg-emerald-50 text-emerald-700"
              : paymentStatus === "pending"
                ? "bg-amber-50 text-amber-800"
                : paymentStatus === "unknown"
                  ? "bg-gray-100 text-gray-700"
                  : "bg-red-50 text-red-700";

            return (
              <article key={order._id} className="overflow-hidden rounded-2xl border border-[#e4e0d8] bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eeeae2] bg-[#fffefa] p-4 sm:p-5">
                  <div>
                    <p className="text-xs text-[#85867d]">شماره سفارش</p>
                    <p dir="ltr" className="mt-1 break-all text-sm font-bold text-[#252722]">{order._id}</p>
                    <p className="mt-1 text-xs text-[#85867d]">ثبت سفارش: {formatIranianDateTime(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${paymentStatusClass}`}>{paymentLabels[paymentStatus] || paymentStatus}</span>
                    <span className="rounded-full bg-[#e9ede4] px-3 py-1.5 text-xs font-semibold text-[#41443b]">{shipmentStatusLabel}</span>
                  </div>
                </div>
                <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <section>
                    <h2 className="mb-3 text-sm font-bold text-[#252722]">محصولات سفارش</h2>
                    <div className="space-y-3">
                      {(order.products || []).map((item, index) => (
                        <div key={`${order._id}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f5f0] p-3">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-[#252722]">{item.productName || item.product?.name || "محصول"}</p>
                            <p className="mt-1 text-xs text-[#77786f]">تعداد: {new Intl.NumberFormat("fa-IR").format(item.quantity)}{item.size ? ` · سایز ${item.size}` : ""}{item.color ? ` · ${item.color}` : ""}</p>
                          </div>
                          <p dir="ltr" className="shrink-0 text-sm font-semibold text-[#68745f]">{formatPrice(Number(item.price) * Number(item.quantity))}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#eeeae2] pt-4">
                      <span className="text-sm font-bold text-[#252722]">مبلغ کل</span>
                      <span dir="ltr" className="text-lg font-bold text-[#68745f]">{formatPrice(order.totalAmount)}</span>
                    </div>
                  </section>
                  <div className="space-y-4">
                    <section className="rounded-xl border border-[#e4e0d8] p-4">
                      <h2 className="mb-2 text-sm font-bold text-[#252722]">نشانی تحویل</h2>
                      {address ? (
                        <div className="space-y-1.5 text-sm leading-6 text-[#55574f]">
                          <p className="font-semibold text-[#252722]">{address.recipientName}</p>
                          <p dir="ltr" className="text-right">{address.phone}</p>
                          <p>{[address.province, address.city, address.district].filter(Boolean).join("، ")}</p>
                          <p>{address.addressLine}</p>
                          <p>کد پستی: <span dir="ltr" className="inline-block">{address.postalCode}</span></p>
                          {address.notes && <p className="text-xs text-[#77786f]">توضیحات: {address.notes}</p>}
                        </div>
                      ) : <p className="text-sm leading-6 text-[#77786f]">این سفارش پیش از فعال‌شدن ثبت نشانی ایجاد شده است؛ برای اطلاعات ارسال با پشتیبانی تماس بگیرید.</p>}
                    </section>

                    <section className="rounded-xl border border-[#e4e0d8] p-4">
                      <div className="flex items-center gap-2">
                        <Truck size={18} className="text-[#68745f]" aria-hidden="true" />
                        <h2 className="text-sm font-bold text-[#252722]">اطلاعات رهگیری</h2>
                      </div>
                      {order.shippingCarrier && <p className="mt-3 text-sm text-[#55574f]">شرکت حمل: <span className="font-semibold">{order.shippingCarrier}</span></p>}
                      {order.trackingCode && <p className="mt-2 text-sm text-[#55574f]">کد رهگیری: <span dir="ltr" className="inline-block break-all font-semibold">{order.trackingCode}</span></p>}
                      {order.shippedAt && <p className="mt-2 text-xs text-[#77786f]">تاریخ ارسال: {formatIranianDateTime(order.shippedAt)}</p>}
                      {order.deliveredAt && <p className="mt-1 text-xs text-[#77786f]">تاریخ تحویل: {formatIranianDateTime(order.deliveredAt)}</p>}
                      {(order.shipmentEvents || []).length > 0 && (
                        <ol className="mt-4 space-y-3 border-r border-[#d5d0c5] pr-4">
                          {order.shipmentEvents.slice().reverse().map((event, index) => (
                            <li key={`${order._id}-event-${index}`} className="relative text-xs leading-5 text-[#55574f]">
                              <span className="absolute -right-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-[#68745f]" aria-hidden="true" />
                              <p className="font-semibold">{shipmentLabels[event.status] || event.status}</p>
                              {event.note && <p className="mt-0.5">{event.note}</p>}
                              <p className="mt-0.5 text-[#85867d]">{formatIranianDateTime(event.createdAt)}</p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>
                  </div>
                </div>
              </article>
            );
          })}
          <div className="flex items-center justify-between gap-3">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-full border border-[#d5d0c5] bg-white px-4 py-2 text-sm font-semibold text-[#41443b] disabled:opacity-40">سفارش‌های جدیدتر</button>
            <p className="text-xs text-[#77786f]">صفحه {new Intl.NumberFormat("fa-IR").format(page)} از {new Intl.NumberFormat("fa-IR").format(Math.max(1, pagination.totalPages || 1))}</p>
            <button type="button" disabled={page >= (pagination.totalPages || 1) || loading} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-full border border-[#d5d0c5] bg-white px-4 py-2 text-sm font-semibold text-[#41443b] disabled:opacity-40">سفارش‌های قدیمی‌تر</button>
          </div>
        </div>
      )}
    </main>
  );
};

export default MyOrdersPage;
