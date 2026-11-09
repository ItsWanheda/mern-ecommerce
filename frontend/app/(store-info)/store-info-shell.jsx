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
import NextRouteSync from "@/src/components/NextRouteSync.jsx";
import { useUserStore } from "@/src/stores/useUserStore.js";
import { useCartStore } from "@/src/stores/useCartStore.js";
import { isProtectedCustomerRoute } from "@/src/lib/next-route-paths.js";
import { buildAuthPagePath } from "@/src/lib/auth-route-state.js";

function StoreInfoChrome({ children }) {
  const location = useLocation();
  const router = useRouter();
  const { user, checkAuth, checkingAuth } = useUserStore();
  const { setAuthenticated, initializeGuestCart, mergeGuestCart } = useCartStore();
  const hideMobileBottomNavigation = /^\/product\//.test(location.pathname) ||
    location.pathname.startsWith("/secret-dashboard") ||
    ["/login", "/signup", "/forgot-password", "/reset-password", "/purchase-success", "/purchase-cancel"].includes(location.pathname);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    setAuthenticated(Boolean(user));
    if (!user) {
      initializeGuestCart();
      return;
    }
    mergeGuestCart();
  }, [user, setAuthenticated, initializeGuestCart, mergeGuestCart]);

  const requiresAuthentication = !checkingAuth && !user && isProtectedCustomerRoute(location.pathname);

  useEffect(() => {
    if (!requiresAuthentication) return;
    const returnPath = location.pathname + location.search + location.hash;
    router.replace(buildAuthPagePath("/login", returnPath));
  }, [location.hash, location.pathname, location.search, requiresAuthentication, router]);

  if (checkingAuth || requiresAuthentication) return <LoadingSpinner />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--ui-canvas)] text-[var(--ui-text)]">
      <NextRouteSync mode="all" />
      <SmoothScroll />
      <div className={"relative z-50 pt-20 sm:pt-32 md:pt-44 min-[1680px]:pt-32 " + (hideMobileBottomNavigation ? "" : "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0")}>
        <Navbar />
        {children}
        {!hideMobileBottomNavigation && <MobileBottomNavigation />}
      </div>
      <StoreFooter />
      <Toaster />
    </div>
  );
}

export default function StoreInfoShell({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // BrowserRouter reads browser history; defer its construction until hydration.
  if (!mounted) return <LoadingSpinner />;

  return (
    <BrowserRouter>
      <StoreInfoChrome>{children}</StoreInfoChrome>
    </BrowserRouter>
  );
}
