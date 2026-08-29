export type CheckoutProduct = {
  id: string;
  slug: string | null;
  sku: string | null;
  name: string;
  priceNpr: number | null;
  stockQuantity: number | null;
  status: string;
  updatedAt: string;
};

export type NormalizedCheckoutItem = CheckoutProduct & {
  quantity: number;
  lineTotal: number;
};

export type CheckoutRequestItem = { productSlug: string; quantity: number };

/** Converts fresh database rows into a safe, immutable order snapshot. */
export function prepareCheckoutItems(
  rows: CheckoutProduct[],
  requested: CheckoutRequestItem[],
): { kind: "ready"; items: NormalizedCheckoutItem[] } | { kind: "stock_conflict"; message: string } {
  const bySlug = new Map(rows.map((row) => [row.slug, row] as const));
  const items: NormalizedCheckoutItem[] = [];
  for (const request of requested) {
    const product = bySlug.get(request.productSlug);
    if (!product || product.status !== "published" || !product.sku || !product.priceNpr || product.stockQuantity === null) {
      return { kind: "stock_conflict", message: "A product in your cart is no longer available. Refresh your cart and try again." };
    }
    if (product.stockQuantity < request.quantity) {
      return { kind: "stock_conflict", message: `${product.name} no longer has the requested quantity. Refresh your cart and try again.` };
    }
    items.push({ ...product, quantity: request.quantity, lineTotal: product.priceNpr * request.quantity });
  }
  return { kind: "ready", items };
}
