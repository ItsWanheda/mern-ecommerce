import CategoriesPage from "../../../frontend/src/pages/CategoriesPage.jsx";
import { generateStoreMetadata } from "../../../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/categories", await searchParams);
}

export default function CategoriesPageRoute() {
  return <CategoriesPage />;
}
