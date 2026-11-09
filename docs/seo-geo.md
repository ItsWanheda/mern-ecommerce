# SEO and GEO foundations

This storefront keeps its existing visual system and customer-facing layout. SEO/GEO work is implemented in the Next.js frontend; it does not add backend routes or change product/order APIs.

## Implemented

- Per-route title, description, canonical URL, robots directives, Open Graph, and Twitter metadata are produced by the Next.js metadata API.
- Filtered search/category URLs are kept out of the index while clean catalogue routes remain canonical.
- The site-level `OnlineStore` and `WebSite` JSON-LD is included in the initial HTML.
- Product pages receive the public product payload on the server, emit Product and BreadcrumbList JSON-LD in the initial HTML, and hydrate the existing product UI from that same payload.
- Product offers use only known price and tracked availability. The app displays whole Toman prices; schema prices are represented as Rial (IRR).
- `/llms.txt` gives crawlers and AI retrieval systems a concise Persian-first map of the public store, policies, and sitemap.

## Required deployment configuration

Set `PUBLIC_SITE_URL` on the frontend deployment to the canonical HTTPS origin (for example, the real production domain, without a path). Without a verified canonical origin, the SEO helpers intentionally omit canonical-dependent structured data and mark the GEO overview as noindex.

The existing `/robots.txt` and XML sitemap endpoints remain in place. Submit `https://YOUR-DOMAIN/sitemap.xml` through Google Search Console and Bing Webmaster Tools after verifying domain ownership.

## Editorial guidance for GEO

- Keep product names, descriptions, categories, material, sizing, and fit details specific and factual.
- Keep shipping, returns, support, and FAQ content current and consistent with store policy.
- Use internal links between related products, categories, campaigns, and policy pages.
- Do not add fabricated ratings, availability, discounts, or brand affiliations to structured data.
- Treat AI answer visibility as a gradual outcome, not a guaranteed result of publishing `llms.txt` or schema.
