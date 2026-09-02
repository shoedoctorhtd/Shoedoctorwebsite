import type { Product } from "./product-types";

export const HOMEPAGE_PRODUCT_LIMIT = 4;

type HomepageProductCandidate = Pick<
  Product,
  "id" | "slug" | "name" | "badge" | "featured" | "stockQuantity" | "updatedAt"
>;

/**
 * Keep the homepage selection deterministic so the care section can be
 * cached and reviewed like editorial content, without pinning product IDs.
 */
export function selectHomepageProducts<T extends HomepageProductCandidate>(
  products: readonly T[],
  limit = HOMEPAGE_PRODUCT_LIMIT,
) {
  const safeLimit = Math.max(1, Math.min(HOMEPAGE_PRODUCT_LIMIT, Math.trunc(limit) || HOMEPAGE_PRODUCT_LIMIT));
  return [...products]
    .filter((product) => isValidPublicProductSlug(product.slug))
    .sort(compareHomepageProducts)
    .slice(0, safeLimit);
}

export function isValidPublicProductSlug(slug: string | null): slug is string {
  return typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug);
}

function compareHomepageProducts(a: HomepageProductCandidate, b: HomepageProductCandidate) {
  const badgeDifference = Number(b.badge === "doctors_pick") - Number(a.badge === "doctors_pick");
  if (badgeDifference) return badgeDifference;

  const featuredDifference = Number(b.featured) - Number(a.featured);
  if (featuredDifference) return featuredDifference;

  const stockDifference = Number(b.stockQuantity !== null && b.stockQuantity > 0) - Number(a.stockQuantity !== null && a.stockQuantity > 0);
  if (stockDifference) return stockDifference;

  const updatedDifference = b.updatedAt.localeCompare(a.updatedAt);
  if (updatedDifference) return updatedDifference;

  const nameDifference = a.name.localeCompare(b.name, "en");
  return nameDifference || a.id.localeCompare(b.id, "en");
}
