import { useEffect, useState } from "react";
import { Mail, RefreshCw, Users } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(value))
  : "—";

const NewsletterManager = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, subscribed: 0 });
  const [loading, setLoading] = useState(true);

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/newsletter/admin");
      setSubscribers(Array.isArray(data.subscribers) ? data.subscribers : []);
      setSummary(data.summary || { total: 0, subscribed: 0 });
    } catch (error) {
      toast.error(error.response?.data?.message || "دریافت اعضای خبرنامه ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubscribers(); }, []);

  return (
    <section dir="rtl" className="mx-auto max-w-6xl space-y-5">
      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-lg sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#9aa58e]"><Mail size={21} aria-hidden="true" /><h2 className="text-xl font-semibold text-white">اعضای خبرنامه</h2></div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">ایمیل‌هایی که با رضایت ثبت شده‌اند. سرویس ارسال خبرنامه هنوز متصل نیست؛ این صفحه فقط فهرست و وضعیت عضویت را نمایش می‌دهد.</p>
          </div>
          <button type="button" disabled={loading} onClick={loadSubscribers} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-gray-700 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />به‌روزرسانی</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4"><p className="text-xs text-gray-400">کل نشانی‌های ثبت‌شده</p><p className="mt-2 text-2xl font-semibold text-white tabular-nums">{new Intl.NumberFormat("fa-IR").format(summary.total || 0)}</p></div>
          <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4"><p className="text-xs text-gray-400">عضویت فعال</p><p className="mt-2 text-2xl font-semibold text-[#9aa58e] tabular-nums">{new Intl.NumberFormat("fa-IR").format(summary.subscribed || 0)}</p></div>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3 sm:px-6">
          <h3 className="flex items-center gap-2 font-semibold text-white"><Users size={17} className="text-[#9aa58e]" aria-hidden="true" />فهرست اعضا</h3>
          <span className="text-xs text-gray-400">حداکثر ۵۰۰ مورد اخیر</span>
        </div>
        {loading ? <p role="status" className="p-6 text-center text-sm text-gray-400">در حال دریافت فهرست…</p> : subscribers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full divide-y divide-gray-700">
              <thead className="bg-gray-700/60"><tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300">ایمیل</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300">تاریخ ثبت</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300">رضایت ثبت‌شده</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300">وضعیت عضویت</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-700">
                {subscribers.map((subscriber) => (
                  <tr key={subscriber._id} className="hover:bg-gray-700/40">
                    <td className="px-4 py-3 text-sm text-white" dir="ltr">{subscriber.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(subscriber.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(subscriber.consentedAt)}</td>
                    <td className="px-4 py-3"><span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold " + (subscriber.isSubscribed ? "bg-[#dce2d4] text-[#41443b]" : "bg-gray-700 text-gray-300")}>{subscriber.isSubscribed ? "فعال" : "لغوشده"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="p-6 text-center text-sm text-gray-400">هنوز درخواستی برای عضویت ثبت نشده است.</p>}
      </div>
    </section>
  );
};

export default NewsletterManager;
