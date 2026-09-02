import type { ProductBadge, ProductCategory } from "@/lib/product-types";

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  quick_clean: "Quick Clean",
  cleaning_kits: "Cleaning Kits",
  suede_nubuck: "Suede & Nubuck",
  protection: "Protection",
  storage: "Storage",
  restoration: "Restoration",
  accessories: "Accessories",
};

export const PRODUCT_BADGE_LABELS: Record<ProductBadge, string> = {
  doctors_pick: "Doctor's Pick",
};

export function productCategoryLabel(category: ProductCategory | null) {
  return category ? PRODUCT_CATEGORY_LABELS[category] : null;
}

export function productBadgeLabel(badge: ProductBadge | null) {
  return badge ? PRODUCT_BADGE_LABELS[badge] : null;
}

/**
 * Stock is still validated at checkout. This only avoids false urgency in the
 * catalogue: normal stock stays general, and a genuinely small quantity is
 * shown exactly.
 */
export function productAvailabilityCopy(
  stockQuantity: number | null,
  lowStockThreshold: number,
) {
  if (stockQuantity === null) return "Availability confirmed at checkout";
  if (stockQuantity <= 0) return "Out of stock";
  const visibleLowStockThreshold = Math.max(1, Math.min(lowStockThreshold || 5, 5));
  if (stockQuantity <= visibleLowStockThreshold) return `Only ${stockQuantity} left`;
  return "In stock";
}

export function isVisibleLowStock(stockQuantity: number | null, lowStockThreshold: number) {
  if (stockQuantity === null || stockQuantity <= 0) return false;
  return stockQuantity <= Math.max(1, Math.min(lowStockThreshold || 5, 5));
}
