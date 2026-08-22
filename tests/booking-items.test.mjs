import assert from "node:assert/strict";
import test from "node:test";

import { getBookingItems } from "../lib/booking-items.js";

const legacyBooking = {
  id: "legacy-booking-1",
  serviceId: "basic-clean",
  serviceName: "Basic Clean",
  shoeType: "Sneakers",
  shoeBrand: "Goldstar",
  notes: "Mud near the sole.",
  createdAt: "2026-08-22T04:00:00.000Z",
  items: [],
};

test("uses retained legacy booking fields as Pair 1 when child items do not exist", () => {
  assert.deepEqual(getBookingItems(legacyBooking), [
    {
      id: "legacy-legacy-booking-1",
      bookingId: "legacy-booking-1",
      pairNumber: 1,
      serviceId: "basic-clean",
      serviceName: "Basic Clean",
      servicePriceLabel: "Quote after review",
      servicePrice: null,
      footwearType: "Sneakers",
      brand: "Goldstar",
      specialRequest: "Mud near the sole.",
      status: null,
      createdAt: "2026-08-22T04:00:00.000Z",
    },
  ]);
});

test("uses saved child items without changing their pair order", () => {
  const items = [
    { id: "item-1", pairNumber: 1 },
    { id: "item-2", pairNumber: 2 },
  ];
  assert.equal(getBookingItems({ ...legacyBooking, items }), items);
});
