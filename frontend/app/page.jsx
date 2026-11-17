import StoreInfoShell from "./(store-info)/store-info-shell.jsx";
import HomePage from "@/src/store-pages/HomePage.jsx";
import { generateStoreMetadata, getStorefrontApiJson } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/", await searchParams);
}

export default async function StorefrontHomeRoute() {
  const [featuredResponse, newestResponse, categoriesResponse, campaignsResponse] = await Promise.all([
    getStorefrontApiJson("products/featured"),
    getStorefrontApiJson("products/newest?limit=8"),
    getStorefrontApiJson("categories"),
    getStorefrontApiJson("campaigns?includeProducts=1&limit=8"),
  ]);

  const initialData = {
    featuredProducts: Array.isArray(featuredResponse) ? featuredResponse : null,
    newestProducts: Array.isArray(newestResponse?.products) ? newestResponse.products : null,
    categories: Array.isArray(categoriesResponse?.categories) ? categoriesResponse.categories : null,
    campaigns: Array.isArray(campaignsResponse?.campaigns) ? campaignsResponse.campaigns : null,
  };

  return (
    <StoreInfoShell>
      <HomePage initialData={initialData} />
    </StoreInfoShell>
  );
}
