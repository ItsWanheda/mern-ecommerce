import { isIP } from "node:net";

export const normalizeIpAddress = (value) => {
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  if (!candidate) return "";
  if (candidate.toLowerCase().startsWith("::ffff:")) {
    const mappedIpv4 = candidate.slice(7);
    return isIP(mappedIpv4) === 4 ? mappedIpv4 : "";
  }
  return isIP(candidate) ? candidate : "";
};

// Express req.ip is resolved using the configured trusted-proxy chain.
// Do not parse X-Forwarded-For directly here because clients can spoof it.
export const getClientIpAddress = (req) =>
  normalizeIpAddress(req?.ip) ||
  normalizeIpAddress(req?.socket?.remoteAddress) ||
  "";

// Preserve the existing one-proxy default, while permitting deployments to
// match their actual topology. Set to 0 if Express is directly client-facing.
export const getTrustProxyHops = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return 1;
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) throw new Error("TRUST_PROXY_HOPS must be a whole number from 0 to 8");
  const hops = Number(raw);
  if (!Number.isSafeInteger(hops) || hops > 8) {
    throw new Error("TRUST_PROXY_HOPS must be a whole number from 0 to 8");
  }
  return hops;
};
