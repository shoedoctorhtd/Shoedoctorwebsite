import type { Product, ProductCard } from "./product-types.ts";

const PUBLIC_PRODUCT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
export type RelatedProductCard = ProductCard & { slug: string };

/**
 * Keep related-product selection small, deterministic, and entirely within the
 * existing public catalogue contract. Products are never inferred from names:
 * a matching admin-managed category is the only relevance signal, followed by
 * the already-published catalogue order as a safe fallback.
 */
export async function listRelatedPublicProducts(
  current: Pick<Product, "slug" | "category">,
  limit = 4,
): Promise<RelatedProductCard[]> {
  const { listPublicProducts } = await import("./product-data.ts");
  return selectRelatedPublicProducts(current, await listPublicProducts(), limit);
}

/** Pure selection keeps the relationship rules independently testable. */
export function selectRelatedPublicProducts(
  current: Pick<Product, "slug" | "category">,
  candidates: ProductCard[],
  limit = 4,
): RelatedProductCard[] {
  if (!isPublicProductSlug(current.slug)) return [];
  const maximum = Math.max(1, Math.min(4, Math.trunc(limit) || 4));
  const eligible = candidates
    .filter(isRelatedProductCard)
    .filter((product) => product.slug !== current.slug);
  if (current.category === null) return eligible.slice(0, maximum);

  return [
    ...eligible.filter((product) => product.category === current.category),
    ...eligible.filter((product) => product.category !== current.category),
  ]
    .slice(0, maximum);
}

function isPublicProductSlug(value: string | null) {
  return Boolean(value && PUBLIC_PRODUCT_SLUG.test(value));
}

function isRelatedProductCard(product: ProductCard): product is RelatedProductCard {
  return isPublicProductSlug(product.slug);
}
