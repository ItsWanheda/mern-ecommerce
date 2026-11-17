import CategoryPage from "@/src/store-pages/CategoryPage.jsx";
import { decodeCategoryRoute } from "@/src/lib/category-route.js";
import { generateStoreMetadata, getStorefrontApiJson } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  return generateStoreMetadata("/category/" + encodeURIComponent(slug), await searchParams);
}

export default async function CategoryPageRoute({ params, searchParams }) {
  const { slug: routeSlug } = await params;
  const slug = decodeCategoryRoute(routeSlug);
  const resolvedSearchParams = await searchParams;
  const paramsForQuery = new URLSearchParams();

  Object.entries(resolvedSearchParams || {}).forEach(([key, value]) => {
    (Array.isArray(value) ? value : [value]).forEach((item) => {
      if (item !== undefined && item !== null) paramsForQuery.append(key, String(item));
    });
  });

  const search = paramsForQuery.toString();
  const productQuery = new URLSearchParams(search);
  if (!productQuery.has("page")) productQuery.set("page", "1");
  productQuery.set("limit", "24");

  const [categoriesResponse, productsResponse] = await Promise.all([
    getStorefrontApiJson("categories"),
    getStorefrontApiJson(
      "products/category/" + encodeURIComponent(slug) + "?" + productQuery.toString()
    ),
  ]);

  const initialData = {
    slug,
    search,
    categories: Array.isArray(categoriesResponse?.categories) ? categoriesResponse.categories : null,
    products: Array.isArray(productsResponse?.products) ? productsResponse.products : null,
    priceBounds: productsResponse?.priceBounds || null,
    pagination: productsResponse?.pagination || null,
  };

  return <CategoryPage slug={slug} initialData={initialData} />;
}
