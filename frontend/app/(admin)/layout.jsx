import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "./admin-shell.jsx";

export const dynamic = "force-dynamic";

const buildApiRoot = (origin) => {
  const configured = String(process.env.NEXT_PUBLIC_API_URL || "/api").trim().replace(/\/+$/, "");
  const resolved = /^https?:\/\//i.test(configured)
    ? configured
    : new URL(configured.startsWith("/") ? configured : "/" + configured, origin).toString();
  return /\/api$/i.test(resolved) ? resolved : resolved + "/api";
};

async function verifyAdminRequest() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const cookieHeader = cookieStore.getAll().map(({ name, value }) => name + "=" + value).join("; ");
  if (!cookieHeader) redirect("/login?next=%2Fsecret-dashboard");

  const forwardedHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const forwardedProtocol = (requestHeaders.get("x-forwarded-proto") || "https").split(",")[0].trim();
  const origin = process.env.APP_URL
    ? process.env.APP_URL.replace(/\/+$/, "")
    : process.env.VERCEL_URL
      ? "https://" + process.env.VERCEL_URL
      : forwardedHost
        ? forwardedProtocol + "://" + forwardedHost
        : "http://localhost:3000";

  let response;
  try {
    response = await fetch(buildApiRoot(origin) + "/auth/admin-access", {
      method: "GET",
      headers: { cookie: cookieHeader, accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
    });
  } catch (error) {
    console.error("Server-side administrator authorization request failed", error?.message);
    throw new Error("Administrator access verification is temporarily unavailable.");
  }

  if (response.status === 401) redirect("/login?next=%2Fsecret-dashboard");
  if (response.status === 403) redirect("/");
  if (!response.ok) {
    console.error("Server-side administrator authorization returned HTTP " + response.status);
    throw new Error("Administrator access verification is temporarily unavailable.");
  }

  const result = await response.json().catch(() => null);
  if (result?.authorized !== true || result?.user?.role !== "admin") redirect("/");
}

export default async function AdminLayout({ children }) {
  await verifyAdminRequest();
  return <AdminShell>{children}</AdminShell>;
}
