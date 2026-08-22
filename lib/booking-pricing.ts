export const PICKUP_AREAS = ["hetauda_city", "other_city"] as const;

export type PickupArea = (typeof PICKUP_AREAS)[number];

export const PICKUP_DELIVERY_FEES: Record<PickupArea, number> = {
  hetauda_city: 200,
  other_city: 300,
};

export const FIXED_PRICE_SERVICE_IDS = new Set([
  "basic-clean",
  "deep-clean",
  "premium-care",
  "express-wash-dry",
]);

export function isPickupArea(value: string): value is PickupArea {
  return (PICKUP_AREAS as readonly string[]).includes(value);
}

export function pickupAreaLabel(area: PickupArea) {
  return area === "hetauda_city" ? "Hetauda City" : "Other city";
}

export function formatNprPrice(amount: number) {
  return "Rs " + new Intl.NumberFormat("en-NP", {
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Only exact prices can safely be added to a delivery fee. A fixed add-on can
 * use the same format with a leading "+". Ranges and "from" wording must
 * stay a quote instead.
 */
export function getExactNprPrice(priceLabel: string): number | null {
  const match = /^(?:\+\s*)?Rs\.?\s*([1-9]\d{0,8})$/iu.exec(
    priceLabel.trim().replace(/,/gu, ""),
  );
  if (!match) return null;

  const amount = Number(match[1]);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function calculateBookingTotal(
  servicePrice: number | null,
  deliveryFee: number | null,
  expressServicePrice: number | null,
) {
  if (
    servicePrice === null ||
    deliveryFee === null ||
    expressServicePrice === null
  ) {
    return null;
  }

  return servicePrice + deliveryFee + expressServicePrice;
}
