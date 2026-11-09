import { headers } from "next/headers";
import {
  STATIC_PAGE_META,
  PRIVATE_ROUTE_META,
  SITE_NAME,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  absoluteUrlFor,
  canonicalOrigin,
  canonicalUrlForQuery,
  hasIndexExcludedQuery,
  normalizeSeoText,
} from "../src/lib/seo-utils.js";

function getRequestOrigins(requestHeaders) {
  const host = String(requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000")
    .split(",")[0].trim();
  const forwardedProtocol = String(requestHeaders.get("x-forwarded-proto") || "").split(",")[0].trim();
  const protocol = forwardedProtocol || (host.startsWith("localhost") ? "http" : "https");
  const requestOrigin = protocol + "://" + host;

  const configured = String(
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "",
  ).trim();

  const canonical = configured
    ? canonicalOrigin(requestOrigin, /^https?:\/\//i.test(configured) ? configured : "https://" + configured)
    : "";

  return { requestOrigin, canonical };
}

const LOOK_METADATA = {
  "daily-style": {
    title: "استایل روزمره",
    description: "پایه‌های راحت برای ترکیب روزانه؛ از شلوار جین تا تی‌شرت و کفش.",
    image: "/jeans.jpg",
  },
  layers: {
    title: "لایه‌های ماندگار",
    description: "ترکیب کت و شلوار برای روزهای خنک و انتخاب‌های چندفصلی.",
    image: "/jackets.jpg",
  },
  details: {
    title: "جزئیات تکمیل‌کننده",
    description: "اکسسوری‌ها و انتخاب‌های ساده برای کامل‌کردن ظاهر.",
    image: "/bags.jpg",
  },
};

function decodePathSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function getApiBase(requestOrigin) {
  const configured = String(
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "/api",
  ).trim();

  if (!configured || /[\r\n]/.test(configured)) {
    return new URL("/api", requestOrigin).toString().replace(/\/$/, "");
  }

  let base;
  if (/^https?:\/\//i.test(configured)) base = new URL(configured);
  else base = new URL(configured.startsWith("/") ? configured : "/" + configured, requestOrigin);

  if (!["http:", "https:"].includes(base.protocol)) return new URL("/api", requestOrigin).toString().replace(/\/$/, "");
  base.pathname = base.pathname.replace(/\/+$/, "");
  if (!/\/api$/i.test(base.pathname)) base.pathname += "/api";
  base.search = "";
  base.hash = "";
  return base.toString().replace(/\/$/, "");
}

async function getApiJson(apiBase, endpoint) {
  try {
    const response = await fetch(apiBase + "/" + endpoint.replace(/^\/+/, ""), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function createMetadata({ title, description, image, path, query, canonicalOriginValue, privateRoute, missingResource }) {
  const safeTitle = normalizeSeoText(title, DEFAULT_SEO_TITLE, 160);
  const safeDescription = normalizeSeoText(description, DEFAULT_SEO_DESCRIPTION, 300);
  const canonical = canonicalOriginValue
    ? canonicalUrlForQuery(path, query, canonicalOriginValue, canonicalOriginValue)
    : "";
  const filtered = !privateRoute && hasIndexExcludedQuery(query);
  const noIndex = Boolean(privateRoute || missingResource || filtered || !canonicalOriginValue);
  const absoluteImage = absoluteUrlFor(image, canonicalOriginValue || "");
  const metadata = {
    title: safeTitle,
    description: safeDescription,
    robots: privateRoute || missingResource
      ? { index: false, follow: false }
      : noIndex
        ? { index: false, follow: true }
        : { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      type: "website",
      locale: "fa_IR",
      siteName: SITE_NAME,
      title: safeTitle,
      description: safeDescription,
      ...(canonical ? { url: canonical } : {}),
      ...(absoluteImage ? { images: [{ url: absoluteImage, alt: safeTitle }] } : {}),
    },
    twitter: {
      card: absoluteImage ? "summary_large_image" : "summary",
      title: safeTitle,
      description: safeDescription,
      ...(absoluteImage ? { images: [absoluteImage] } : {}),
    },
  };

  if (canonical) metadata.alternates = { canonical };
  return metadata;
}

export async function generateStoreMetadata(path, query = {}) {
  const requestHeaders = await headers();
  const { requestOrigin, canonical: canonicalOriginValue } = getRequestOrigins(requestHeaders);
  const privateMeta = PRIVATE_ROUTE_META[path];
  const staticMeta = STATIC_PAGE_META[path];

  let title = privateMeta?.title || staticMeta?.title || DEFAULT_SEO_TITLE;
  let description = privateMeta?.description || staticMeta?.description || DEFAULT_SEO_DESCRIPTION;
  let image = "";
  let missingResource = false;

  const apiBase = await getApiBase(requestOrigin);
  const segments = path.split("/").filter(Boolean);

  if (segments[0] === "product" && segments[1]) {
    const response = await getApiJson(apiBase, "products/" + encodeURIComponent(segments[1]));
    const product = response?.product || response;
    if (product && typeof product === "object" && product.name) {
      title = product.name;
      description = product.description || description;
      image = product.image || product.images?.[0] || "";
    } else {
      title = "محصول موردنظر در دسترس نیست";
      description = "این محصول در حال حاضر برای مشاهده در دسترس نیست.";
      missingResource = true;
    }
  } else if (segments[0] === "category" && segments[1]) {
    const slug = decodePathSegment(segments[1]);
    const response = await getApiJson(apiBase, "categories");
    const categories = Array.isArray(response?.categories) ? response.categories : [];
    const category = categories.find((item) => String(item?.slug || "") === slug);
    if (category && category.isActive !== false) {
      title = category.name?.fa || category.name?.en || category.name || title;
      description = category.description?.fa || category.description?.en || description;
      image = category.image || "";
    } else {
      title = "دسته‌بندی " + slug.replace(/-/g, " ");
      description = "محصولات این دسته‌بندی را در تیک بوتیک مشاهده کنید.";
      missingResource = true;
    }
  } else if (segments[0] === "campaign" && segments[1]) {
    const campaignId = decodePathSegment(segments[1]);
    const response = await getApiJson(apiBase, "campaigns/" + encodeURIComponent(campaignId));
    const campaign = response?.campaign || response;
    if (campaign && campaign.title) {
      title = campaign.title;
      description = campaign.description || description;
      image = campaign.image || "";
    } else {
      title = "کمپین فروشگاهی";
      description = "این کمپین در حال حاضر در دسترس نیست.";
      missingResource = true;
    }
  } else if (segments[0] === "looks" && segments[1]) {
    const slug = decodePathSegment(segments[1]);
    const look = LOOK_METADATA[slug];
    if (look) {
      title = look.title;
      description = look.description;
      image = look.image;
    } else {
      title = "مجموعه موردنظر در دسترس نیست";
      description = "این مجموعه در حال حاضر در تیک بوتیک در دسترس نیست.";
      missingResource = true;
    }
  }

  return createMetadata({
    title,
    description,
    image,
    path,
    query,
    canonicalOriginValue,
    privateRoute: Boolean(privateMeta),
    missingResource,
  });
}
