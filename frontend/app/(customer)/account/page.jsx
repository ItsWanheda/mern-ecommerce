import AccountCenterPage from "@/src/store-pages/AccountCenterPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/account", await searchParams);
}

export default function AccountCenterRoute() {
  return <AccountCenterPage />;
}
