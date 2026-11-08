import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const publicEnv = {
  "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "/api"),
  "process.env.NEXT_PUBLIC_PUBLIC_SITE_URL": JSON.stringify(process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || ""),
  "process.env.NEXT_PUBLIC_STORE_SUPPORT_EMAIL": JSON.stringify(process.env.NEXT_PUBLIC_STORE_SUPPORT_EMAIL || process.env.VITE_STORE_SUPPORT_EMAIL || ""),
  "process.env.NEXT_PUBLIC_ENAMAD_SEAL_IMAGE_URL": JSON.stringify(process.env.NEXT_PUBLIC_ENAMAD_SEAL_IMAGE_URL || process.env.VITE_ENAMAD_SEAL_IMAGE_URL || ""),
  "process.env.NEXT_PUBLIC_ENAMAD_SEAL_LINK_URL": JSON.stringify(process.env.NEXT_PUBLIC_ENAMAD_SEAL_LINK_URL || process.env.VITE_ENAMAD_SEAL_LINK_URL || ""),
  "process.env.NEXT_PUBLIC_STORE_INSTAGRAM_URL": JSON.stringify(process.env.NEXT_PUBLIC_STORE_INSTAGRAM_URL || process.env.VITE_STORE_INSTAGRAM_URL || ""),
  "process.env.NEXT_PUBLIC_STORE_TELEGRAM_URL": JSON.stringify(process.env.NEXT_PUBLIC_STORE_TELEGRAM_URL || process.env.VITE_STORE_TELEGRAM_URL || ""),
  "process.env.NEXT_PUBLIC_STORE_X_URL": JSON.stringify(process.env.NEXT_PUBLIC_STORE_X_URL || process.env.VITE_STORE_X_URL || ""),
};

export default defineConfig({
  plugins: [react()],
  define: publicEnv,
  publicDir: "../public",
  server: {
    proxy: {
      "/api": { target: "http://localhost:5000" },
    },
  },
});
