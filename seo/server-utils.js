import { canonicalOrigin } from "../frontend/src/lib/seo-utils.js";

export function getRequestOrigin(req) {
  const forwarded = String(req?.headers?.["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  const protocol = forwarded === "http" ? "http" : "https";
  const host = String(req?.headers?.host || "").trim();
  if (!host || /[\r\n/?#]/.test(host)) throw new Error("Invalid request host");
  const url = new URL(protocol + "://" + host);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported request protocol");
  return url.origin;
}

export function getCanonicalOrigin(requestOrigin) {
  const configuredPublicUrl = String(process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || "").trim();
  const productionDomain = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || "").trim();
  const configuredOrigin = configuredPublicUrl ||
    (productionDomain
      ? (/^https?:\/\//i.test(productionDomain) ? productionDomain : "https://" + productionDomain)
      : "");
  if (!configuredOrigin) return "";
  return canonicalOrigin(requestOrigin, configuredOrigin);
}

export function resolveApiBase(_req, requestOrigin) {
  const configured = String(process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "/api").trim();
  if (!configured || /[\r\n]/.test(configured)) throw new Error("Invalid API base URL");
  let base;
  if (/^https?:\/\//i.test(configured)) base = new URL(configured);
  else base = new URL(configured.startsWith("/") ? configured : "/" + configured, requestOrigin);
  if (!["http:", "https:"].includes(base.protocol)) throw new Error("Unsupported API protocol");
  base.pathname = base.pathname.replace(/\/+$/, "");
  if (!/\/api$/i.test(base.pathname)) base.pathname += "/api";
  base.search = "";
  base.hash = "";
  return base.toString().replace(/\/$/, "");
}

export async function getApiJson(apiBase, endpoint) {
  if (typeof endpoint !== "string" || /[\r\n]/.test(endpoint)) throw new Error("Invalid API endpoint");
  const response = await fetch(apiBase + "/" + endpoint.replace(/^\/+/, ""), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(3500),
  });
  if (!response.ok) {
    const error = new Error("Public metadata API returned HTTP " + response.status);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function validLastmod(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
