/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The frontend workspace is the Next.js project root. Keep the output directory
  // aligned with frontend/vercel.json for the eventual Vercel Root Directory switch.
  distDir: "dist",
  poweredByHeader: false,
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
