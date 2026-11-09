const AUTH_PAGE_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

function safeInternalPath(value) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

export function getAuthReturnPath(location) {
  const params = new URLSearchParams(location?.search || "");
  const candidates = [
    location?.state?.from?.pathname,
    params.get("next"),
  ];
  return candidates.find(safeInternalPath) || "";
}

export function buildAuthPagePath(pathname, returnPath) {
  if (!AUTH_PAGE_PATHS.has(pathname) || !safeInternalPath(returnPath)) return pathname;
  return pathname + "?next=" + encodeURIComponent(returnPath);
}

export function withAuthReturnPath(location) {
  const pathname = location?.pathname || "/";
  const search = location?.search || "";
  const hash = location?.hash || "";
  if (!AUTH_PAGE_PATHS.has(pathname)) return pathname + search + hash;

  const statePath = location?.state?.from?.pathname;
  if (!safeInternalPath(statePath)) return pathname + search + hash;

  const params = new URLSearchParams(search);
  if (!safeInternalPath(params.get("next"))) params.set("next", statePath);
  const nextSearch = params.toString();
  return pathname + (nextSearch ? "?" + nextSearch : "") + hash;
}
