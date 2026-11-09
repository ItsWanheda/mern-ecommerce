import AdminPage from "../../../frontend/src/pages/AdminPage.jsx";
import { generateStoreMetadata } from "../../../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/secret-dashboard", await searchParams);
}

export default function AdminDashboardRoute() {
  return <AdminPage />;
}
