import ResetPasswordPage from "@/src/pages/ResetPasswordPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/reset-password", await searchParams);
}

export default function ResetPasswordPageRoute() {
  return <ResetPasswordPage />;
}
