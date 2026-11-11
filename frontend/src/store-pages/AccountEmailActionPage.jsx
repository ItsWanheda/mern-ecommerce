"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import axios from "../lib/axios";

export default function AccountEmailActionPage({ mode = "verify" }) {
  const searchParams = useSearchParams();
  const [state, setState] = useState({ loading: true, message: "" });
  useEffect(() => {
    const token = searchParams.get("token") || "";
    if (!token) { setState({ loading: false, message: "پیوند تأیید معتبر نیست." }); return; }
    const endpoint = mode === "change" ? "/account/confirm-email-change" : "/account/verify-email";
    axios.post(endpoint, { token })
      .then(({ data }) => setState({ loading: false, message: data.message || "عملیات با موفقیت انجام شد." }))
      .catch(error => setState({ loading: false, message: error.response?.data?.message || "پیوند نامعتبر یا منقضی شده است." }));
  }, [mode, searchParams]);
  return <main dir="rtl" className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center px-4 py-12 text-[var(--ui-text)]"><section className="w-full rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-7 text-center">{state.loading ? <p role="status" className="text-sm text-[var(--ui-muted)]">در حال بررسی پیوند…</p> : <><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ui-surface-raised)]">{state.message.includes("موفق") || state.message.includes("تأیید شد") ? <CheckCircle2 className="text-[var(--ui-success)]"/> : <XCircle className="text-[var(--ui-danger)]"/>}</span><h1 className="mt-4 text-xl font-bold">{mode === "change" ? "تأیید تغییر ایمیل" : "تأیید ایمیل"}</h1><p className="mt-2 text-sm leading-7 text-[var(--ui-muted)]">{state.message}</p><a href="/account" className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-[var(--ui-accent)] px-5 text-sm font-semibold text-[var(--ui-button-text)]">بازگشت به مرکز حساب</a></>}</section></main>;
}
