import { useEffect, useState } from "react";
import { Copy, ExternalLink, Megaphone, Pause, Play, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import IranianDateTimeInput from "./IranianDateTimeInput";
import { formatIranianDateTimeInput, formatIranianDateTime, parseIranianDateTime } from "../lib/iranian-date";
import { getCampaignPath } from "../lib/campaign-url";

const initialForm = () => ({
  title: "",
  description: "",
  image: "",
  href: "/shop",
  startsAt: formatIranianDateTimeInput(new Date()),
  endsAt: formatIranianDateTimeInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  productIds: [],
  sortOrder: "0",
});

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
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

  const loadProducts = async () => {
    try {
      const response = await axios.get("/products");
      setProducts(Array.isArray(response.data.products) ? response.data.products.filter((product) => product.isActive !== false) : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "بارگذاری محصولات برای کمپین ناموفق بود");
    }
  };

  useEffect(() => { loadCampaigns(); loadProducts(); }, []);

  const copyCampaignLink = async (campaign) => {
    const url = new URL(getCampaignPath(campaign), window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("لینک اختصاصی کمپین کپی شد.");
    } catch {
      toast.error("کپی لینک ممکن نشد؛ نشانی صفحه: " + url);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const startsAt = parseIranianDateTime(form.startsAt);
    const endsAt = parseIranianDateTime(form.endsAt);
    if (!startsAt || !endsAt) {
      toast.error("تاریخ و ساعت را با تقویم شمسی و قالب سال/ماه/روز ساعت:دقیقه وارد کنید.");
      return;
    }
    if (endsAt <= startsAt) {
      toast.error("زمان پایان کمپین باید بعد از زمان شروع باشد.");
      return;
    }
    setLoading(true);
    try {
      await axios.post("/campaigns", {
        ...form,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
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
          <label className="text-sm text-gray-300">مقصد دکمه داخل صفحه کمپین (مثل /shop)<input required pattern="/(?!/).*" className={fieldClass} value={form.href} onChange={(event) => setForm({ ...form, href: event.target.value })} /></label>
          <label className="text-sm text-gray-300 sm:col-span-2">توضیح کوتاه<input maxLength={300} className={fieldClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="text-sm text-gray-300 sm:col-span-2">محصولات مرتبط با این کمپین (اختیاری)
            <select multiple size={Math.min(6, Math.max(3, products.length))} className={fieldClass + " min-h-32"} value={form.productIds}
              onChange={(event) => setForm({ ...form, productIds: [...event.target.selectedOptions].map((option) => option.value) })}>
              {products.map((product) => <option key={product._id} value={product._id}>{product.name} · {new Intl.NumberFormat("fa-IR").format(product.price)} تومان</option>)}
            </select>
            <span className="mt-1 block text-[11px] leading-5 text-gray-400">برای انتخاب چند کالا، در دسکتاپ کلید Ctrl یا Command را نگه دارید. این محصولات در صفحه اختصاصی کمپین نمایش داده می‌شوند.</span>
          </label>
          <label className="text-sm text-gray-300 sm:col-span-2">تصویر کمپین (اختیاری)<input type="url" className={fieldClass} dir="ltr" placeholder="https://…" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></label>
          <IranianDateTimeInput id="campaign-starts-at" label="شروع نمایش" required value={form.startsAt} onChange={(value) => setForm({ ...form, startsAt: value })} />
          <IranianDateTimeInput id="campaign-ends-at" label="پایان نمایش" required value={form.endsAt} onChange={(value) => setForm({ ...form, endsAt: value })} />
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
                    <p className="mt-1 text-xs text-gray-500">{formatIranianDateTime(campaign.startsAt)} تا {formatIranianDateTime(campaign.endsAt)}</p>
                    <p className="mt-1 text-xs text-gray-400">{new Intl.NumberFormat("fa-IR").format((campaign.productIds || []).length)} محصول مرتبط</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Link to={getCampaignPath(campaign)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#9aa58e] hover:text-white">
                        بازکردن صفحه اختصاصی<ExternalLink size={13} aria-hidden="true" />
                      </Link>
                      <button type="button" onClick={() => copyCampaignLink(campaign)} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-gray-700 px-2.5 text-xs text-gray-300 transition hover:border-[#9aa58e] hover:text-white">
                        <Copy size={13} aria-hidden="true" />کپی لینک عمومی
                      </button>
                    </div>
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
