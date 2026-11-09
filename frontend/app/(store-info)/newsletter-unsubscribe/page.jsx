import NewsletterUnsubscribePage from "@/src/store-pages/NewsletterUnsubscribePage.jsx";
import { generateStoreMetadata } from "@/lib/next-metadata.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  return generateStoreMetadata("/newsletter-unsubscribe", await searchParams);
}

export default function NewsletterUnsubscribeRoute() {
  return <NewsletterUnsubscribePage />;
}
