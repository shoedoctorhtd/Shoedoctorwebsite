import { listPublicProducts } from "@/lib/product-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(
      { products: (await listPublicProducts()).map(toPublicProductCard) },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
    );
  } catch {
    // A not-yet-applied local migration must not leak an internal D1 error.
    return Response.json({ products: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}

function toPublicProductCard(product: Awaited<ReturnType<typeof listPublicProducts>>[number]) {
  return {
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    category: product.category,
    priceNpr: product.priceNpr,
    compareAtPriceNpr: product.compareAtPriceNpr,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    badge: product.badge,
    isLowStock: product.isLowStock,
    isOutOfStock: product.isOutOfStock,
    primaryImage: product.primaryImage ? toPublicImage(product.primaryImage) : null,
  };
}

function toPublicImage(image: NonNullable<Awaited<ReturnType<typeof listPublicProducts>>[number]["primaryImage"]>) {
  return {
    id: image.id,
    url: image.url,
    contentType: image.contentType,
    altText: image.altText,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
    createdAt: image.createdAt,
  };
}
