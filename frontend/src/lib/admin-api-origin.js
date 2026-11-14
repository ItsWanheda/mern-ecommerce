export const resolveServerOrigin = ({
  appUrl,
  vercelUrl,
  forwardedHost,
  forwardedProtocol,
  nodeEnv,
} = {}) => {
  const configuredAppUrl = typeof appUrl === "string" ? appUrl.trim().replace(/\\/+$/, "") : "";
  if (configuredAppUrl) return configuredAppUrl;

  const deploymentHost = typeof vercelUrl === "string"
    ? vercelUrl.trim().replace(/^https?:\\/\\//i, "").replace(/\\/+$/, "")
    : "";
  if (deploymentHost) return `https://${deploymentHost}`;

  const host = typeof forwardedHost === "string"
    ? forwardedHost.trim().replace(/^https?:\\/\\//i, "").replace(/\\/+$/, "")
    : "";
  if (!host) return "http://localhost:3000";

  const requestedProtocol = typeof forwardedProtocol === "string"
    ? forwardedProtocol.split(",")[0].trim().replace(/:$/, "").toLowerCase()
    : "";
  const fallbackProtocol = nodeEnv === "production" ? "https" : "http";
  const protocol = ["http", "https"].includes(requestedProtocol)
    ? requestedProtocol
    : fallbackProtocol;

  return `${protocol}://${host}`;
};
