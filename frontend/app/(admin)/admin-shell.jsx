"use client";

import { useEffect, useState } from "react";

import StoreInfoShell from "../(store-info)/store-info-shell.jsx";
import LoadingSpinner from "@/src/components/LoadingSpinner.jsx";
import { useUserStore } from "@/src/stores/useUserStore.js";

function AdminAccessGuard({ children }) {
  const refreshUser = useUserStore((state) => state.refreshUser);
  const [profileSynchronized, setProfileSynchronized] = useState(false);

  useEffect(() => {
    let active = true;

    // The server layout has already verified the live administrator role and
    // session. Refreshing here only synchronizes client-side UI state so a
    // recently promoted administrator is not rejected by a stale Zustand role.
    refreshUser()
      .catch((error) => {
        console.warn("Unable to refresh the client profile after server admin verification", error?.message);
      })
      .finally(() => {
        if (active) setProfileSynchronized(true);
      });

    return () => {
      active = false;
    };
  }, [refreshUser]);

  if (!profileSynchronized) return <LoadingSpinner />;
  return children;
}

export default function AdminShell({ children }) {
  return (
    <StoreInfoShell>
      <AdminAccessGuard>{children}</AdminAccessGuard>
    </StoreInfoShell>
  );
}
