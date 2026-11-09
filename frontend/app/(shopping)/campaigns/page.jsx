import CampaignsPage from "@/src/pages/CampaignsPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/campaigns", await searchParams);
}

export default function CampaignsPageRoute() {
  return <CampaignsPage />;
}
