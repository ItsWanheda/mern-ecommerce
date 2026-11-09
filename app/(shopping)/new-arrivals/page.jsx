import CollectionPage from "../../../frontend/src/pages/CollectionPage.jsx";
import { generateStoreMetadata } from "../../../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/new-arrivals", await searchParams);
}

export default function NewestCollectionRouteRoute() {
  return <CollectionPage type="newest" />;
}
