import ShopPage from "../../../frontend/src/pages/ShopPage.jsx";
import { generateStoreMetadata } from "../../../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/shop", await searchParams);
}

export default function ShopPageRoute() {
  return <ShopPage />;
}
