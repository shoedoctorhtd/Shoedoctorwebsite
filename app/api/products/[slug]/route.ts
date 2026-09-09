import { getPublicProductBySlug } from "@/lib/product-data";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug).catch(() => null);
  return product
    ? Response.json({ product: toPublicProduct(product) }, { headers: { "Cache-Control": "no-store" } })
    : Response.json({ message: "Product not found." }, { status: 404 });
}

function toPublicProduct(product: NonNullable<Awaited<ReturnType<typeof getPublicProductBySlug>>>) {
  return {
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    category: product.category,
    priceNpr: product.priceNpr,
    compareAtPriceNpr: product.compareAtPriceNpr,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    featured: product.featured,
    badge: product.badge,
    details: product.details,
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      contentType: image.contentType,
      altText: image.altText,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
      createdAt: image.createdAt,
    })),
  };
}
