import "../frontend/src/index.css";
import "lenis/dist/lenis.css";

import { DEFAULT_SEO_DESCRIPTION, DEFAULT_SEO_TITLE, SITE_NAME } from "../frontend/src/lib/seo-utils.js";

const themeInitialization = `try {
  const savedTheme = localStorage.getItem("tik-boutique-theme");
  if (savedTheme === "dark") {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
} catch {
  // The saved theme is optional; the storefront still renders without storage.
}`;

export const metadata = {
  title: { default: DEFAULT_SEO_TITLE, template: "%s | تیک بوتیک" },
  description: DEFAULT_SEO_DESCRIPTION,
  applicationName: SITE_NAME,
  formatDetection: { telephone: false },
  icons: { icon: "/favicon.svg" },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: SITE_NAME,
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f7f5f0" />
        <script dangerouslySetInnerHTML={{ __html: themeInitialization }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
