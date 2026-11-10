"use client";

import { useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";

import LoadingSpinner from "@/src/components/LoadingSpinner.jsx";
import SmoothScroll from "@/src/components/SmoothScroll.jsx";
import NextRouteSync from "@/src/components/NextRouteSync.jsx";
import { getAuthReturnPath } from "@/src/lib/auth-route-state.js";
import { useUserStore } from "@/src/stores/useUserStore.js";
import { useCartStore } from "@/src/stores/useCartStore.js";
import {
  isInitialAppShellReady,
  markInitialAppShellReady,
} from "@/src/lib/initial-app-shell-state.js";

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
  const [mounted, setMounted] = useState(() => isInitialAppShellReady());

  useEffect(() => {
    markInitialAppShellReady();
    setMounted(true);
  }, []);

  // React Router reads browser history, so create it only after hydration.
  if (!mounted) return <LoadingSpinner />;

  return (
    <BrowserRouter>
      <AccountRuntime>{children}</AccountRuntime>
    </BrowserRouter>
  );
}
