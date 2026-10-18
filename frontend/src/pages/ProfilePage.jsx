import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronLeft, Home, MapPin, Pencil, Plus, Save, Trash2, UserRound, X } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { useUserStore } from "../stores/useUserStore";

const provinces = [
  "آذربایجان شرقی", "آذربایجان غربی", "اردبیل", "اصفهان", "البرز", "ایلام",
  "بوشهر", "تهران", "چهارمحال و بختیاری", "خراسان جنوبی", "خراسان رضوی",
  "خراسان شمالی", "خوزستان", "زنجان", "سمنان", "سیستان و بلوچستان", "فارس",
  "قزوین", "قم", "کردستان", "کرمان", "کرمانشاه", "کهگیلویه و بویراحمد",
  "گلستان", "گیلان", "لرستان", "مازندران", "مرکزی", "هرمزگان", "همدان", "یزد",
];
const emptyAddress = {
  label: "نشانی منزل", recipientName: "", phone: "", province: "", city: "",
  district: "", addressLine: "", postalCode: "", notes: "", isDefault: false,
};
const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-input-bg)] px-3 py-2.5 text-sm text-[var(--ui-text)] outline-none transition placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-focus)] focus:ring-2 focus:ring-[var(--ui-focus)]/20";
const getMessage = (error, fallback) => error.response?.data?.message || fallback;
const addressFromSaved = address => ({ ...emptyAddress, ...address, label: address.label || "نشانی من" });

const ProfilePage = () => {
  const user = useUserStore(state => state.user);
  const updateProfile = useUserStore(state => state.updateProfile);
  const [profile, setProfile] = useState({ name: "", email: "", savedShippingAddresses: [] });
  const [name, setName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [addressForm, setAddressForm] = useState(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressErrors, setAddressErrors] = useState({});
  const [addressError, setAddressError] = useState("");

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await axios.get("/auth/profile");
      setProfile({
        ...data,
        savedShippingAddresses: Array.isArray(data.savedShippingAddresses) ? data.savedShippingAddresses : [],
      });
      setName(data.name || "");
      setPageError("");
      return data;
    } catch (error) {
      setPageError(getMessage(error, "دریافت اطلاعات حساب ناموفق بود. دوباره تلاش کنید."));
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshProfile().catch(() => {}); }, [refreshProfile]);

  const saveProfile = async event => {
    event.preventDefault();
    const value = name.trim();
    if (value.length < 2 || value.length > 100) return toast.error("نام باید بین ۲ تا ۱۰۰ نویسه باشد.");
    setProfileSaving(true);
    try {
      const updated = await updateProfile(value);
      setProfile(current => ({ ...current, ...updated }));
      setName(updated?.name || value);
      toast.success("اطلاعات پروفایل ذخیره شد.");
    } catch (error) {
      toast.error(getMessage(error, "ذخیره پروفایل ناموفق بود."));
    } finally {
      setProfileSaving(false);
    }
  };

  const startNewAddress = () => {
    setAddressErrors({});
    setAddressError("");
    setAddressForm({
      ...emptyAddress,
      recipientName: profile.name || user?.name || "",
      isDefault: profile.savedShippingAddresses.length === 0,
    });
  };
  const editAddress = address => {
    setAddressErrors({});
    setAddressError("");
    setAddressForm(addressFromSaved(address));
  };

  const saveAddress = async event => {
    event.preventDefault();
    if (!addressForm) return;
    setAddressSaving(true);
    setAddressErrors({});
    setAddressError("");
    const { label, isDefault, _id, ...shippingFields } = addressForm;
    try {
      if (_id) {
        await axios.patch("/auth/profile/addresses/" + encodeURIComponent(_id), {
          label: label.trim(), isDefault, shippingAddress: shippingFields,
        });
      } else {
        await axios.post("/auth/profile/addresses", {
          label: label.trim(), isDefault, shippingAddress: shippingFields,
        });
      }
      await refreshProfile();
      setAddressForm(null);
      toast.success(_id ? "نشانی به‌روزرسانی شد." : "نشانی ذخیره شد.");
    } catch (error) {
      setAddressErrors(error.response?.data?.fieldErrors || {});
      setAddressError(getMessage(error, "ذخیره نشانی ناموفق بود. اطلاعات را بررسی کنید."));
    } finally {
      setAddressSaving(false);
    }
  };

  const setDefaultAddress = async id => {
    try {
      await axios.patch("/auth/profile/addresses/" + encodeURIComponent(id) + "/default");
      await refreshProfile();
      toast.success("نشانی پیش‌فرض تغییر کرد.");
    } catch (error) {
      toast.error(getMessage(error, "تغییر نشانی پیش‌فرض ناموفق بود."));
    }
  };
  const deleteAddress = async address => {
    if (!window.confirm("نشانی «" + (address.label || "نشانی من") + "» حذف شود؟")) return;
    try {
      await axios.delete("/auth/profile/addresses/" + encodeURIComponent(address._id));
      await refreshProfile();
      toast.success("نشانی حذف شد.");
    } catch (error) {
      toast.error(getMessage(error, "حذف نشانی ناموفق بود."));
    }
  };

  const field = (key, label, options = {}) => (
    <label key={key} className="block min-w-0 text-sm text-[var(--ui-muted)]">
      {label}
      {key === "province" ? (
        <select required value={addressForm?.[key] || ""} onChange={event => setAddressForm(current => ({ ...current, [key]: event.target.value }))} className={fieldClass + (addressErrors[key] ? " border-[var(--ui-danger)]" : "")} aria-invalid={Boolean(addressErrors[key])}>
          <option value="">انتخاب استان</option>
          {provinces.map(province => <option key={province} value={province}>{province}</option>)}
        </select>
      ) : key === "addressLine" || key === "notes" ? (
        <textarea value={addressForm?.[key] || ""} onChange={event => setAddressForm(current => ({ ...current, [key]: event.target.value }))} className={fieldClass + (addressErrors[key] ? " border-[var(--ui-danger)]" : "")} rows={key === "addressLine" ? 3 : 2} required={key === "addressLine"} maxLength={500} placeholder={options.placeholder || ""} aria-invalid={Boolean(addressErrors[key])} />
      ) : (
        <input value={addressForm?.[key] || ""} onChange={event => setAddressForm(current => ({ ...current, [key]: event.target.value }))} className={fieldClass + (addressErrors[key] ? " border-[var(--ui-danger)]" : "")} required={options.required !== false} type={key === "phone" ? "tel" : "text"} inputMode={key === "phone" || key === "postalCode" ? "numeric" : undefined} maxLength={options.maxLength || 100} placeholder={options.placeholder || ""} aria-invalid={Boolean(addressErrors[key])} autoComplete={options.autoComplete} />
      )}
      {addressErrors[key] && <span role="alert" className="mt-1 block text-xs leading-5 text-[var(--ui-danger)]">{addressErrors[key]}</span>}
    </label>
  );

  return (
    <main dir="rtl" className="min-h-[70vh] bg-[var(--ui-canvas)] px-4 py-8 text-[var(--ui-text)] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] text-[var(--ui-accent)]">حساب کاربری تیک بوتیک</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">پروفایل من</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--ui-muted)]">اطلاعات شخصی و نشانی‌های تحویل را یک‌بار ذخیره کنید تا در خریدهای بعدی، فرم پرداخت به‌صورت خودکار تکمیل شود.</p>
          </div>
          <Link to="/orders" className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-2 text-sm font-medium text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-surface-raised)] sm:self-auto">سفارش‌ها و رهگیری <ChevronLeft size={16} aria-hidden="true" /></Link>
        </header>

        {pageError && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--ui-danger-border)] bg-[var(--ui-danger-bg)] p-4 text-sm text-[var(--ui-danger)]"><span>{pageError}</span><button type="button" onClick={() => { setLoading(true); refreshProfile().catch(() => {}); }} className="rounded-lg border border-current px-3 py-2 font-semibold">تلاش دوباره</button></div>}
        {loading ? (
          <div role="status" className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-10 text-center text-sm text-[var(--ui-muted)]">در حال بارگذاری پروفایل…</div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="h-fit rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]"><UserRound size={23} aria-hidden="true" /></div><div><h2 className="font-bold text-[var(--ui-text)]">اطلاعات شخصی</h2><p className="mt-1 text-xs text-[var(--ui-muted)]">اطلاعات حساب کاربری شما</p></div></div>
              <form onSubmit={saveProfile} className="space-y-4">
                <label className="block text-sm text-[var(--ui-muted)]">نام و نام خانوادگی<input value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={100} autoComplete="name" className={fieldClass} placeholder="نام و نام خانوادگی" /></label>
                <label className="block text-sm text-[var(--ui-muted)]">ایمیل حساب<input type="email" value={profile.email || user?.email || ""} readOnly className={fieldClass + " cursor-not-allowed opacity-75"} dir="ltr" /><span className="mt-1 block text-xs leading-5 text-[var(--ui-muted)]">ایمیل ورود در این بخش قابل تغییر نیست.</span></label>
                <button type="submit" disabled={profileSaving || name.trim() === profile.name} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ui-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ui-button-text)] transition hover:bg-[var(--ui-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} aria-hidden="true" /> {profileSaving ? "در حال ذخیره…" : "ذخیره اطلاعات"}</button>
              </form>
            </section>

            <section className="min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><MapPin size={20} className="text-[var(--ui-accent)]" aria-hidden="true" /><h2 className="font-bold text-[var(--ui-text)]">نشانی‌های من</h2><span className="rounded-full bg-[var(--ui-surface-raised)] px-2 py-0.5 text-xs text-[var(--ui-muted)]">{new Intl.NumberFormat("fa-IR").format(profile.savedShippingAddresses.length)} از ۱۰</span></div><p className="mt-1 text-xs leading-6 text-[var(--ui-muted)]">نشانی پیش‌فرض در مرحله پرداخت به‌صورت خودکار انتخاب می‌شود.</p></div><button type="button" onClick={startNewAddress} disabled={profile.savedShippingAddresses.length >= 10} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-3 py-2 text-sm font-semibold text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} aria-hidden="true" /> افزودن نشانی</button></div>

              {addressForm && <form onSubmit={saveAddress} className="mb-5 space-y-4 rounded-2xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface-raised)] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{addressForm._id ? "ویرایش نشانی" : "نشانی جدید"}</h3><button type="button" onClick={() => setAddressForm(null)} aria-label="بستن فرم نشانی" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--ui-hover)]"><X size={17} aria-hidden="true" /></button></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field("label", "عنوان نشانی", { maxLength: 60, placeholder: "مثلاً خانه یا محل کار" })}
                  {field("recipientName", "نام گیرنده", { maxLength: 100 })}
                  {field("phone", "شماره موبایل", { maxLength: 18, autoComplete: "tel" })}
                  {field("province", "استان")}
                  {field("city", "شهر", { maxLength: 80, autoComplete: "address-level2" })}
                  {field("district", "محله (اختیاری)", { required: false, maxLength: 80 })}
                  {field("postalCode", "کد پستی ۱۰ رقمی", { maxLength: 10, autoComplete: "postal-code" })}
                  <div className="sm:col-span-2">{field("addressLine", "نشانی کامل و پلاک", { placeholder: "خیابان، کوچه، پلاک، واحد..." })}</div>
                  <div className="sm:col-span-2">{field("notes", "توضیحات تحویل (اختیاری)", { required: false, placeholder: "راهنمای پیدا کردن نشانی" })}</div>
                </div>
                <label className="flex items-start gap-2.5 text-sm leading-6 text-[var(--ui-text)]"><input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--ui-accent)]" checked={Boolean(addressForm.isDefault)} onChange={event => setAddressForm(current => ({ ...current, isDefault: event.target.checked }))} /><span>این نشانی، پیش‌فرض سفارش‌های بعدی باشد</span></label>
                {addressError && <p role="alert" className="rounded-xl border border-[var(--ui-danger-border)] bg-[var(--ui-danger-bg)] p-3 text-sm leading-6 text-[var(--ui-danger)]">{addressError}</p>}
                <div className="flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={() => setAddressForm(null)} className="min-h-11 rounded-xl border border-[var(--ui-border)] px-4 py-2 text-sm font-semibold">انصراف</button><button type="submit" disabled={addressSaving} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-[var(--ui-button-text)] transition hover:bg-[var(--ui-accent-hover)] disabled:opacity-50"><Save size={16} aria-hidden="true" /> {addressSaving ? "در حال ذخیره…" : "ذخیره نشانی"}</button></div>
              </form>}

              {profile.savedShippingAddresses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--ui-border-strong)] bg-[var(--ui-canvas)] px-5 py-9 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ui-surface-raised)] text-[var(--ui-muted)]"><Home size={22} aria-hidden="true" /></div><h3 className="mt-3 font-semibold">هنوز نشانی ذخیره نکرده‌اید</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--ui-muted)]">یک نشانی اضافه کنید تا اطلاعات تحویل هنگام پرداخت خودکار تکمیل شود.</p><button type="button" onClick={startNewAddress} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-[var(--ui-button-text)]"><Plus size={16} aria-hidden="true" /> افزودن اولین نشانی</button></div>
              ) : (
                <div className="space-y-3">{profile.savedShippingAddresses.map(address => <article key={address._id} className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-canvas)] p-4 sm:p-5">
                  <div className="flex items-start gap-3"><div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-surface)] text-[var(--ui-accent)]"><MapPin size={19} aria-hidden="true" /></div><div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[var(--ui-text)]">{address.label || "نشانی من"}</h3>{address.isDefault && <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ui-success-border)] bg-[var(--ui-success-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ui-success)]"><Check size={12} aria-hidden="true" /> پیش‌فرض</span>}</div>
                    <p className="mt-1 break-words text-sm leading-6 text-[var(--ui-text-strong)]">{address.province}، {address.city}{address.district ? "، " + address.district : ""}</p><p className="mt-1 break-words text-sm leading-6 text-[var(--ui-muted)]">{address.addressLine}</p>
                    <p className="mt-2 text-xs text-[var(--ui-muted)]">{address.recipientName} · <span dir="ltr" className="inline-block">{address.phone}</span> · کد پستی <span dir="ltr" className="inline-block">{address.postalCode}</span></p>{address.notes && <p className="mt-2 text-xs leading-5 text-[var(--ui-muted)]">توضیحات تحویل: {address.notes}</p>}
                  </div></div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--ui-border)] pt-3">{!address.isDefault && <button type="button" onClick={() => setDefaultAddress(address._id)} className="min-h-9 rounded-lg border border-[var(--ui-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-surface)]">انتخاب به‌عنوان پیش‌فرض</button>}<button type="button" onClick={() => editAddress(address)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-surface)]"><Pencil size={14} aria-hidden="true" /> ویرایش</button><button type="button" onClick={() => deleteAddress(address)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--ui-danger)] transition hover:bg-[var(--ui-danger-bg)]"><Trash2 size={14} aria-hidden="true" /> حذف</button></div>
                </article>)}</div>
              )}
              <p className="mt-4 text-xs leading-6 text-[var(--ui-muted)]">نشانی هر سفارش جداگانه ثبت می‌شود؛ ویرایش پروفایل، نشانی سفارش‌های قبلی را تغییر نمی‌دهد.</p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default ProfilePage;