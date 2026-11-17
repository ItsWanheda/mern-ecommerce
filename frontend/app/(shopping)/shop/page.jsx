import ShopPage from "@/src/store-pages/ShopPage.jsx";
import { generateStoreMetadata, getStorefrontApiJson } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/shop", await searchParams);
}

export default async function ShopPageRoute({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();

  Object.entries(resolvedSearchParams || {}).forEach(([key, value]) => {
    (Array.isArray(value) ? value : [value]).forEach((item) => {
      if (item !== undefined && item !== null) params.append(key, String(item));
    });
  });

  const search = params.toString();
  const endpoint = "products/search" + (search ? "?" + search : "");
  const [productsResponse, categoriesResponse] = await Promise.all([
    getStorefrontApiJson(endpoint),
    getStorefrontApiJson("categories"),
  ]);

  const initialData = {
    search,
    products: Array.isArray(productsResponse?.products) ? productsResponse.products : null,
    pagination: productsResponse?.pagination || null,
    categories: Array.isArray(categoriesResponse?.categories) ? categoriesResponse.categories : null,
  };

  return <ShopPage initialData={initialData} />;
}
