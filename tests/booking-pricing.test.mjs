import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBookingTotal,
  getExactNprPrice,
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
