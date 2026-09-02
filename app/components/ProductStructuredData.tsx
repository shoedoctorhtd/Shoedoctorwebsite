import type { Product } from "@/lib/product-types";

const siteUrl = "https://www.shoedoctor.com.np";

function absoluteUrl(value: string) {
  return new URL(value, siteUrl).toString();
}

export default function ProductStructuredData({ product }: { product: Product }) {
  if (!product.slug || product.priceNpr === null) return null;
  const productUrl = absoluteUrl(`/products/${encodeURIComponent(product.slug)}`);
  const description = product.fullDescription ?? product.shortDescription ?? undefined;
  const payload = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      ...(description ? { description } : {}),
      ...(product.sku ? { sku: product.sku } : {}),
      ...(product.details.brand ? { brand: { "@type": "Brand", name: product.details.brand } } : {}),
      ...(product.images.length ? { image: product.images.map((image) => absoluteUrl(image.url)) } : {}),
      offers: {
        "@type": "Offer",
        priceCurrency: "NPR",
        price: String(product.priceNpr),
        availability: product.stockQuantity !== null && product.stockQuantity <= 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
        url: productUrl,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Products", item: absoluteUrl("/products") },
        { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
      ],
    },
  ];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload).replace(/</gu, "\\u003c") }}
    />
  );
}
