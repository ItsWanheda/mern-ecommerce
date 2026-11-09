import ProductDetailsPage from "@/src/store-pages/ProductDetailsPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }) {
  const { productId } = await params;
  return generateStoreMetadata("/product/" + encodeURIComponent(productId), await searchParams);
}

export default async function ProductDetailsRoute({ params }) {
  const { productId } = await params;
  return <ProductDetailsPage productId={productId} />;
}
