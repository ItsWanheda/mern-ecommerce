/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the existing shared Vercel Output Directory override unchanged; master
  // remains untouched while this branch builds Next.js into the same directory.
  distDir: "frontend/dist",
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
