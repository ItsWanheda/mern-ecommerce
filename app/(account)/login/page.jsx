import LoginPage from "../../../frontend/src/pages/LoginPage.jsx";
import { generateStoreMetadata } from "../../../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/login", await searchParams);
}

export default function LoginPageRoute() {
  return <LoginPage />;
}
