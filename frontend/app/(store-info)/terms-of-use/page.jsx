import StoreInfoPage from "@/src/pages/StoreInfoPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/terms-of-use", await searchParams);
}

export default function TermsOfUsePage() {
  return <StoreInfoPage pathname="/terms-of-use" />;
}
