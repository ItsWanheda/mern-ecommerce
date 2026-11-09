import ProductDetailsPage from "@/src/store-pages/ProductDetailsPage.jsx";
import { generateStoreMetadata, getStorefrontProduct, getStorefrontSeoContext } from "@/lib/next-metadata.js";
import {
  buildBreadcrumbStructuredData,
  buildProductStructuredData,
  canonicalUrlFor,
  safeJson,
} from "@/src/lib/seo-utils.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }) {
  const { productId } = await params;
  return generateStoreMetadata("/product/" + encodeURIComponent(productId), await searchParams);
}

export default async function ProductDetailsRoute({ params }) {
  const { productId } = await params;
  const [product, seoContext] = await Promise.all([
    getStorefrontProduct(productId),
    getStorefrontSeoContext(),
  ]);

  const canonical = seoContext.canonical
    ? canonicalUrlFor("/product/" + encodeURIComponent(productId), seoContext.canonical, seoContext.canonical)
    : "";
  const productSchema = product && canonical
    ? buildProductStructuredData({
        product,
        title: product.name,
        description: product.description || "",
        image: product.image || product.images?.[0] || "",
        canonical,
        origin: seoContext.canonical,
      })
    : null;
  const breadcrumbSchema = product && canonical
    ? buildBreadcrumbStructuredData([
        { name: "صفحه اصلی", path: "/" },
        { name: product.name, path: "/product/" + encodeURIComponent(productId) },
      ], seoContext.canonical)
    : null;

  return (
    <>
      {productSchema && (
        <script
          id="product-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJson(productSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
          id="product-breadcrumb-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJson(breadcrumbSchema) }}
        />
      )}
      <ProductDetailsPage productId={productId} initialProduct={product} />
    </>
  );
}
