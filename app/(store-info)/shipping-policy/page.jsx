import StoreInfoPage from "../../../frontend/src/pages/StoreInfoPage.jsx";
import { generateStoreMetadata } from "../../../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/shipping-policy", await searchParams);
}

export default function ShippingPolicyPage() {
  return <StoreInfoPage pathname="/shipping-policy" />;
}
