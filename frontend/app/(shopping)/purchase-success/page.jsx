import PurchaseSuccessPage from "@/src/store-pages/PurchaseSuccessPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/purchase-success", await searchParams);
}

export default function PurchaseSuccessRoute() {
  return <PurchaseSuccessPage />;
}
