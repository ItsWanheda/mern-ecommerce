import NotFoundClient from "./not-found-client.jsx";

export const metadata = {
  title: "صفحه پیدا نشد",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundClient />;
}
