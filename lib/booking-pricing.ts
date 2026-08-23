export const PICKUP_AREAS = ["hetauda_city", "other_city"] as const;

export type PickupArea = (typeof PICKUP_AREAS)[number];
export type BookingFulfillmentMethod = "self_dropoff" | "pickup_delivery";

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
 * Only exact prices can safely be added to a delivery fee. Admins may enter a
 * fixed amount with or without an Rs prefix, and a fixed add-on can use a
 * leading "+". Ranges and "from" wording must stay a quote instead.
 */
export function getExactNprPrice(priceLabel: string): number | null {
  const match = /^(?:\+\s*)?(?:Rs\.?\s*)?([1-9]\d{0,8})$/iu.exec(
    priceLabel.trim().replace(/,/gu, ""),
  );
  if (!match) return null;

  const amount = Number(match[1]);
  return Number.isSafeInteger(amount) ? amount : null;
}

/**
 * Pickup areas are a controlled booking value, rather than free-form address
 * text. That keeps the Hetauda offer verifiable on both the client and server.
 */
export function qualifiesForFreeHetaudaDelivery(
  pairCount: number,
  pickupArea: PickupArea | "" | null | undefined,
) {
  return (
    Number.isInteger(pairCount) &&
    pairCount >= 4 &&
    pickupArea === "hetauda_city"
  );
}

export function calculatePickupDeliveryFee(
  fulfillmentMethod: BookingFulfillmentMethod,
  pickupArea: PickupArea | "" | null | undefined,
  pairCount: number,
) {
  if (fulfillmentMethod === "self_dropoff") {
    return { deliveryFee: 0, freeDeliveryApplied: false };
  }
  const area = String(pickupArea ?? "");
  if (!isPickupArea(area)) {
    return { deliveryFee: null, freeDeliveryApplied: false };
  }

  const freeDeliveryApplied = qualifiesForFreeHetaudaDelivery(
    pairCount,
    area,
  );
  return {
    deliveryFee: freeDeliveryApplied ? 0 : PICKUP_DELIVERY_FEES[area],
    freeDeliveryApplied,
  };
}

export function calculateBookingTotals(
  servicePrices: Array<number | null>,
  deliveryFee: number | null,
  expressServicePrice: number | null,
) {
  const serviceSubtotal = addExactAmounts(servicePrices);
  const total = addExactAmounts([
    serviceSubtotal,
    deliveryFee,
    expressServicePrice,
  ]);

  return { serviceSubtotal, total };
}

export function calculateBookingTotal(
  servicePrice: number | null,
  deliveryFee: number | null,
  expressServicePrice: number | null,
) {
  return calculateBookingTotals(
    [servicePrice],
    deliveryFee,
    expressServicePrice,
  ).total;
}

function addExactAmounts(amounts: Array<number | null>) {
  if (
    amounts.some(
      (amount) =>
        amount === null ||
        !Number.isSafeInteger(amount) ||
        amount < 0,
    )
  ) {
    return null;
  }

  const total = amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
  return Number.isSafeInteger(total) ? total : null;
}
