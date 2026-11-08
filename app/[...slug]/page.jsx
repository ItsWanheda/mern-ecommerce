import LegacyClient from "../legacy-client.jsx";
import { generateStoreMetadata } from "../../lib/next-metadata.js";
import { notFound } from "next/navigation";

const STATIC_ROUTES = new Set([
  "shop",
  "new-arrivals",
  "bestsellers",
  "featured-products",
  "campaigns",
  "signup",
  "login",
  "forgot-password",
  "reset-password",
  "secret-dashboard",
  "categories",
  "cart",
  "wishlist",
  "profile",
  "orders",
  "shipping-policy",
  "returns-policy",
  "support",
  "faq",
  "privacy-policy",
  "terms-of-use",
  "newsletter-unsubscribe",
  "purchase-success",
  "purchase-cancel",
]);

function isSupportedLegacyRoute(segments) {
  if (!Array.isArray(segments) || segments.some((segment) => !segment)) return false;
  if (segments.length === 1) return STATIC_ROUTES.has(segments[0]);

  return segments.length === 2 && [
    "looks",
    "campaign",
    "category",
    "product",
  ].includes(segments[0]);
}

export async function generateMetadata({ params, searchParams }) {
  const { slug = [] } = await params;
  const path = "/" + slug.map((segment) => encodeURIComponent(segment)).join("/");
  return generateStoreMetadata(path, await searchParams);
}

export default async function StoreRoutePage({ params }) {
  const { slug = [] } = await params;
  if (!isSupportedLegacyRoute(slug)) notFound();
  return <LegacyClient />;
}
