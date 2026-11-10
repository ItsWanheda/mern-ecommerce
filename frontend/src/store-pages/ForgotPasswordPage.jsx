"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, LoaderCircle } from "lucide-react";
import axios from "../lib/axios";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setMessage(""); setError("");
    try {
      const response = await axios.post("/auth/forgot-password", { email: email.trim() });
      setMessage(response.data.message || "در صورت ثبت ایمیل، راهنمای بازیابی ارسال می‌شود.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "درخواست بازیابی ناموفق بود.");
    } finally { setLoading(false); }
  };
  const field = "mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";
  return <main className="storefront-account-page flex min-h-screen items-center justify-center bg-[var(--ui-canvas)] px-4 py-10 text-[var(--ui-text)]">
    <section dir="rtl" className="w-full max-w-md rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6 shadow-[0_22px_60px_-42px_var(--ui-shadow-color)] sm:p-9">
      <Link to="/" className="text-xl font-extrabold">Computer Hardware</Link>
      <h1 className="mt-8 text-2xl font-bold">بازیابی رمز عبور</h1>
      <p className="mt-2 text-sm leading-6 text-muted-soft">ایمیلی را که هنگام ساخت حساب استفاده کرده‌اید وارد کنید.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label htmlFor="recovery-email" className="block text-sm font-medium">ایمیل
          <input id="recovery-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={field} dir="ltr" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-brand-soft p-3 text-sm leading-6 text-ink-strong">{message}</p>}
        <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-strong px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Mail size={17} aria-hidden="true" />}ارسال راهنمای بازیابی
        </button>
      </form>
      <Link to="/login" className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden="true" />بازگشت به ورود</Link>
    </section>
  </main>;
};
export default ForgotPasswordPage;
