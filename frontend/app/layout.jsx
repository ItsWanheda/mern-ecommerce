import "@/src/index.css";
import "lenis/dist/lenis.css";

import { DEFAULT_SEO_DESCRIPTION, DEFAULT_SEO_TITLE, SITE_NAME, buildSiteStructuredData, safeJson } from "@/src/lib/seo-utils.js";
import { getStorefrontSeoContext } from "@/lib/next-metadata.js";

export const metadata = {
  title: { default: DEFAULT_SEO_TITLE, template: "%s | Computer Hardware" },
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

export default async function RootLayout({ children }) {
  const { canonical } = await getStorefrontSeoContext();
  const siteStructuredData = canonical
    ? buildSiteStructuredData(canonical, {
        supportEmail: process.env.NEXT_PUBLIC_STORE_SUPPORT_EMAIL || "",
      })
    : [];

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        {siteStructuredData.map((schema, index) => (
          <script
            key={schema["@type"]}
            id={"storefront-schema-" + index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJson(schema) }}
          />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
