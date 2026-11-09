import SignUpPage from "../../../frontend/src/pages/SignUpPage.jsx";
import { generateStoreMetadata } from "../../../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/signup", await searchParams);
}

export default function SignUpPageRoute() {
  return <SignUpPage />;
}
