import { useEffect, useState } from "react";
import { Megaphone, Pause, Play, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";

const dateTimeLocal = (date) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
};
const initialForm = () => ({
  title: "",
  description: "",
  image: "",
  href: "/shop",
  startsAt: dateTimeLocal(new Date()),
  endsAt: dateTimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  sortOrder: "0",
});

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const loadCampaigns = async () => {
    try {
      const response = await axios.get("/campaigns/admin");
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "بارگذاری کمپین‌ها ناموفق بود");
    }
  };

  useEffect(() => { loadCampaigns(); }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await axios.post("/campaigns", {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        sortOrder: Number(form.sortOrder),
      });
      toast.success("کمپین ایجاد شد");
      setForm(initialForm());
      await loadCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.message || "ایجاد کمپین ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaign = async (campaign) => {
    try {
      await axios.patch(`/campaigns/${campaign._id}`, {
        ...campaign,
        startsAt: new Date(campaign.startsAt).toISOString(),
        endsAt: new Date(campaign.endsAt).toISOString(),
        isActive: !campaign.isActive,
      });
      await loadCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.message || "به‌روزرسانی کمپین ناموفق بود");
    }
  };

  const removeCampaign = async (campaign) => {
    if (!window.confirm(`کمپین «${campaign.title}» حذف شود؟`)) return;
    try {
      await axios.delete(`/campaigns/${campaign._id}`);
      setCampaigns((items) => items.filter((item) => item._id !== campaign._id));
      toast.success("کمپین حذف شد");
    } catch (error) {
      toast.error(error.response?.data?.message || "حذف کمپین ناموفق بود");
    }
  };

  const fieldClass = "mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:border-[#68745f] focus:ring-2 focus:ring-[#68745f]/30";

  return (
    <section dir="rtl" className="mx-auto max-w-5xl space-y-8">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-lg sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-[#68745f]" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-semibold text-white">ایجاد کمپین فروشگاهی</h2>
            <p className="mt-1 text-sm text-gray-400">کمپین‌های زمان‌بندی‌شده در صفحه اصلی نمایش داده می‌شوند.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-gray-300">عنوان کمپین<input required maxLength={100} className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="text-sm text-gray-300">لینک داخلی (مثل /shop)<input required pattern="/(?!/).*" className={fieldClass} value={form.href} onChange={(event) => setForm({ ...form, href: event.target.value })} /></label>
          <label className="text-sm text-gray-300 sm:col-span-2">توضیح کوتاه<input maxLength={300} className={fieldClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="text-sm text-gray-300 sm:col-span-2">نشانی تصویر (اختیاری)<input type="url" className={fieldClass} dir="ltr" placeholder="https://…" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></label>
          <label className="text-sm text-gray-300">شروع نمایش<input type="datetime-local" required className={fieldClass} value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
          <label className="text-sm text-gray-300">پایان نمایش<input type="datetime-local" required className={fieldClass} value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
          <label className="text-sm text-gray-300">ترتیب نمایش<input type="number" min="0" step="1" className={fieldClass} value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} /></label>
        </div>
        <button type="submit" disabled={loading} className="mt-5 min-h-11 rounded-full bg-[#68745f] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#41443b] disabled:opacity-50">{loading ? "در حال ذخیره…" : "ایجاد کمپین"}</button>
      </form>

      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-lg sm:p-7">
        <h2 className="mb-4 text-xl font-semibold text-white">کمپین‌های ثبت‌شده</h2>
        {campaigns.length === 0 ? <p className="text-sm text-gray-400">هنوز کمپینی ثبت نشده است.</p> : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <article key={campaign._id} className="flex flex-col gap-4 rounded-xl border border-gray-700 bg-gray-900/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  {campaign.image ? <img src={campaign.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-700"><Megaphone className="text-[#68745f]" size={20} /></div>}
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{campaign.title}</p>
                    <p className="mt-1 truncate text-xs text-gray-400">{campaign.description || campaign.href}</p>
                    <p className="mt-1 text-xs text-gray-500">{new Date(campaign.startsAt).toLocaleDateString("fa-IR")} تا {new Date(campaign.endsAt).toLocaleDateString("fa-IR")}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => toggleCampaign(campaign)} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-gray-600 px-3 text-xs text-gray-200 hover:bg-gray-700">{campaign.isActive ? <Pause size={14} /> : <Play size={14} />}{campaign.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}</button>
                  <button type="button" onClick={() => removeCampaign(campaign)} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-red-900 px-3 text-xs text-red-300 hover:bg-red-950/40"><Trash2 size={14} />حذف</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CampaignManager;
