import CollectionPage from "@/src/pages/CollectionPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  return generateStoreMetadata("/looks/" + encodeURIComponent(slug), await searchParams);
}

export default async function CollectionPageRoute({ params }) {
  const { slug } = await params;
  return <CollectionPage type="look" slug={slug} />;
}
