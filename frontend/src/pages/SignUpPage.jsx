import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";

const SignUpPage = () => {
	const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmرمز عبور: "" });
	const [showرمز عبور, setShowرمز عبور] = useState(false);
	const [showConfirmرمز عبور, setShowConfirmرمز عبور] = useState(false);
	const { signup, loading } = useUserStore();

	const updateField = (field) => (event) => {
		setFormData((current) => ({ ...current, [field]: event.target.value }));
	};

	const handleSubmit = (event) => {
		event.preventDefault();
		signup({ ...formData, name: formData.name.trim(), email: formData.email.trim() });
	};

	return (
		<main classنام="min-h-[calc(100vh-5rem)] bg-[#f7f5f0] px-4 py-8 text-[#252722] sm:px-6 sm:py-12 lg:px-8">
			<div classنام="mx-auto grid min-h-[min(760px,calc(100vh-10rem))] max-w-6xl overflow-hidden rounded-[2rem] border border-[#e5e0d6] bg-[#fffefa] shadow-[0_28px_90px_-42px_rgba(37,39,34,0.28)] lg:grid-cols-[1.08fr_0.92fr]">
				<motion.aside
					classنام="relative hidden min-h-[680px] overflow-hidden bg-[#d8d9ce] lg:block"
					initial={{ opacity: 0, scale: 1.015 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.7 }}
					aria-label="Discover the collection"
				>
					<img src="/jackets.jpg" alt="A piece from the curated clothing collection" classنام="absolute inset-0 h-full w-full object-cover" />
					<div classنام="absolute inset-0 bg-gradient-to-t from-[#171a16]/85 via-[#171a16]/10 to-[#171a16]/10" />
					<div classنام="absolute left-8 top-8 rounded-full border border-white/40 bg-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-md">Find your everyday</div>
					<div classنام="absolute inset-x-0 bottom-0 p-10 xl:p-14">
						<p classنام="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">A more considered closet</p>
						<h2 classنام="mt-4 max-w-lg font-serif text-4xl leading-tight text-white xl:text-5xl">Make room for the things you’ll love wearing.</h2>
						<p classنام="mt-4 max-w-sm text-sm leading-6 text-white/75">حساب کاربری بسازید and make your next great find part of your story.</p>
					</div>
				</motion.aside>

				<motion.section
					classنام="flex items-center px-6 py-10 sm:px-10 lg:px-14 lg:py-14"
					initial={{ opacity: 0, y: 14 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, delay: 0.05 }}
					aria-labelledby="signup-heading"
				>
					<div classنام="mx-auto w-full max-w-md">
						<Link to="/" classنام="inline-flex items-center font-serif text-2xl font-semibold tracking-tight text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#68745f]">
							E-Commerce<span classنام="text-[#68745f]">.</span>
						</Link>

						<div classنام="mt-8">
							<div classنام="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9ede4] text-[#68745f]">
								<Sparkles size={20} aria-hidden="true" />
							</div>
							<p classنام="text-xs font-semibold uppercase tracking-[0.22em] text-[#68745f]">Join the collection</p>
							<h1 id="signup-heading" classنام="mt-3 font-serif text-4xl font-medium tracking-tight sm:text-5xl">Make yourself at home<span classنام="text-[#68745f]">.</span></h1>
							<p classنام="mt-3 text-sm leading-6 text-[#77786f]">Create an account for a smoother, more personal shopping experience.</p>
						</div>

						<form onSubmit={handleSubmit} classنام="mt-7 space-y-4">
							<div>
								<label htmlFor="signup-name" classنام="mb-2 block text-sm font-medium text-[#41443b]">نام کامل</label>
								<div classنام="relative">
									<UserRound classنام="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8b82]" size={18} aria-hidden="true" />
									<input id="signup-name" name="name" type="text" autoComplete="name" required value={formData.name} onChange={updateField("name")} placeholder="Your name" classنام="w-full rounded-xl border border-[#dedbd2] bg-white py-3.5 pl-11 pr-4 text-sm text-[#252722] outline-none transition placeholder:text-[#a1a198] focus:border-[#68745f] focus:ring-4 focus:ring-[#68745f]/10" />
								</div>
							</div>

							<div>
								<label htmlFor="signup-email" classنام="mb-2 block text-sm font-medium text-[#41443b]">آدرس ایمیل</label>
								<div classنام="relative">
									<Mail classنام="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8b82]" size={18} aria-hidden="true" />
									<input id="signup-email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={updateField("email")} placeholder="you@example.com" classنام="w-full rounded-xl border border-[#dedbd2] bg-white py-3.5 pl-11 pr-4 text-sm text-[#252722] outline-none transition placeholder:text-[#a1a198] focus:border-[#68745f] focus:ring-4 focus:ring-[#68745f]/10" />
								</div>
							</div>

							<div>
								<label htmlFor="signup-password" classنام="mb-2 block text-sm font-medium text-[#41443b]">رمز عبور</label>
								<div classنام="relative">
									<LockKeyhole classنام="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8b82]" size={18} aria-hidden="true" />
									<input id="signup-password" name="password" type={showرمز عبور ? "text" : "password"} autoComplete="new-password" minLength={8} required value={formData.password} onChange={updateField("password")} placeholder="At least 8 characters" classنام="w-full rounded-xl border border-[#dedbd2] bg-white py-3.5 pl-11 pr-12 text-sm text-[#252722] outline-none transition placeholder:text-[#a1a198] focus:border-[#68745f] focus:ring-4 focus:ring-[#68745f]/10" />
									<button type="button" onClick={() => setShowرمز عبور((visible) => !visible)} aria-label={showرمز عبور ? "Hide password" : "Show password"} classنام="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#8a8b82] transition hover:bg-[#f2f0e9] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]">
										{showرمز عبور ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
									</button>
								</div>
							</div>

							<div>
								<label htmlFor="signup-confirm-password" classنام="mb-2 block text-sm font-medium text-[#41443b]">تکرار رمز عبور</label>
								<div classنام="relative">
									<LockKeyhole classنام="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8b82]" size={18} aria-hidden="true" />
									<input id="signup-confirm-password" name="confirmرمز عبور" type={showConfirmرمز عبور ? "text" : "password"} autoComplete="new-password" minLength={8} required value={formData.confirmرمز عبور} onChange={updateField("confirmرمز عبور")} placeholder="Enter it again" classنام="w-full rounded-xl border border-[#dedbd2] bg-white py-3.5 pl-11 pr-12 text-sm text-[#252722] outline-none transition placeholder:text-[#a1a198] focus:border-[#68745f] focus:ring-4 focus:ring-[#68745f]/10" />
									<button type="button" onClick={() => setShowConfirmرمز عبور((visible) => !visible)} aria-label={showConfirmرمز عبور ? "Hide confirmation password" : "Show confirmation password"} classنام="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#8a8b82] transition hover:bg-[#f2f0e9] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]">
										{showConfirmرمز عبور ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
									</button>
								</div>
							</div>

							<button type="submit" disabled={loading} classنام="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#252722] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] disabled:cursor-not-allowed disabled:opacity-60">
								{loading ? "Creating your account..." : "ایجاد حساب کاربری"}
								{!loading && <ArrowRight size={17} classنام="transition-transform group-hover:translate-x-1" aria-hidden="true" />}
							</button>
						</form>

						<div classنام="mt-5 flex items-center gap-2 text-xs leading-5 text-[#85867d]">
							<ShieldCheck size={16} classنام="shrink-0 text-[#68745f]" aria-hidden="true" />
							Your details stay private and protected.
						</div>
						<p classنام="mt-6 text-center text-sm text-[#77786f]">از قبل حساب کاربری دارید؟{" "}<Link to="/login" classنام="font-semibold text-[#68745f] underline decoration-[#68745f]/30 underline-offset-4 transition hover:text-[#41443b]">Sign in</Link></p>
					</div>
				</motion.section>
			</div>
		</main>
	);
};

export default SignUpPage;
