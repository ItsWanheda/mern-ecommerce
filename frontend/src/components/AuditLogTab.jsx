import { useCallback, useEffect, useState } from "react";
import { Activity, Clock3, LoaderCircle, RefreshCw, Search, ScrollText } from "lucide-react";
import axios from "../lib/axios";
import { formatIranianDateTime } from "../lib/iranian-date";

const actionLabels = {
  "product.created": "ایجاد محصول",
  "product.deleted": "حذف محصول",
  "product.stock_updated": "تغییر موجودی محصول",
  "product.variant_stock_updated": "تغییر موجودی تنوع محصول",
  "product.featured_toggled": "تغییر وضعیت محصول منتخب",
  "category.created": "ایجاد دسته‌بندی",
  "category.updated": "ویرایش دسته‌بندی",
  "category.deleted": "حذف دسته‌بندی",
  "campaign.created": "ایجاد کمپین",
  "campaign.updated": "ویرایش کمپین",
  "campaign.deleted": "حذف کمپین",
  "shipping.settings_updated": "تغییر تنظیمات ارسال",
  "order.shipment_status_updated": "تغییر وضعیت ارسال سفارش",
  "order.shipment_tracking_updated": "ویرایش اطلاعات رهگیری",
};
const targetLabels = {
  product: "محصول",
  category: "دسته‌بندی",
  campaign: "کمپین",
  order: "سفارش",
  store_settings: "تنظیمات فروشگاه",
};
const fieldLabels = {
  name: "نام",
  title: "عنوان",
  description: "توضیحات",
  slug: "نامک (Slug)",
  parentId: "شناسه دسته والد",
  category: "دسته‌بندی",
  categoryId: "شناسه دسته‌بندی",
  image: "تصویر",
  primaryImage: "تصویر اصلی",
  imageCount: "تعداد تصاویر",
  gallery: "گالری تصاویر",
  price: "قیمت (تومان)",
  stock: "موجودی",
  size: "سایز",
  sizes: "سایزها",
  color: "رنگ",
  colors: "رنگ‌ها",
  variant: "تنوع محصول",
  variants: "تنوع‌ها و موجودی",
  variantCount: "تعداد تنوع‌ها",
  fit: "تن‌خور",
  sizeChart: "جدول اندازه‌ها",
  isFeatured: "محصول منتخب",
  isActive: "وضعیت فعال",
  sortOrder: "ترتیب نمایش",
  showInNavigation: "نمایش در منو",
  attributes: "ویژگی‌های دسته‌بندی",
  href: "مقصد لینک کمپین",
  startsAt: "شروع کمپین",
  endsAt: "پایان کمپین",
  productIds: "شناسه محصولات مرتبط",
  productName: "نام محصول",
  productCount: "تعداد محصولات مرتبط",
  shipmentStatus: "وضعیت ارسال",
  shippingCarrier: "شرکت حمل‌ونقل",
  trackingCode: "کد رهگیری",
  shippedAt: "زمان ارسال",
  deliveredAt: "زمان تحویل",
  flatRate: "هزینه ثابت ارسال (تومان)",
  freeShippingThreshold: "آستانه ارسال رایگان (تومان)",
  hasInventory: "دارای اطلاعات موجودی",
  currency: "واحد پول",
  note: "یادداشت ارسال",
  orderId: "شناسه سفارش",
  shipmentEventCount: "تعداد رویدادهای ارسال",
  hasTrackingCode: "کد رهگیری ثبت شده",
  metadata: "اطلاعات تکمیلی",
  changedFields: "فیلدهای تغییر یافته",
  changeCount: "تعداد فیلدهای تغییر یافته",
};

const valueText = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (typeof value === "number") return new Intl.NumberFormat("fa-IR").format(value);
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map((entry, index) => {
      if (entry && typeof entry === "object") {
        const description = Object.entries(entry)
          .map(([key, item]) => (fieldLabels[key] || key) + ": " + valueText(item))
          .join(" · ");
        return (index + 1) + ". " + description;
      }
      return String(entry);
    }).join("\n");
  }
  if (typeof value === "object") return Object.entries(value)
    .map(([key, item]) => (fieldLabels[key] || key) + ": " + valueText(item))
    .join(" · ");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return formatIranianDateTime(value);
  return String(value);
};

const AuditValue = ({ value }) => (
  value && typeof value === "object" ? (
    <pre dir="ltr" className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-left text-[11px] leading-5 text-gray-300">{JSON.stringify(value, null, 2)}</pre>
  ) : <span className="break-words">{valueText(value)}</span>
);

const AuditLogTab = () => {
  const [logs, setLogs] = useState([]);
  const [actionInput, setActionInput] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get("/admin/audit-logs", { params: { page, limit: 30, ...(action ? { action } : {}) } });
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "بارگذاری تاریخچه اقدامات ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const applyFilter = (event) => {
    event.preventDefault();
    setPage(1);
    setAction(actionInput.trim());
  };

  return (
    <section dir="rtl" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white"><ScrollText size={22} aria-hidden="true" />تاریخچه دقیق اقدامات مدیریتی</h2>
          <p className="mt-1 text-sm leading-6 text-gray-400">جزئیات قبل و بعد از تغییر، عامل، هدف، زمان، مسیر درخواست و اطلاعات ثبت‌شده هر رویداد را بررسی کنید.</p>
        </div>
        <button type="button" onClick={loadLogs} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gray-600 px-4 py-2 text-sm text-gray-200 disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />به‌روزرسانی</button>
      </div>

      <form onSubmit={applyFilter} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="audit-action-filter">فیلتر نوع اقدام</label>
        <input id="audit-action-filter" value={actionInput} onChange={(event) => setActionInput(event.target.value)} maxLength={120} className="min-h-11 flex-1 rounded-lg border border-gray-600 bg-gray-900/70 px-3 text-sm text-white outline-none focus:border-[#d6b779]" placeholder="فیلتر رویداد؛ مثلاً product.stock_updated یا campaign.created" />
        <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#68745f] px-5 text-sm font-semibold text-white"><Search size={16} aria-hidden="true" />جست‌وجو</button>
      </form>

      {loading ? (
        <div role="status" className="flex min-h-36 items-center justify-center gap-3 text-sm text-gray-400"><LoaderCircle size={20} className="animate-spin" aria-hidden="true" />در حال بارگذاری…</div>
      ) : error ? (
        <p role="alert" className="rounded-xl border border-red-700/40 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center text-sm text-gray-400">برای این فیلتر، سابقه‌ای ثبت نشده است.</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, index) => {
            const metadata = log.metadata && typeof log.metadata === "object" ? log.metadata : {};
            const before = metadata.before && typeof metadata.before === "object" ? metadata.before : null;
            const after = metadata.after && typeof metadata.after === "object" ? metadata.after : null;
            const changes = metadata.changes && typeof metadata.changes === "object"
              ? Object.entries(metadata.changes)
              : before && after
                ? [...new Set([...Object.keys(before), ...Object.keys(after)])]
                    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
                    .map((key) => [key, { before: before[key], after: after[key] }])
                : [];
            const remaining = Object.fromEntries(Object.entries(metadata).filter(([key]) => !["before", "after", "changes", "changedFields", "changeCount"].includes(key)));
            const actorName = log.actor?.name || log.actorName || "مدیر ثبت‌نشده";
            const targetName = targetLabels[log.targetType] || log.targetType || "هدف نامشخص";

            return (
              <article key={log._id || (log.action + "-" + index)} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-700 p-4 sm:p-5">
                  <div className="min-w-0">
                    <p className="font-semibold leading-6 text-white">{log.summary || actionLabels[log.action] || "اقدام مدیریتی"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-gray-600 bg-gray-900/60 px-2.5 py-1 text-[11px] text-[#d6b779]">{actionLabels[log.action] || log.action}</span>
                      <span className="rounded-full bg-gray-700 px-2.5 py-1 text-[11px] text-gray-200">{targetName}</span>
                    </div>
                  </div>
                  <time className="inline-flex items-center gap-1.5 text-xs text-gray-400"><Clock3 size={14} aria-hidden="true" />{formatIranianDateTime(log.createdAt)}</time>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-500">عامل رویداد</p>
                    <p className="mt-1 break-words text-sm font-semibold text-gray-100">{actorName}</p>
                    {(log.actorRole || log.actor?.role) && <p className="mt-1 text-xs text-gray-400">نقش: {log.actorRole || log.actor.role}</p>}
                    {(log.actor?._id || log.actor) && <p dir="ltr" className="mt-1 break-all text-[10px] text-gray-500">شناسه: {String(log.actor?._id || log.actor)}</p>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-500">هدف / شناسه</p>
                    <p className="mt-1 text-sm text-gray-200">{targetName}</p>
                    <p dir="ltr" className="mt-1 break-all text-left font-mono text-[11px] text-gray-400">{log.targetId || "—"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-500">آدرس IP</p>
                    <p dir="ltr" className="mt-1 break-all text-left font-mono text-sm text-gray-200">{log.ip || "—"}</p>
                  </div>
                </div>

                {changes.length > 0 && (
                  <div className="border-t border-gray-700 p-4 sm:p-5">
                    <h3 className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-white"><Activity size={16} className="text-[#d6b779]" aria-hidden="true" />تغییرات ثبت‌شده (قبل ← بعد)<span className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] text-gray-300">{new Intl.NumberFormat("fa-IR").format(changes.length)} فیلد</span></h3>
                    <div className="space-y-2">
                      {changes.map(([key, delta]) => (
                        <div key={key} className="grid gap-2 rounded-lg border border-gray-700 bg-gray-900/40 p-3 sm:grid-cols-[minmax(7rem,0.65fr)_1fr_1fr] sm:items-start">
                          <p className="text-xs font-semibold text-gray-300">{fieldLabels[key] || key}</p>
                          <div className="min-w-0">
                            <p className="mb-1 text-[10px] text-gray-500">مقدار قبلی</p>
                            <div className="text-xs leading-5 text-gray-300"><AuditValue value={delta?.before} /></div>
                          </div>
                          <div className="min-w-0">
                            <p className="mb-1 text-[10px] text-gray-500">مقدار جدید</p>
                            <div className="text-xs leading-5 text-white"><AuditValue value={delta?.after} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-700 px-4 py-3 sm:px-5">
                  <details>
                    <summary className="cursor-pointer select-none text-xs font-semibold text-[#d6b779]">تمام جزئیات رویداد و درخواست</summary>
                    <div className="mt-3 space-y-4">
                      {before && <div><h4 className="mb-2 text-xs font-semibold text-gray-300">تصویر قبل از تغییر</h4><AuditValue value={before} /></div>}
                      {after && <div><h4 className="mb-2 text-xs font-semibold text-gray-300">تصویر بعد از تغییر</h4><AuditValue value={after} /></div>}
                      {Object.keys(remaining).length > 0 && (
                        <div>
                          <h4 className="mb-2 text-xs font-semibold text-gray-300">اطلاعات تکمیلی</h4>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {Object.entries(remaining).map(([key, value]) => (
                              <div key={key} className="min-w-0 rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                                <p className="mb-1 text-[11px] text-gray-500">{fieldLabels[key] || key}</p>
                                <div className="text-xs leading-5 text-gray-200"><AuditValue value={value} /></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                          <p className="mb-1 text-[11px] text-gray-500">روش درخواست</p>
                          <p dir="ltr" className="text-left text-xs font-semibold text-gray-200">{log.requestMethod || "—"}</p>
                        </div>
                        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                          <p className="mb-1 text-[11px] text-gray-500">مسیر درخواست</p>
                          <p dir="ltr" className="break-all text-left text-xs text-gray-200">{log.requestPath || "—"}</p>
                        </div>
                        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3 sm:col-span-2">
                          <p className="mb-1 text-[11px] text-gray-500">مرورگر / User-Agent</p>
                          <p dir="ltr" className="break-all text-left text-xs leading-5 text-gray-300">{log.userAgent || "—"}</p>
                        </div>
                        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                          <p className="mb-1 text-[11px] text-gray-500">شناسه درخواست</p>
                          <p dir="ltr" className="break-all text-left text-xs text-gray-200">{log.requestId || "—"}</p>
                        </div>
                        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                          <p className="mb-1 text-[11px] text-gray-500">میزبان درخواست</p>
                          <p dir="ltr" className="break-all text-left text-xs text-gray-200">{log.requestHost || "—"}</p>
                        </div>
                        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                          <p className="mb-1 text-[11px] text-gray-500">مبدأ درخواست</p>
                          <p dir="ltr" className="break-all text-left text-xs text-gray-200">{log.requestOrigin || "—"}</p>
                        </div>
                        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3 sm:col-span-2">
                          <p className="mb-1 text-[11px] text-gray-500">صفحه مرجع (بدون query string)</p>
                          <p dir="ltr" className="break-all text-left text-xs text-gray-200">{log.refererPath || "—"}</p>
                        </div>
                      </div>
                      <details>
                        <summary className="cursor-pointer select-none text-[11px] text-gray-400">نمایش JSON کامل برای بررسی فنی</summary>
                        <pre dir="ltr" className="mt-2 max-h-96 overflow-auto rounded-lg bg-black/60 p-3 text-left text-[11px] leading-5 text-gray-300">{JSON.stringify(log, null, 2)}</pre>
                      </details>
                    </div>
                  </details>
                </div>
              </article>
            );
          })}
          <div className="flex items-center justify-between gap-3 text-sm text-gray-400">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-full border border-gray-600 px-4 py-2 disabled:opacity-40">جدیدتر</button>
            <span>{new Intl.NumberFormat("fa-IR").format(pagination.total || 0)} رویداد · صفحه {new Intl.NumberFormat("fa-IR").format(page)} از {new Intl.NumberFormat("fa-IR").format(Math.max(1, pagination.totalPages || 1))}</span>
            <button type="button" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((value) => value + 1)} className="rounded-full border border-gray-600 px-4 py-2 disabled:opacity-40">قدیمی‌تر</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default AuditLogTab;
