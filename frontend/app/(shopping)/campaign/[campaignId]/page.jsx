import CampaignPage from "@/src/store-pages/CampaignPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }) {
  const { campaignId } = await params;
  return generateStoreMetadata("/campaign/" + encodeURIComponent(campaignId), await searchParams);
}

export default async function CampaignPageRoute({ params }) {
  const { campaignId } = await params;
  return <CampaignPage campaignId={campaignId} />;
}
