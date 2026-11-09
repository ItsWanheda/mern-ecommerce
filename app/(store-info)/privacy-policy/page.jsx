import StoreInfoPage from "../../../frontend/src/pages/StoreInfoPage.jsx";
import { generateStoreMetadata } from "../../../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/privacy-policy", await searchParams);
}

export default function PrivacyPolicyPage() {
  return <StoreInfoPage pathname="/privacy-policy" />;
}
