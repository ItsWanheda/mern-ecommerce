import CollectionPage from "@/src/store-pages/CollectionPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/bestsellers", await searchParams);
}

export default function BestsellersCollectionRouteRoute() {
  return <CollectionPage type="featured" />;
}
