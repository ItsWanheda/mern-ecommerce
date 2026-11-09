import CollectionPage from "@/src/store-pages/CollectionPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/featured-products", await searchParams);
}

export default function FeaturedCollectionRouteRoute() {
  return <CollectionPage type="featured" />;
}
