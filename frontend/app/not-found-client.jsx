"use client";

import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";

import LoadingSpinner from "@/src/components/LoadingSpinner.jsx";
import NextRouteSync from "@/src/components/NextRouteSync.jsx";
import NotFoundPage from "@/src/store-pages/NotFoundPage.jsx";

export default function NotFoundClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <LoadingSpinner />;

  return (
    <BrowserRouter>
      <NextRouteSync mode="all" />
      <NotFoundPage />
    </BrowserRouter>
  );
}
