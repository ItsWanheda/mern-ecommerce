import CartPage from "../../../frontend/src/pages/CartPage.jsx";
import { generateStoreMetadata } from "../../../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/cart", await searchParams);
}

export default function CartRoute() {
  return <CartPage />;
}
