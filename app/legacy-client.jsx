"use client";

import { StrictMode, useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import App from "../frontend/src/App.jsx";
import NextRouteSync from "../frontend/src/components/NextRouteSync.jsx";

export default function LegacyClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Existing pages use browser APIs during render. Mounting after hydration
  // keeps those components client-only while they are incrementally migrated.
  if (!mounted) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[var(--ui-canvas)] px-4 text-sm text-[var(--ui-muted)]"
        lang="fa"
        dir="rtl"
        role="status"
        aria-live="polite"
      >
        در حال آماده‌سازی فروشگاه…
      </div>
    );
  }

  return (
    <StrictMode>
      <BrowserRouter>
        <NextRouteSync mode="native-store-info" />
        <App />
      </BrowserRouter>
    </StrictMode>
  );
}
