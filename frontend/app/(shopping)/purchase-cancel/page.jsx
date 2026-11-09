import PurchaseCancelPage from "@/src/pages/PurchaseCancelPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/purchase-cancel", await searchParams);
}

export default function PurchaseCancelRoute() {
  return <PurchaseCancelPage />;
}
