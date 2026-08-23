import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBookingTotals,
  calculateBookingTotal,
  calculatePickupDeliveryFee,
  getExactNprPrice,
  qualifiesForFreeHetaudaDelivery,
} from "../lib/booking-pricing.ts";

test("adds the fixed Express surcharge to the booking total", () => {
  const expressPrice = getExactNprPrice("+ Rs 149");

  assert.equal(expressPrice, 149);
  assert.equal(calculateBookingTotal(399, 200, expressPrice), 748);
});

test("keeps variable service prices as a quote", () => {
  assert.equal(getExactNprPrice("From Rs 149"), null);
  assert.equal(calculateBookingTotal(null, 200, 149), null);
});

test("adds fixed admin prices entered without an Rs prefix", () => {
  assert.equal(getExactNprPrice("499"), 499);
  assert.equal(getExactNprPrice("1,299"), 1299);
  assert.equal(getExactNprPrice("Rs 399"), 399);
  assert.equal(getExactNprPrice("Rs 199–299"), null);

  assert.deepEqual(calculateBookingTotals([499, 399, 299, 399], 0, 149), {
    serviceSubtotal: 1596,
    total: 1745,
  });
});

test("unlocks free Hetauda pickup and return only from the fourth pair", () => {
  assert.equal(qualifiesForFreeHetaudaDelivery(3, "hetauda_city"), false);
  assert.equal(qualifiesForFreeHetaudaDelivery(4, "other_city"), false);
  assert.equal(qualifiesForFreeHetaudaDelivery(4, "hetauda_city"), true);

  assert.deepEqual(
    calculatePickupDeliveryFee("pickup_delivery", "hetauda_city", 3),
    { deliveryFee: 200, freeDeliveryApplied: false },
  );
  assert.deepEqual(
    calculatePickupDeliveryFee("pickup_delivery", "hetauda_city", 4),
    { deliveryFee: 0, freeDeliveryApplied: true },
  );
  assert.deepEqual(
    calculatePickupDeliveryFee("self_dropoff", null, 4),
    { deliveryFee: 0, freeDeliveryApplied: false },
  );
});

test("calculates all exact pair prices once and preserves quote-only totals", () => {
  assert.deepEqual(calculateBookingTotals([299, 449, 699, 299], 0, 149), {
    serviceSubtotal: 1746,
    total: 1895,
  });
  assert.deepEqual(calculateBookingTotals([299, null], 200, 0), {
    serviceSubtotal: null,
    total: null,
  });
});
