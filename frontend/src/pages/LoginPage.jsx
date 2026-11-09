"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";
import { buildAuthPagePath, getAuthReturnPath } from "../lib/auth-route-state.js";

const LoginPage = () => {
	const location = useLocation();
	const returnPath = getAuthReturnPath(location);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const { login, loading } = useUserStore();

	const handleSubmit = (event) => {
		event.preventDefault();
		login(email.trim(), password);
	};

	return (
		<main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8 text-ink sm:px-6 sm:py-10">
			<div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-border bg-surface shadow-[0_28px_90px_-42px_rgba(37,39,34,0.28)]">
				<motion.section
					className="flex items-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12"
					initial={{ opacity: 0, y: 14 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45 }}
					aria-labelledby="login-heading"
				>
					<div className="mx-auto w-full max-w-md">
						<Link to="/" className="inline-flex items-center font-serif text-2xl font-semibold tracking-tight text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
							تیک بوتیک
						</Link>

						<div className="mt-10">
							<div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
								<Sparkles size={20} aria-hidden="true" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">خوش آمدید</p>
							<h1 id="login-heading" className="mt-3 font-serif text-4xl font-medium tracking-tight sm:text-5xl">خوشحالیم که برگشتید<span className="text-brand">.</span></h1>
							<p className="mt-4 max-w-sm text-sm leading-6 text-muted-soft">وارد شوید و ادامه خریدتان را از سر بگیرید.</p>
						</div>

						<form onSubmit={handleSubmit} className="mt-9 space-y-5">
							<div>
								<label htmlFor="login-email" className="mb-2 block text-sm font-medium text-ink-strong">نشانی ایمیل</label>
								<div className="relative">
									<Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-soft" size={18} aria-hidden="true" />
									<input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" dir="ltr" className="w-full rounded-xl border border-border bg-surface py-3.5 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-muted-soft focus:border-brand focus:ring-4 focus:ring-brand/10" />
								</div>
							</div>

							<div>
								<div className="mb-2 flex items-center justify-between gap-3">
									<label htmlFor="login-password" className="block text-sm font-medium text-ink-strong">رمز عبور</label>
								</div>
								<div className="relative">
									<LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-soft" size={18} aria-hidden="true" />
									<input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="رمز عبور خود را وارد کنید" className="w-full rounded-xl border border-border bg-surface py-3.5 pl-12 pr-11 text-sm text-ink outline-none transition placeholder:text-muted-soft focus:border-brand focus:ring-4 focus:ring-brand/10" />
									<button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-soft transition hover:bg-surface-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
										{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
									</button>
								</div>
							</div>

							<button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-strong px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-strong-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60">
								{loading ? "در حال ورود..." : "ورود"}
								{!loading && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />}
							</button>
						</form>
                        <p className="mt-3 text-left text-sm"><Link to="/forgot-password" className="font-semibold text-brand underline underline-offset-4">رمز عبور را فراموش کرده‌اید؟</Link></p>

						<div className="mt-7 flex items-center gap-2 text-xs leading-5 text-muted-soft">
							<ShieldCheck size={16} className="shrink-0 text-brand" aria-hidden="true" />
							اطلاعات حساب شما به‌صورت امن نگهداری می‌شود.
						</div>
						<p className="mt-8 text-center text-sm text-muted-soft">تازه به ما پیوسته‌اید؟{" "}<Link to={buildAuthPagePath("/signup", returnPath)} className="font-semibold text-brand underline decoration-[#68745f]/30 underline-offset-4 transition hover:text-ink-strong">ایجاد حساب کاربری</Link></p>
					</div>
				</motion.section>
</div>
		</main>
	);
};

export default LoginPage;
