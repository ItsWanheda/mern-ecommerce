import ProfilePage from "@/src/store-pages/ProfilePage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/profile", await searchParams);
}

export default function ProfilePageRoute() {
  return <ProfilePage />;
}
