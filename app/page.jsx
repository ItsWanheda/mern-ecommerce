import LegacyClient from "./legacy-client.jsx";
import { generateStoreMetadata } from "../lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/", await searchParams);
}

export default function HomePage() {
  return <LegacyClient />;
}
