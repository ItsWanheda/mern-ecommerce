import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";

const SignUpPage = () => {
	const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const { signup, loading } = useUserStore();

	const updateField = (field) => (event) => {
		setFormData((current) => ({ ...current, [field]: event.target.value }));
	};

	const handleSubmit = (event) => {
		event.preventDefault();
		signup({ ...formData, name: formData.name.trim(), email: formData.email.trim() });
	};

	return (
		<main className="min-h-[calc(100vh-5rem)] bg-[#f7f5f0] px-4 py-8 text-[#252722] sm:px-6 sm:py-12 lg:px-8">
			<div className="mx-auto grid min-h-[min(760px,calc(100vh-10rem))] max-w-6xl overflow-hidden rounded-[2rem] border border-[#e5e0d6] bg-[#fffefa] shadow-[0_28px_90px_-42px_rgba(37,39,34,0.28)] lg:grid-cols-[1.08fr_0.92fr]">
				<motion.aside
					className="relative hidden min-h-[680px] overflow-hidden bg-[#d8d9ce] lg:block"
					initial={{ opacity: 0, scale: 1.015 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.7 }}
					aria-label="کشف مجموعه"
				>
					<img src="/jackets.jpg" alt="نمونه‌ای از مجموعه پوشاک منتخب" className="absolute inset-0 h-full w-full object-cover" />
					<div className="absolute inset-0 bg-gradient-to-t from-[#171a16]/85 via-[#171a16]/10 to-[#171a16]/10" />
					<div className="absolute left-8 top-8 rounded-full border border-white/40 bg-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-md">انتخاب‌های روزمره</div>
					<div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">کمد لباسی با انتخاب‌های سنجیده</p>
						<h2 className="mt-4 max-w-lg font-serif text-4xl leading-tight text-white xl:text-5xl">برای لباس‌هایی که دوست دارید بپوشید جا باز کنید.</h2>
						<p className="mt-4 max-w-sm text-sm leading-6 text-white/75">حساب کاربری بسازید و انتخاب بعدی‌تان را به بخشی از داستان خود تبدیل کنید.</p>
					</div>
				</motion.aside>

				<motion.section
					className="flex items-center px-6 py-10 sm:px-10 lg:px-14 lg:py-14"
					initial={{ opacity: 0, y: 14 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, delay: 0.05 }}
					aria-labelledby="signup-heading"
				>
					<div className="mx-auto w-full max-w-md">
						<Link to="/" className="inline-flex items-center font-serif text-2xl font-semibold tracking-tight text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#68745f]">
							E-Commerce<span className="text-[#68745f]">.</span>
						</Link>

						<div className="mt-8">
							<div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9ede4] text-[#68745f]">
								<Sparkles size={20} aria-hidden="true" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#68745f]">به مجموعه ما بپیوندید</p>
							<h1 id="signup-heading" className="mt-3 font-serif text-4xl font-medium tracking-tight sm:text-5xl">اینجا را خانه خود بدانید<span className="text-[#68745f]">.</span></h1>
							<p className="mt-3 text-sm leading-6 text-[#77786f]">برای تجربه خریدی آسان‌تر و شخصی‌تر حساب کاربری بسازید.</p>
						</div>

						<form onSubmit={handleSubmit} className="mt-7 space-y-4">
							<div>
								<label htmlFor="signup-name" className="mb-2 block text-sm font-medium text-[#41443b]">نام و نام خانوادگی</label>
								<div className="relative">
									<UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8b82]" size={18} aria-hidden="true" />
									<input id="signup-name" name="name" type="text" autoComplete="name" required value={formData.name} onChange={updateField("name")} placeholder="نام شما" className="w-full rounded-xl border border-[#dedbd2] bg-white py-3.5 pl-11 pr-4 text-sm text-[#252722] outline-none transition placeholder:text-[#a1a198] focus:border-[#68745f] focus:ring-4 focus:ring-[#68745f]/10" />
								</div>
							</div>

							<div>
								<label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-[#41443b]">نشانی ایمیل</label>
								<div className="relative">
									<Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8b82]" size={18} aria-hidden="true" />
									<input id="signup-email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={updateField("email")} placeholder="you@example.com" className="w-full rounded-xl border border-[#dedbd2] bg-white py-3.5 pl-11 pr-4 text-sm text-[#252722] outline-none transition placeholder:text-[#a1a198] focus:border-[#68745f] focus:ring-4 focus:ring-[#68745f]/10" />
								</div>
							</div>

							<div>
								<label htmlFor="signup-password" className="mb-2 block text-sm font-medium text-[#41443b]">رمز عبور</label>
								<div className="relative">
									<LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8b82]" size={18} aria-hidden="true" />
									<input id="signup-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required value={formData.password} onChange={updateField("password")} placeholder="حداقل ۸ نویسه" className="w-full rounded-xl border border-[#dedbd2] bg-white py-3.5 pl-11 pr-12 text-sm text-[#252722] outline-none transition placeholder:text-[#a1a198] focus:border-[#68745f] focus:ring-4 focus:ring-[#68745f]/10" />
									<button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#8a8b82] transition hover:bg-[#f2f0e9] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]">
										{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
									</button>
								</div>
							</div>

							<div>
								<label htmlFor="signup-confirm-password" className="mb-2 block text-sm font-medium text-[#41443b]">تکرار رمز عبور</label>
								<div className="relative">
									<LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8b82]" size={18} aria-hidden="true" />
									<input id="signup-confirm-password" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required value={formData.confirmPassword} onChange={updateField("confirmPassword")} placeholder="رمز عبور را دوباره وارد کنید" className="w-full rounded-xl border border-[#dedbd2] bg-white py-3.5 pl-11 pr-12 text-sm text-[#252722] outline-none transition placeholder:text-[#a1a198] focus:border-[#68745f] focus:ring-4 focus:ring-[#68745f]/10" />
									<button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "پنهان کردن رمز تکرارشده" : "نمایش رمز تکرارشده"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#8a8b82] transition hover:bg-[#f2f0e9] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]">
										{showConfirmPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
									</button>
								</div>
							</div>

							<button type="submit" disabled={loading} className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#252722] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] disabled:cursor-not-allowed disabled:opacity-60">
								{loading ? "در حال ایجاد حساب..." : "ایجاد حساب کاربری"}
								{!loading && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />}
							</button>
						</form>

						<div className="mt-5 flex items-center gap-2 text-xs leading-5 text-[#85867d]">
							<ShieldCheck size={16} className="shrink-0 text-[#68745f]" aria-hidden="true" />
							اطلاعات شما خصوصی و محافظت‌شده باقی می‌ماند.
						</div>
						<p className="mt-6 text-center text-sm text-[#77786f]">Already have an account?{" "}<Link to="/login" className="font-semibold text-[#68745f] underline decoration-[#68745f]/30 underline-offset-4 transition hover:text-[#41443b]">ورود</Link></p>
					</div>
				</motion.section>
			</div>
		</main>
	);
};

export default SignUpPage;
