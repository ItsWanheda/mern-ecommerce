import StoreInfoPage from "@/src/store-pages/StoreInfoPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/support", await searchParams);
}

export default function SupportPage() {
  return <StoreInfoPage pathname="/support" />;
}
