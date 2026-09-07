import { normalizeProductSlug } from "./product-validation.ts";

export type CheckoutLine = {
  productSlug: string;
  quantity: number;
};

export type CheckoutSource =
  | { kind: "cart" }
  | { kind: "buy_now"; item: CheckoutLine }
  | { kind: "invalid_buy_now" };

type CheckoutSearchParams = Record<string, string | string[] | undefined>;

const MAX_DIRECT_CHECKOUT_QUANTITY = 100;

function oneSearchValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

/**
 * Buy Now is deliberately represented in the URL rather than written into
 * the persistent cart. This keeps a normal multi-item cart intact while the
 * shopper completes (or abandons) a one-item checkout.
 */
export function resolveCheckoutSource(searchParams: CheckoutSearchParams): CheckoutSource {
  const mode = oneSearchValue(searchParams.mode);
  if (mode !== "buy-now") return { kind: "cart" };

  const rawSlug = oneSearchValue(searchParams.product);
  const rawQuantity = oneSearchValue(searchParams.quantity);
  if (!rawSlug || !rawQuantity || !/^\d+$/u.test(rawQuantity)) return { kind: "invalid_buy_now" };

  let productSlug: string | null;
  try {
    productSlug = normalizeProductSlug(rawSlug);
  } catch {
    return { kind: "invalid_buy_now" };
  }
  const quantity = Number(rawQuantity);
  if (!productSlug || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_DIRECT_CHECKOUT_QUANTITY) {
    return { kind: "invalid_buy_now" };
  }
  return { kind: "buy_now", item: { productSlug, quantity } };
}

/** Keep this selection pure so direct checkout can never merge into the cart. */
export function selectCheckoutLines(cartLines: readonly CheckoutLine[], source: CheckoutSource): CheckoutLine[] {
  if (source.kind === "buy_now") return [source.item];
  if (source.kind === "cart") return [...cartLines];
  return [];
}

/** Only the normal persistent-cart checkout owns cart cleanup after success. */
export function shouldClearPersistentCart(source: CheckoutSource) {
  return source.kind === "cart";
}
