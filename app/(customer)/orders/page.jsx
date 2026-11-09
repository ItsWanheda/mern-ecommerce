import MyOrdersPage from "../../../frontend/src/pages/MyOrdersPage.jsx";
import { generateStoreMetadata } from "../../../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/orders", await searchParams);
}

export default function MyOrdersPageRoute() {
  return <MyOrdersPage />;
}
