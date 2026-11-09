import CategoryPage from "@/src/store-pages/CategoryPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  return generateStoreMetadata("/category/" + encodeURIComponent(slug), await searchParams);
}

export default async function CategoryPageRoute({ params }) {
  const { slug } = await params;
  return <CategoryPage slug={slug} />;
}
