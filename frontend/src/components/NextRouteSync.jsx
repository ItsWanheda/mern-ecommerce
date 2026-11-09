"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocation } from "react-router-dom";
import { isAppRouterRoute } from "../lib/next-route-paths.js";
import { withAuthReturnPath } from "../lib/auth-route-state.js";

export default function NextRouteSync({ mode = "native-app-router" }) {
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

    if (mode !== "all" && !isAppRouterRoute(location.pathname)) return;

    const destination = withAuthReturnPath(location);
    router.push(destination);
  }, [location.key, location.pathname, location.search, location.hash, mode, router]);

  return null;
}
