"use client";

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useRouter } from "next/navigation";

import StoreInfoShell from "../(store-info)/store-info-shell.jsx";
import LoadingSpinner from "@/src/components/LoadingSpinner.jsx";
import { buildAuthPagePath } from "@/src/lib/auth-route-state.js";
import { useUserStore } from "@/src/stores/useUserStore.js";

function AdminAccessGuard({ children }) {
  const location = useLocation();
  const router = useRouter();
  const { user, checkingAuth, authInitialized } = useUserStore();

  const requiresLogin = authInitialized && !user;
  const lacksAdminRole = authInitialized && Boolean(user) && user.role !== "admin";

  useEffect(() => {
    if (requiresLogin) {
      const returnPath = location.pathname + location.search + location.hash;
      router.replace(buildAuthPagePath("/login", returnPath));
      return;
    }

    if (lacksAdminRole) router.replace("/");
  }, [lacksAdminRole, location.hash, location.pathname, location.search, requiresLogin, router]);

  if (!authInitialized && checkingAuth) return <LoadingSpinner />;
  if (requiresLogin || lacksAdminRole) {
    return <div className="flex min-h-[40vh] items-center justify-center px-4 py-12 text-center text-sm text-[var(--ui-muted)]" role="status">در حال بررسی دسترسی و انتقال…</div>;
  }

  return children;
}

export default function AdminShell({ children }) {
  return (
    <StoreInfoShell>
      <AdminAccessGuard>{children}</AdminAccessGuard>
    </StoreInfoShell>
  );
}
