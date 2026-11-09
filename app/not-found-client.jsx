"use client";

import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";

import LoadingSpinner from "../frontend/src/components/LoadingSpinner.jsx";
import NextRouteSync from "../frontend/src/components/NextRouteSync.jsx";
import NotFoundPage from "../frontend/src/pages/NotFoundPage.jsx";

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
