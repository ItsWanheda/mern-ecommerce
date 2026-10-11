import { ShoppingCart, UserPlus, LogIn, LogOut, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";

const Navbar = () => {
	const { user, logout } = useUserStore();
	const isAdmin = user?.role === "admin";
	const { cart } = useCartStore();

	return (
		<header className="fixed left-0 top-0 z-40 w-full border-b border-[#e4e0d8] bg-[#f7f5f0]/95 text-[#252722] backdrop-blur-md">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex min-h-20 flex-wrap items-center justify-between gap-3 py-3">
					<Link
						to="/"
						className="flex items-center font-serif text-2xl font-semibold tracking-tight text-[#252722] transition hover:text-[#68745f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#68745f]"
					>
						E-Commerce<span className="ml-1 text-[#68745f]">.</span>
					</Link>

					<nav aria-label="Main navigation" className="flex flex-wrap items-center gap-2 sm:gap-4">
						<Link
							to="/"
							className="rounded-full px-3 py-2 text-sm font-medium text-[#62645c] transition hover:bg-[#e9e5dc] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
						>
							Home
						</Link>

						{user && (
							<Link
								to="/cart"
								aria-label={cart.length > 0 ? `Cart, ${cart.length} items` : "Cart"}
								className="relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[#62645c] transition hover:bg-[#e9e5dc] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
							>
								<ShoppingCart size={18} aria-hidden="true" />
								<span className="hidden sm:inline">Cart</span>
								{cart.length > 0 && (
									<span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#68745f] px-1.5 py-0.5 text-xs font-semibold text-white">
										{cart.length}
									</span>
								)}
							</Link>
						)}

						{isAdmin && (
							<Link
								className="inline-flex items-center gap-2 rounded-full border border-[#d5d0c5] px-3 py-2 text-sm font-medium text-[#41443b] transition hover:border-[#68745f] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
								to="/secret-dashboard"
							>
								<Lock size={16} aria-hidden="true" />
								<span className="hidden sm:inline">Dashboard</span>
							</Link>
						)}

						{user ? (
							<button
								className="inline-flex items-center gap-2 rounded-full bg-[#252722] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
								onClick={logout}
								type="button"
							>
								<LogOut size={16} aria-hidden="true" />
								<span className="hidden sm:inline">Log out</span>
							</button>
						) : (
							<>
								<Link
									to="/login"
									className="rounded-full px-3 py-2 text-sm font-medium text-[#62645c] transition hover:bg-[#e9e5dc] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
								>
									Log in
								</Link>
								<Link
									to="/signup"
									className="inline-flex items-center gap-2 rounded-full bg-[#252722] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
								>
									<UserPlus size={16} aria-hidden="true" />
									<span>Sign up</span>
								</Link>
							</>
						)}
					</nav>
				</div>
			</div>
		</header>
	);
};

export default Navbar;
