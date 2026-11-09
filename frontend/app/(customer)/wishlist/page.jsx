import WishlistPage from "@/src/store-pages/WishlistPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/wishlist", await searchParams);
}

export default function WishlistPageRoute() {
  return <WishlistPage />;
}
