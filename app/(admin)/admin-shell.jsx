"use client";

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useRouter } from "next/navigation";

import StoreInfoShell from "../(store-info)/store-info-shell.jsx";
import LoadingSpinner from "../../frontend/src/components/LoadingSpinner.jsx";
import { buildAuthPagePath } from "../../frontend/src/lib/auth-route-state.js";
import { useUserStore } from "../../frontend/src/stores/useUserStore.js";

function AdminAccessGuard({ children }) {
  const location = useLocation();
  const router = useRouter();
  const { user, checkingAuth } = useUserStore();

  const requiresLogin = !checkingAuth && !user;
  const lacksAdminRole = !checkingAuth && Boolean(user) && user.role !== "admin";

  useEffect(() => {
    if (requiresLogin) {
      const returnPath = location.pathname + location.search + location.hash;
      router.replace(buildAuthPagePath("/login", returnPath));
      return;
    }

    if (lacksAdminRole) router.replace("/");
  }, [lacksAdminRole, location.hash, location.pathname, location.search, requiresLogin, router]);

  if (checkingAuth || requiresLogin || lacksAdminRole) return <LoadingSpinner />;

  return children;
}

export default function AdminShell({ children }) {
  return (
    <StoreInfoShell>
      <AdminAccessGuard>{children}</AdminAccessGuard>
    </StoreInfoShell>
  );
}
