import LegacyClient from "./legacy-client.jsx";

export default function NotFound() {
  // Let the existing React Router wildcard render Tik Boutique's Persian 404 UI
  // while Next.js still returns the correct HTTP 404 status.
  return <LegacyClient />;
}
