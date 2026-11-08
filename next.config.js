/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The existing frontend Vercel project has a shared Output Directory override
  // of frontend/dist. Match it on this branch so its preview works without
  // changing the project-level setting used by master/Vite deployments.
  distDir: "frontend/dist",
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "/api",
    NEXT_PUBLIC_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || "",
    NEXT_PUBLIC_STORE_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_STORE_SUPPORT_EMAIL || process.env.VITE_STORE_SUPPORT_EMAIL || "",
    NEXT_PUBLIC_ENAMAD_SEAL_IMAGE_URL: process.env.NEXT_PUBLIC_ENAMAD_SEAL_IMAGE_URL || process.env.VITE_ENAMAD_SEAL_IMAGE_URL || "",
    NEXT_PUBLIC_ENAMAD_SEAL_LINK_URL: process.env.NEXT_PUBLIC_ENAMAD_SEAL_LINK_URL || process.env.VITE_ENAMAD_SEAL_LINK_URL || "",
    NEXT_PUBLIC_STORE_INSTAGRAM_URL: process.env.NEXT_PUBLIC_STORE_INSTAGRAM_URL || process.env.VITE_STORE_INSTAGRAM_URL || "",
    NEXT_PUBLIC_STORE_TELEGRAM_URL: process.env.NEXT_PUBLIC_STORE_TELEGRAM_URL || process.env.VITE_STORE_TELEGRAM_URL || "",
    NEXT_PUBLIC_STORE_X_URL: process.env.NEXT_PUBLIC_STORE_X_URL || process.env.VITE_STORE_X_URL || "",
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return {
      beforeFiles: [
        { source: "/api/:path*", destination: "http://localhost:5000/api/:path*" },
      ],
    };
  },
};

export default nextConfig;
