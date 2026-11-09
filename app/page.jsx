import StoreInfoShell from "./(store-info)/store-info-shell.jsx";
import HomePage from "../frontend/src/pages/HomePage.jsx";
import { generateStoreMetadata } from "../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/", await searchParams);
}

export default function StorefrontHomeRoute() {
  return (
    <StoreInfoShell>
      <HomePage />
    </StoreInfoShell>
  );
}
