"use client";

import { useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";

import Navbar from "../../frontend/src/components/Navbar.jsx";
import StoreFooter from "../../frontend/src/components/StoreFooter.jsx";
import SmoothScroll from "../../frontend/src/components/SmoothScroll.jsx";
import LoadingSpinner from "../../frontend/src/components/LoadingSpinner.jsx";
import NextRouteSync from "../../frontend/src/components/NextRouteSync.jsx";
import { useUserStore } from "../../frontend/src/stores/useUserStore.js";
import { useCartStore } from "../../frontend/src/stores/useCartStore.js";
import { isProtectedCustomerRoute } from "../../frontend/src/lib/next-route-paths.js";
import { buildAuthPagePath } from "../../frontend/src/lib/auth-route-state.js";

function StoreInfoChrome({ children }) {
  const location = useLocation();
  const router = useRouter();
  const { user, checkAuth, checkingAuth } = useUserStore();
  const { setAuthenticated, initializeGuestCart, mergeGuestCart } = useCartStore();

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
      <div className="relative z-50 pt-32 md:pt-44 min-[1680px]:pt-32">
        <Navbar />
        {children}
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
