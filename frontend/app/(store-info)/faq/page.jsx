import StoreInfoPage from "@/src/store-pages/StoreInfoPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/faq", await searchParams);
}

export default function FaqPage() {
  return <StoreInfoPage pathname="/faq" />;
}
