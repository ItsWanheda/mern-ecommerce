import { ShoppingCart, UserPlus, LogIn, LogOut, Lock, Search } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";

const Navbar = () => {
  const { user, logout } = useUserStore();
  const isAdmin = user?.role === "admin";
  const { cart } = useCartStore();
  const linkClass = ({ isActive }) => `inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] ${isActive ? "bg-[#e9e5dc] text-[#252722]" : "text-[#62645c] hover:bg-[#e9e5dc] hover:text-[#252722]"}`;

  return (
    <header dir="rtl" className="fixed inset-x-0 top-0 z-40 w-full border-b border-[#e4e0d8] bg-[#f7f5f0]/95 text-[#252722] backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 py-3">
          <Link to="/" className="flex items-center font-serif text-2xl font-semibold tracking-tight text-[#252722] transition hover:text-[#68745f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#68745f]">
            فروشگاه<span className="mr-1 text-[#68745f]">.</span>
          </Link>
          <nav aria-label="پیمایش اصلی" className="flex flex-wrap items-center gap-1 sm:gap-2">
            <NavLink to="/" end className={linkClass}>صفحه اصلی</NavLink>
            <NavLink to="/shop" className={linkClass}><Search size={16} aria-hidden="true" /><span>محصولات</span></NavLink>

            {user && (
              <Link to="/cart" aria-label={cart.length > 0 ? `سبد خرید، ${new Intl.NumberFormat("fa-IR").format(cart.length)} کالا` : "سبد خرید"} className="relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[#62645c] transition hover:bg-[#e9e5dc] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]">
                <ShoppingCart size={18} aria-hidden="true" /><span className="hidden sm:inline">سبد خرید</span>
                {cart.length > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#68745f] px-1.5 py-0.5 text-xs font-semibold text-white">{new Intl.NumberFormat("fa-IR").format(cart.length)}</span>}
              </Link>
            )}

            {isAdmin && <Link className="inline-flex items-center gap-2 rounded-full border border-[#d5d0c5] px-3 py-2 text-sm font-medium text-[#41443b] transition hover:border-[#68745f] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]" to="/secret-dashboard"><Lock size={16} aria-hidden="true" /><span className="hidden sm:inline">داشبورد مدیریت</span></Link>}

            {user ? (
              <button className="inline-flex items-center gap-2 rounded-full bg-[#252722] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]" onClick={logout} type="button"><LogOut size={16} aria-hidden="true" /><span className="hidden sm:inline">خروج</span></button>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-3 py-2 text-sm font-medium text-[#62645c] transition hover:bg-[#e9e5dc] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"><LogIn size={15} className="ml-1 inline" aria-hidden="true" />ورود</Link>
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-[#252722] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"><UserPlus size={16} aria-hidden="true" /><span>ثبت‌نام</span></Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
