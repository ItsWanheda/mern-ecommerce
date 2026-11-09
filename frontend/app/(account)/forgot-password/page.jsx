import ForgotPasswordPage from "@/src/store-pages/ForgotPasswordPage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/forgot-password", await searchParams);
}

export default function ForgotPasswordPageRoute() {
  return <ForgotPasswordPage />;
}
