"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocation } from "react-router-dom";
import { isStoreInfoRoute } from "../lib/next-route-paths.js";

export default function NextRouteSync({ mode = "native-store-info" }) {
  const location = useLocation();
  const router = useRouter();
  const previousKey = useRef(location.key);
  const isPopState = useRef(false);

  useEffect(() => {
    const markPopState = () => {
      isPopState.current = true;
    };

    window.addEventListener("popstate", markPopState);
    return () => window.removeEventListener("popstate", markPopState);
  }, []);

  useEffect(() => {
    if (previousKey.current === location.key) return;
    previousKey.current = location.key;

    // Next.js already restores the matching route tree for browser back/forward.
    if (isPopState.current) {
      isPopState.current = false;
      return;
    }

    if (mode !== "all" && !isStoreInfoRoute(location.pathname)) return;

    const destination = location.pathname + location.search + location.hash;
    router.push(destination);
  }, [location.key, location.pathname, location.search, location.hash, mode, router]);

  return null;
}
