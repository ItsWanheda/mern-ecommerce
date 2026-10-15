import { useEffect, useState } from "react";
import { CalendarClock, Check, LoaderCircle, Pause, Pencil, Play, Plus, TicketPercent, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { formatPrice } from "../lib/commerce";

const formatLocalDateTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const freshForm = () => ({
  code: "",
  description: "",
  discountPercentage: "10",
  startsAt: formatLocalDateTime(new Date()),
  expiresAt: formatLocalDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  minOrderAmount: "0",
  maxDiscountAmount: "",
  usageLimit: "",
  isActive: true,
});

const toForm = (coupon) => ({
  code: coupon.code || "",
  description: coupon.description || "",
  discountPercentage: String(coupon.discountPercentage ?? 10),
  startsAt: formatLocalDateTime(coupon.startsAt),
  expiresAt: formatLocalDateTime(coupon.expiresAt),
  minOrderAmount: String(coupon.minOrderAmount ?? 0),
  maxDiscountAmount: coupon.maxDiscountAmount == null ? "" : String(coupon.maxDiscountAmount),
  usageLimit: coupon.usageLimit == null ? "" : String(coupon.usageLimit),
  isActive: coupon.isActive !== false,
});

const persianNumber = (value) => new Intl.NumberFormat("fa-IR").format(Number(value) || 0);

const CouponManager = () => {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(freshForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  const loadCoupons = async () => {
    setListLoading(true);
    try {
      const response = await axios.get("/coupons/admin");
      setCoupons(response.data.coupons || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "بارگذاری کدهای تخفیف ناموفق بود.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { loadCoupons(); }, []);

  const resetForm = () => {
    setForm(freshForm());
    setEditingId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: new Date(form.expiresAt).toISOString(),
        discountPercentage: Number(form.discountPercentage),
        minOrderAmount: Number(form.minOrderAmount || 0),
        maxDiscountAmount: form.maxDiscountAmount === "" ? null : Number(form.maxDiscountAmount),
        usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
      };
      if (editingId) {
        await axios.patch("/coupons/" + editingId, payload);
        toast.success("کد تخفیف به‌روزرسانی شد.");
      } else {
        await axios.post("/coupons", payload);
        toast.success("کد تخفیف ساخته شد.");
      }
      resetForm();
      await loadCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || "ذخیره کد تخفیف ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  const editCoupon = (coupon) => {
    setEditingId(coupon._id);
    setForm(toForm(coupon));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleCoupon = async (coupon) => {
    try {
      await axios.patch("/coupons/" + coupon._id, { isActive: !coupon.isActive });
      toast.success(coupon.isActive ? "کد تخفیف غیرفعال شد." : "کد تخفیف فعال شد.");
      await loadCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || "تغییر وضعیت کد تخفیف ناموفق بود.");
    }
  };

  const removeCoupon = async (coupon) => {
    const action = Number(coupon.usageCount || 0) > 0 ? "غیرفعال شود و در تاریخچه باقی بماند" : "حذف شود";
    if (!window.confirm("کد «" + coupon.code + "» " + action + "؟")) return;
    try {
      const response = await axios.delete("/coupons/" + coupon._id);
      toast.success(response.data.archived ? "کد تخفیف استفاده‌شده بایگانی شد." : "کد تخفیف حذف شد.");
      if (editingId === coupon._id) resetForm();
      await loadCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || "حذف کد تخفیف ناموفق بود.");
    }
  };

  const fieldClass = "mt-1 w-full rounded-xl border border-gray-600 bg-gray-900/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9aa58e] focus:ring-2 focus:ring-[#68745f]/30 disabled:opacity-50";
  const labelClass = "block text-sm leading-6 text-gray-300";
  const canRename = !editingId || !coupons.find((coupon) => coupon._id === editingId && (coupon.usageCount > 0 || coupon.reservedCount > 0));

  return (
    <section dir="rtl" className="mx-auto max-w-6xl space-y-7">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-lg sm:p-7">
        <div className="mb-6 flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#68745f]/20 text-[#b9c5af]"><TicketPercent size={22} aria-hidden="true" /></span>
          <div>
            <h2 className="text-xl font-semibold text-white">{editingId ? "ویرایش کد تخفیف" : "ساخت کد تخفیف جدید"}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-400">کد عمومی با درصد تخفیف، تاریخ اعتبار، حداقل خرید، سقف تخفیف و محدودیت استفاده بسازید. مبلغ تخفیف در سمت سرور محاسبه می‌شود.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={labelClass}>کد تخفیف
            <input required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]{3,40}" autoComplete="off" dir="ltr" disabled={!canRename} className={fieldClass + " uppercase tracking-wider"} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="TIK20" />
            {!canRename && <span className="mt-1 block text-xs text-amber-200">کد دارای استفاده یا پرداخت در انتظار است؛ برای تخفیف جدید، کد تازه بسازید.</span>}
          </label>
          <label className={labelClass}>درصد تخفیف (۱ تا ۱۰۰)
            <div className="relative">
              <input required type="number" min="1" max="100" step="0.5" className={fieldClass + " pl-10"} value={form.discountPercentage} onChange={(event) => setForm({ ...form, discountPercentage: event.target.value })} />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">٪</span>
            </div>
          </label>
          <label className={labelClass}>توضیح برای مدیریت (اختیاری)
            <input maxLength={200} className={fieldClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="مثلاً تخفیف کمپین پاییز" />
          </label>
          <label className={labelClass}>شروع اعتبار
            <input required type="datetime-local" className={fieldClass} value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
          </label>
          <label className={labelClass}>پایان اعتبار
            <input required type="datetime-local" className={fieldClass} value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
          </label>
          <label className={labelClass}>حداقل مبلغ سبد (تومان)
            <input required type="number" min="0" step="1" className={fieldClass} value={form.minOrderAmount} onChange={(event) => setForm({ ...form, minOrderAmount: event.target.value })} />
          </label>
          <label className={labelClass}>سقف تخفیف به تومان (اختیاری)
            <input type="number" min="1" step="1" className={fieldClass} value={form.maxDiscountAmount} onChange={(event) => setForm({ ...form, maxDiscountAmount: event.target.value })} placeholder="بدون سقف" />
          </label>
          <label className={labelClass}>تعداد کل استفاده (اختیاری)
            <input type="number" min="1" step="1" className={fieldClass} value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} placeholder="نامحدود" />
          </label>
          <label className={labelClass + " flex items-center gap-3 rounded-xl border border-gray-700 px-3 py-2.5"}>
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="h-4 w-4 accent-[#68745f]" />
            <span>کد پس از ذخیره فعال باشد</span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#68745f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#41443b] disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : editingId ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
            {loading ? "در حال ذخیره…" : editingId ? "ذخیره تغییرات" : "ساخت کد تخفیف"}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gray-600 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-700"><X size={16} aria-hidden="true" />لغو ویرایش</button>}
        </div>
      </form>

      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-lg sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">کدهای تخفیف ثبت‌شده</h2>
            <p className="mt-1 text-sm text-gray-400">{persianNumber(coupons.length)} کد در فهرست</p>
          </div>
          <button type="button" onClick={loadCoupons} disabled={listLoading} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-gray-600 px-3 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-50">
            {listLoading ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <CalendarClock size={14} aria-hidden="true" />}
            به‌روزرسانی فهرست
          </button>
        </div>

        {listLoading ? <p role="status" className="py-8 text-center text-sm text-gray-400">در حال بارگذاری کدها…</p> : coupons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-600 px-4 py-10 text-center text-sm leading-6 text-gray-400">هنوز کد تخفیفی ساخته نشده است. از فرم بالا اولین کد را بسازید.</div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => {
              const now = Date.now();
              const started = new Date(coupon.startsAt).getTime() <= now;
              const notExpired = new Date(coupon.expiresAt).getTime() > now;
              const hasCapacity = coupon.usageLimit == null || Number(coupon.usageCount || 0) + Number(coupon.reservedCount || 0) < Number(coupon.usageLimit);
              const effective = coupon.isActive && started && notExpired && hasCapacity;
              const lockedCode = coupon.usageCount > 0 || coupon.reservedCount > 0;
              return (
                <article key={coupon._id} className="rounded-xl border border-gray-700 bg-gray-900/45 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code dir="ltr" className="rounded-md bg-gray-700 px-2.5 py-1.5 text-sm font-bold tracking-wider text-white">{coupon.code}</code>
                        <span className="rounded-full bg-[#68745f]/20 px-2.5 py-1 text-xs font-semibold text-[#c4d0bb]">{persianNumber(coupon.discountPercentage)}٪ تخفیف</span>
                        <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + (effective ? "bg-emerald-900/40 text-emerald-200" : "bg-gray-700 text-gray-300")}>{effective ? "فعال و قابل استفاده" : coupon.isActive ? "فعلاً قابل استفاده نیست" : "غیرفعال"}</span>
                      </div>
                      {coupon.description && <p className="mt-2 text-sm text-gray-300">{coupon.description}</p>}
                      <div className="mt-3 grid gap-2 text-xs leading-5 text-gray-400 sm:grid-cols-2 lg:grid-cols-3">
                        <p>اعتبار: {new Date(coupon.startsAt).toLocaleDateString("fa-IR")} تا {new Date(coupon.expiresAt).toLocaleDateString("fa-IR")}</p>
                        <p>حداقل سفارش: {formatPrice(coupon.minOrderAmount || 0)}</p>
                        <p>سقف تخفیف: {coupon.maxDiscountAmount == null ? "بدون سقف" : formatPrice(coupon.maxDiscountAmount)}</p>
                        <p>استفاده‌شده: {persianNumber(coupon.usageCount || 0)}</p>
                        <p>رزرو در پرداخت: {persianNumber(coupon.reservedCount || 0)}</p>
                        <p>محدودیت کل: {coupon.usageLimit == null ? "نامحدود" : persianNumber(coupon.usageLimit)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button type="button" onClick={() => editCoupon(coupon)} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-gray-600 px-3 text-xs text-gray-200 transition hover:bg-gray-700"><Pencil size={14} aria-hidden="true" />ویرایش</button>
                      <button type="button" onClick={() => toggleCoupon(coupon)} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-gray-600 px-3 text-xs text-gray-200 transition hover:bg-gray-700">
                        {coupon.isActive ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true />"}
                        {coupon.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
                      </button>
                      <button type="button" onClick={() => removeCoupon(coupon)} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-red-900/70 px-3 text-xs text-red-200 transition hover:bg-red-950/40"><Trash2 size={14} aria-hidden="true" />حذف / بایگانی</button>
                    </div>
                  </div>
                  {lockedCode && <p className="mt-3 text-[11px] leading-5 text-gray-500">برای حفظ تاریخچه سفارش‌ها، امکان تغییر نام این کد محدود است. غیرفعال‌سازی یا ساخت کد تازه همیشه امکان‌پذیر است.</p>}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default CouponManager;
