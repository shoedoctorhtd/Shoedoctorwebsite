import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBookingTotals,
  calculateBookingTotal,
  calculatePickupDeliveryFee,
  getExactNprPrice,
  qualifiesForFreeHetaudaDelivery,
} from "../lib/booking-pricing.ts";
import { formatNprPriceLabel } from "../lib/money.ts";

test("adds the fixed Express surcharge to the booking total", () => {
  const expressPrice = getExactNprPrice("+ Rs 149");

  assert.equal(expressPrice, 149);
  assert.equal(calculateBookingTotal(399, 200, expressPrice), 748);
});

test("includes every admin price label with one configured amount", () => {
  for (const [label, amount] of [
    ["From Rs 1,299", 1299],
    ["From Rs 599", 599],
    ["From Rs 299", 299],
    ["From Rs 799", 799],
    ["From Rs 1,199", 1199],
    ["from Rs. 599", 599],
  ]) {
    assert.equal(getExactNprPrice(label), amount);
  }

  assert.equal(calculateBookingTotal(149, 200, 149), 498);
});

test("adds fixed admin prices entered without an Rs prefix", () => {
  assert.equal(getExactNprPrice("499"), 499);
  assert.equal(getExactNprPrice("1,299"), 1299);
  assert.equal(getExactNprPrice("Rs 399"), 399);

  assert.deepEqual(calculateBookingTotals([499, 399, 299, 399], 0, 149), {
    serviceSubtotal: 1596,
    total: 1745,
  });
});

test("shows an NPR prefix for bare public service prices without changing price prose", () => {
  assert.equal(formatNprPriceLabel("499"), "Rs 499");
  assert.equal(formatNprPriceLabel("1,299"), "Rs 1,299");
  assert.equal(formatNprPriceLabel("From Rs 299"), "From Rs 299");
  assert.equal(formatNprPriceLabel("Price after inspection"), "Price after inspection");
});

test("calculates the screenshot mix when every service has one price", () => {
  const servicePrices = ["Rs 299", "499", "From Rs 1,299", "From Rs 299"].map(
    getExactNprPrice,
  );

  assert.deepEqual(
    calculateBookingTotals(servicePrices, 0, getExactNprPrice("+ Rs 149")),
    {
    serviceSubtotal: 2396,
    total: 2545,
    },
  );
});

test("keeps ranges and inspection-only services as a quote", () => {
  assert.equal(getExactNprPrice("Rs 199–299"), null);
  assert.equal(getExactNprPrice("+ Rs 150–300"), null);
  assert.equal(getExactNprPrice("From Rs 299–599"), null);
  assert.equal(getExactNprPrice("Price after inspection"), null);
  assert.equal(getExactNprPrice("Quote after review"), null);
  assert.equal(getExactNprPrice(""), null);
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
