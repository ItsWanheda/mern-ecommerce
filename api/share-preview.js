const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const safeJson = (value) => JSON.stringify(value)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026");

const absoluteImageUrl = (value, origin) => {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = new URL(value.trim(), origin);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
};

function resolveApiBase(req, origin) {
  const configured = String(process.env.API_BASE_URL || process.env.VITE_API_URL || "/api").trim();
  if (!configured || /[\r\n]/.test(configured)) throw new Error("Invalid API base URL");
  let base;
  if (/^https?:\/\//i.test(configured)) {
    base = new URL(configured);
  } else {
    base = new URL(configured.startsWith("/") ? configured : "/" + configured, origin);
  }
  if (!["http:", "https:"].includes(base.protocol)) throw new Error("Unsupported API protocol");
  base.pathname = base.pathname.replace(/\/+$/, "");
  if (!/\/api$/i.test(base.pathname)) base.pathname += "/api";
  base.search = "";
  base.hash = "";
  return base.toString().replace(/\/$/, "");
}

async function getApiJson(apiBase, endpoint) {
  const url = apiBase + "/" + String(endpoint).replace(/^\/+/, "");
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) {
    const error = new Error("Public metadata API returned HTTP " + response.status);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

const htmlDocument = ({ title, description, image, canonical, kind, structuredData }) => {
  const fullTitle = title.includes("تیک بوتیک") ? title : title + " | تیک بوتیک";
  const shortDescription = String(description || "خرید آنلاین پوشاک و اکسسوری در تیک بوتیک.")
    .replace(/\s+/g, " ").trim().slice(0, 300);
  const imageMeta = image
    ? `<meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:alt" content="${escapeHtml(fullTitle)}"><meta name="twitter:image" content="${escapeHtml(image)}">`
    : "";
  const jsonLd = structuredData
    ? `<script type="application/ld+json">${safeJson(structuredData)}</script>`
    : "";
  const productPriceMeta = kind === "product" && structuredData?.offers
    ? `<meta property="product:price:amount" content="${escapeHtml(structuredData.offers.price)}"><meta property="product:price:currency" content="IRR">`
    : "";
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(shortDescription)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:locale" content="fa_IR">
<meta property="og:site_name" content="تیک بوتیک">
<meta property="og:type" content="${kind === "product" ? "product" : "website"}">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(shortDescription)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
${imageMeta}
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${escapeHtml(fullTitle)}">
<meta name="twitter:description" content="${escapeHtml(shortDescription)}">
${productPriceMeta}
${jsonLd}
</head>
<body><main><h1>${escapeHtml(fullTitle)}</h1><p>${escapeHtml(shortDescription)}</p>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(fullTitle)}" width="1200" height="1200">` : ""}<p><a href="${escapeHtml(canonical)}">مشاهده در تیک بوتیک</a></p></main></body>
</html>`;
};

const notFoundPage = (canonical) => htmlDocument({
  title: "صفحه پیدا نشد",
  description: "این محصول، دسته‌بندی یا کمپین در تیک بوتیک در دسترس نیست.",
  image: "",
  canonical,
  kind: "website",
});

export default async function handler(req, res) {
  if (!["GET", "HEAD"].includes(req.method || "GET")) {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).send("Method not allowed");
  }

  let origin;
  try {
    const protocol = req.headers["x-forwarded-proto"] === "http" ? "http" : "https";
    const host = String(req.headers.host || "").trim();
    if (!host || /[\r\n]/.test(host)) return res.status(400).send("Invalid request");
    origin = protocol + "://" + host;
    new URL(origin);
  } catch {
    return res.status(400).send("Invalid request");
  }

  const type = typeof req.query?.type === "string" ? req.query.type : "";
  const id = typeof req.query?.id === "string" ? req.query.id.trim() : "";
  if (!["product", "category", "campaign"].includes(type) || !id || id.length > 140) {
    return res.status(400).send("Invalid preview request");
  }

  const routePath = type === "product" ? "/product/" + encodeURIComponent(id)
    : type === "category" ? "/category/" + encodeURIComponent(id)
    : "/campaign/" + encodeURIComponent(id);
  const canonical = new URL(routePath, origin).toString();

  let apiBase;
  try {
    apiBase = resolveApiBase(req, origin);
  } catch {
    return res.status(500).send("Preview API is not configured correctly");
  }

  try {
    let title;
    let description;
    let imageValue = "";
    let structuredData;
    let productMetadata = false;

    if (type === "product") {
      const product = await getApiJson(apiBase, "products/" + encodeURIComponent(id));
      if (!product?.name) {
        const missing = new Error("Product not found");
        missing.status = 404;
        throw missing;
      }
      title = String(product.name);
      description = String(product.description || "مشخصات، قیمت و موجودی این محصول را در تیک بوتیک ببینید.");
      imageValue = product.image || product.images?.[0] || "";
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const hasTrackedVariants = variants.length > 0;
      const inStock = hasTrackedVariants
        ? variants.some((variant) => Number(variant.stock) > 0)
        : product.stock === null || product.stock === undefined || Number(product.stock) > 0;
      const structuredPrice = Number(product.price) * 10; // product.price is whole Toman; schema uses ISO currency IRR.
      structuredData = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: title,
        description: description.slice(0, 1000),
        image: (Array.isArray(product.images) ? product.images : [imageValue])
          .map((value) => absoluteImageUrl(value, origin)).filter(Boolean),
        sku: product._id ? String(product._id) : undefined,
        offers: Number.isFinite(structuredPrice) ? {
          "@type": "Offer",
          priceCurrency: "IRR",
          price: structuredPrice,
          availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: canonical,
        } : undefined,
      };
      productMetadata = true;
    } else if (type === "category") {
      const payload = await getApiJson(apiBase, "categories/" + encodeURIComponent(id));
      const category = payload?.category;
      if (!category) {
        const missing = new Error("Category not found");
        missing.status = 404;
        throw missing;
      }
      title = category.name?.fa || category.name?.en || id;
      description = category.description?.fa || category.description?.en || ("محصولات دسته " + title + " را در تیک بوتیک ببینید.");
      imageValue = category.image || "";
      if (!imageValue) {
        try {
          const catalog = await getApiJson(apiBase, "products/category/" + encodeURIComponent(id) + "?page=1&limit=1");
          imageValue = catalog?.products?.[0]?.image || catalog?.products?.[0]?.images?.[0] || "";
        } catch {
          // Category metadata is still valid without a preview image.
        }
      }
      structuredData = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description: String(description).slice(0, 1000),
        url: canonical,
        image: absoluteImageUrl(imageValue, origin) || undefined,
      };
    } else {
      const payload = await getApiJson(apiBase, "campaigns?limit=100");
      const campaigns = Array.isArray(payload?.campaigns) ? payload.campaigns : [];
      const campaign = campaigns.find((item) => String(item._id || "") === id || String(item.slug || "") === id);
      if (!campaign) {
        const missing = new Error("Campaign not found");
        missing.status = 404;
        throw missing;
      }
      title = String(campaign.title || "کمپین فروشگاهی");
      description = String(campaign.description || "پیشنهادهای ویژه و محصولات منتخب تیک بوتیک.");
      imageValue = campaign.image || "";
      structuredData = {
        "@context": "https://schema.org",
        "@type": "Event",
        name: title,
        description: description.slice(0, 1000),
        image: absoluteImageUrl(imageValue, origin) || undefined,
        startDate: campaign.startsAt,
        endDate: campaign.endsAt,
        url: canonical,
      };
    }

    const image = absoluteImageUrl(imageValue, origin);
    const html = htmlDocument({ title, description, image, canonical, kind: type, structuredData, productMetadata });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(req.method === "HEAD" ? "" : html);
  } catch (error) {
    if (error.status === 404) {
      const html = notFoundPage(canonical);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(404).send(req.method === "HEAD" ? "" : html);
    }
    console.error("Share preview metadata request failed", { type, id, message: error.message });
    return res.status(502).send("Share preview metadata is temporarily unavailable");
  }
}
