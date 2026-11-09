"use client";

import { Heart, Home, Grid2X2, ShoppingCart, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore.js";
import { useCartStore } from "../stores/useCartStore.js";
import { useWishlistStore } from "../stores/useWishlistStore.js";
import { buildAuthPagePath } from "../lib/auth-route-state.js";

const number = (value) => new Intl.NumberFormat("fa-IR").format(value);

export default function MobileBottomNavigation() {
  const location = useLocation();
  const user = useUserStore((state) => state.user);
  const cart = useCartStore((state) => state.cart);
  const savedProducts = useWishlistStore((state) => state.items);
  const returnPath = location.pathname + location.search + location.hash;
  const accountPath = user ? "/profile" : buildAuthPagePath("/login", returnPath);

  const isActive = (key) => {
    if (key === "home") return location.pathname === "/";
    if (key === "categories") return location.pathname === "/categories" || location.pathname.startsWith("/category/");
    if (key === "wishlist") return location.pathname === "/wishlist";
    if (key === "cart") return location.pathname === "/cart";
    if (key === "account") return ["/profile", "/orders"].includes(location.pathname);
    return false;
  };

  const items = [
    { key: "home", label: "خانه", href: "/", icon: Home },
    { key: "categories", label: "دسته‌بندی", href: "/categories", icon: Grid2X2 },
    { key: "cart", label: "سبد خرید", href: "/cart", icon: ShoppingCart, count: cart.length },
    { key: "wishlist", label: "علاقه‌مندی", href: "/wishlist", icon: Heart, count: savedProducts.length },
    { key: "account", label: user ? "پروفایل" : "ورود", href: accountPath, icon: UserRound },
  ];

  return (
    <nav dir="rtl" aria-label="ناوبری پایین فروشگاه"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--ui-border)] bg-[var(--ui-surface)]/95 px-2 pt-2 shadow-[0_-12px_32px_-24px_var(--ui-shadow-color)] backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}>
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {items.map(({ key, label, href, icon: Icon, count }) => {
          const active = isActive(key);
          return (
            <Link key={key} to={href}
              aria-label={count > 0 ? label + "، " + number(count) + " کالا" : label}
              aria-current={active ? "page" : undefined}
              className={"relative flex min-h-[3.65rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ui-focus)] " +
                (active ? "bg-[var(--ui-hover)] text-[var(--ui-accent)]" : "text-[var(--ui-muted)] hover:bg-[var(--ui-surface-raised)] hover:text-[var(--ui-text)]")}>
              <span className="relative inline-flex">
                <Icon size={22} strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
                {count > 0 && <span className="absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--ui-accent)] px-1 py-0.5 text-[9px] font-bold leading-none text-[var(--ui-button-text)]">{number(count)}</span>}
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
