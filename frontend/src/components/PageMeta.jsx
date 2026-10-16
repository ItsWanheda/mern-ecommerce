import { useEffect } from "react";
const DEFAULT_TITLE = "تیک بوتیک | فروشگاه آنلاین پوشاک و اکسسوری";
const DEFAULT_DESCRIPTION = "خرید آنلاین پوشاک و اکسسوری با تجربه‌ای ساده، امن و سریع.";
const absoluteUrl = (value) => {
  if (!value || typeof window === "undefined") return "";
  try { return new URL(value, window.location.origin).toString(); } catch { return ""; }
};
const setMeta = (selector, attribute, key, value) => {
  let node = document.head.querySelector(selector);
  if (!node) { node = document.createElement("meta"); node.setAttribute(attribute, key); document.head.appendChild(node); }
  if (value) node.setAttribute("content", String(value)); else node.removeAttribute("content");
};
export default function PageMeta({ title, description, image, path, type = "website", product }) {
  useEffect(() => {
    const safeTitle = String(title || DEFAULT_TITLE).slice(0, 180);
    const safeDescription = String(description || DEFAULT_DESCRIPTION).replace(/\s+/g, " ").trim().slice(0, 300);
    const canonicalUrl = window.location.origin + (path || window.location.pathname + window.location.search);
    const imageUrl = absoluteUrl(image);
    document.title = safeTitle.includes("تیک بوتیک") ? safeTitle : safeTitle + " | تیک بوتیک";
    setMeta('meta[name="description"]', "name", "description", safeDescription);
    setMeta('meta[property="og:title"]', "property", "og:title", safeTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", safeDescription);
    setMeta('meta[property="og:type"]', "property", "og:type", type === "product" ? "product" : "website");
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", imageUrl ? "summary_large_image" : "summary");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", safeTitle);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", safeDescription);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = canonicalUrl;
    const previous = document.getElementById("page-jsonld");
    if (previous) previous.remove();
    if (type === "product" && product?.name) {
      const schema = {
        "@context": "https://schema.org", "@type": "Product", name: product.name,
        description: String(product.description || safeDescription).slice(0, 1000),
        image: (Array.isArray(product.images) ? product.images : [product.image]).filter(Boolean).map(absoluteUrl),
        sku: product._id ? String(product._id) : undefined,
        offers: { "@type": "Offer", priceCurrency: "IRT", price: Number(product.price), availability: product.isActive === false ? "https://schema.org/Discontinued" : "https://schema.org/InStock", url: canonicalUrl },
      };
      const script = document.createElement("script"); script.id = "page-jsonld"; script.type = "application/ld+json"; script.textContent = JSON.stringify(schema); document.head.appendChild(script);
    } else if (type === "campaign" && title) {
      const script = document.createElement("script"); script.id = "page-jsonld"; script.type = "application/ld+json";
      script.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "PromotionEvent", name: title, description: safeDescription, image: imageUrl || undefined, startDate: product?.startsAt, endDate: product?.endsAt, url: canonicalUrl }); document.head.appendChild(script);
    }
  }, [title, description, image, path, type, product]);
  return null;
}
