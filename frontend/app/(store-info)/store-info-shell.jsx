"use client";

import { useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";

import Navbar from "@/src/components/Navbar.jsx";
import MobileBottomNavigation from "@/src/components/MobileBottomNavigation.jsx";
import StoreFooter from "@/src/components/StoreFooter.jsx";
import SmoothScroll from "@/src/components/SmoothScroll.jsx";
import LoadingSpinner from "@/src/components/LoadingSpinner.jsx";
import { completeInitialBoot, hasCompletedInitialBoot } from "@/src/lib/initial-boot.js";
import NextRouteSync from "@/src/components/NextRouteSync.jsx";
import { useUserStore } from "@/src/stores/useUserStore.js";
import { useCartStore } from "@/src/stores/useCartStore.js";
import { useWishlistStore } from "@/src/stores/useWishlistStore.js";
import { isProtectedCustomerRoute } from "@/src/lib/next-route-paths.js";
import { buildAuthPagePath } from "@/src/lib/auth-route-state.js";

function StoreInfoChrome({ children }) {
  const location = useLocation();
  const router = useRouter();
  const { user, checkAuth, checkingAuth, authInitialized } = useUserStore();
  const { setAuthenticated, initializeGuestCart, mergeGuestCart } = useCartStore();
  const setWishlistAuthenticated = useWishlistStore(state => state.setAuthenticated);
  const hideMobileBottomNavigation = /^\/product\//.test(location.pathname) ||
    location.pathname.startsWith("/secret-dashboard") ||
    ["/login", "/signup", "/forgot-password", "/reset-password", "/purchase-success", "/purchase-cancel"].includes(location.pathname);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    setAuthenticated(Boolean(user));
    void setWishlistAuthenticated(Boolean(user));
    if (!user) {
      initializeGuestCart();
      return;
    }
    mergeGuestCart();
  }, [user, setAuthenticated, initializeGuestCart, mergeGuestCart]);

  const requiresAuthentication = authInitialized && !user && isProtectedCustomerRoute(location.pathname);

  useEffect(() => {
    if (!requiresAuthentication) return;
    const returnPath = location.pathname + location.search + location.hash;
    router.replace(buildAuthPagePath("/login", returnPath));
  }, [location.hash, location.pathname, location.search, requiresAuthentication, router]);

  if (!authInitialized && checkingAuth) return <LoadingSpinner />;

  return (
    <div className={"min-h-screen overflow-x-hidden bg-[var(--ui-canvas)] text-[var(--ui-text)] " + (hideMobileBottomNavigation ? "" : "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0")}>
      <NextRouteSync mode="all" />
      <SmoothScroll />
      <div className="relative z-50 pt-20 sm:pt-32 md:pt-44 min-[1680px]:pt-32">
        <Navbar />
        {requiresAuthentication ? (
          <main className="mx-auto flex min-h-[40vh] max-w-7xl items-center justify-center px-4 py-12 text-center">
            <p role="status" className="text-sm text-[var(--ui-muted)]">در حال انتقال به صفحه ورود…</p>
          </main>
        ) : children}
        {!hideMobileBottomNavigation && <MobileBottomNavigation />}
      </div>
      <StoreFooter />
      <Toaster />
    </div>
  );
}

export default function StoreInfoShell({ children }) {
  const [mounted, setMounted] = useState(() => hasCompletedInitialBoot());

  useEffect(() => {
    completeInitialBoot();
    setMounted(true);
  }, []);

  // BrowserRouter reads browser history; defer its construction until hydration.
  if (!mounted) return <LoadingSpinner />;

  return (
    <BrowserRouter>
      <StoreInfoChrome>{children}</StoreInfoChrome>
    </BrowserRouter>
  );
}
