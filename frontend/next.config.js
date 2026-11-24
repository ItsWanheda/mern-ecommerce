/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The frontend workspace is the Next.js project root. Keep the output directory
  // aligned with frontend/vercel.json for the eventual Vercel Root Directory switch.
  distDir: "dist",
  poweredByHeader: false,
  async rewrites() {
    // In Docker, Next.js proxies API and image requests over the private
    // Compose network. In ordinary local development, use the host backend.
    const backendUrl = process.env.BACKEND_INTERNAL_URL ||
      (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");

    if (!backendUrl) return [];

    return {
      beforeFiles: [
        { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
        { source: "/uploads/:path*", destination: `${backendUrl}/uploads/:path*` },
      ],
    };
  },
};

export default nextConfig;
