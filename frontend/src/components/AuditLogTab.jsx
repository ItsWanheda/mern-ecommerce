import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, Search, ScrollText } from "lucide-react";
import axios from "../lib/axios";

const formatDate = (value) => value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

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
          <h2 className="flex items-center gap-2 text-xl font-bold text-white"><ScrollText size={22} aria-hidden="true" />تاریخچه اقدامات مدیریتی</h2>
          <p className="mt-1 text-sm leading-6 text-gray-400">تغییرات ثبت‌شده در محصولات، موجودی، کمپین‌ها، تنظیمات ارسال و رهگیری سفارش‌ها.</p>
        </div>
        <button type="button" onClick={loadLogs} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gray-600 px-4 py-2 text-sm text-gray-200 disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />به‌روزرسانی</button>
      </div>
      <form onSubmit={applyFilter} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="audit-action-filter">فیلتر نوع اقدام</label>
        <input id="audit-action-filter" value={actionInput} onChange={(event) => setActionInput(event.target.value)} maxLength={120} className="min-h-11 flex-1 rounded-lg border border-gray-600 bg-gray-900/70 px-3 text-sm text-white outline-none focus:border-[#9aa58e]" placeholder="فیلتر نوع اقدام؛ مثلاً product.stock_updated" />
        <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#68745f] px-5 text-sm font-semibold text-white"><Search size={16} aria-hidden="true" />جست‌وجو</button>
      </form>

      {loading ? <div role="status" className="flex min-h-36 items-center justify-center gap-3 text-sm text-gray-400"><LoaderCircle size={20} className="animate-spin" aria-hidden="true" />در حال بارگذاری…</div>
        : error ? <p role="alert" className="rounded-xl border border-red-700/40 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>
        : logs.length === 0 ? <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center text-sm text-gray-400">برای این فیلتر، سابقه‌ای ثبت نشده است.</div>
        : <div className="space-y-3">
          {logs.map((log, index) => (
            <article key={log._id || `${log.action}-${index}`} className="rounded-xl border border-gray-700 bg-gray-800 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{log.summary}</p>
                  <p dir="ltr" className="mt-1 text-left text-xs text-[#9aa58e]">{log.action}</p>
                </div>
                <time className="text-xs text-gray-400">{formatDate(log.createdAt)}</time>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                <span>مدیر: {log.actor?.name || log.actorName || "مدیر"}</span>
                <span>هدف: {log.targetType || "—"} {log.targetId ? `· ${log.targetId}` : ""}</span>
                {log.ip && <span dir="ltr">IP: {log.ip}</span>}
              </div>
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <details className="mt-3 text-xs text-gray-400">
                  <summary className="cursor-pointer select-none">جزئیات ثبت‌شده</summary>
                  <pre dir="ltr" className="mt-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-left text-[11px] leading-5">{JSON.stringify(log.metadata, null, 2)}</pre>
                </details>
              )}
            </article>
          ))}
          <div className="flex items-center justify-between gap-3 text-sm text-gray-400">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-full border border-gray-600 px-4 py-2 disabled:opacity-40">جدیدتر</button>
            <span>{new Intl.NumberFormat("fa-IR").format(pagination.total || 0)} رویداد</span>
            <button type="button" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((value) => value + 1)} className="rounded-full border border-gray-600 px-4 py-2 disabled:opacity-40">قدیمی‌تر</button>
          </div>
        </div>}
    </section>
  );
};

export default AuditLogTab;
