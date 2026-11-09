"use client";

import { useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";

import LoadingSpinner from "../../frontend/src/components/LoadingSpinner.jsx";
import SmoothScroll from "../../frontend/src/components/SmoothScroll.jsx";
import NextRouteSync from "../../frontend/src/components/NextRouteSync.jsx";
import { getAuthReturnPath } from "../../frontend/src/lib/auth-route-state.js";
import { useUserStore } from "../../frontend/src/stores/useUserStore.js";
import { useCartStore } from "../../frontend/src/stores/useCartStore.js";

const AUTH_ENTRY_ROUTES = new Set(["/login", "/signup"]);

function AccountRuntime({ children }) {
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

  const shouldRedirectAuthenticatedUser =
    !checkingAuth && Boolean(user) && AUTH_ENTRY_ROUTES.has(location.pathname);

  useEffect(() => {
    if (!shouldRedirectAuthenticatedUser) return;
    router.replace(getAuthReturnPath(location) || "/");
  }, [location, router, shouldRedirectAuthenticatedUser]);

  if (checkingAuth || shouldRedirectAuthenticatedUser) return <LoadingSpinner />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--ui-canvas)] text-[var(--ui-text)]">
      <NextRouteSync mode="all" />
      <SmoothScroll />
      {children}
      <Toaster />
    </div>
  );
}

export default function AccountShell({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // React Router reads browser history, so create it only after hydration.
  if (!mounted) return <LoadingSpinner />;

  return (
    <BrowserRouter>
      <AccountRuntime>{children}</AccountRuntime>
    </BrowserRouter>
  );
}
