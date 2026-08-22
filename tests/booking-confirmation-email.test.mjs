import assert from "node:assert/strict";
import test from "node:test";

const {
  buildBookingConfirmationEmail,
  sendBookingConfirmationEmail,
} = await import("../lib/email/bookingConfirmation.ts");

const booking = {
  id: "booking-2",
  reference: "SD-MULTI-1234",
  customerName: "Ravi <img src=x onerror=alert('x')>",
  phone: "+977 9812345678",
  email: "ravi@example.com",
  serviceId: "basic-clean",
  serviceName: "Basic Clean",
  shoeType: "Sneakers",
  shoeBrand: "Goldstar",
  preferredDate: "2026-08-25",
  fulfillmentMethod: "pickup_delivery",
  pickupArea: "hetauda_city",
  deliveryFee: 0,
  pairCount: 4,
  serviceSubtotal: 1596,
  expressFee: 0,
  totalAmount: 1596,
  freeDeliveryApplied: true,
  freeDeliveryReason: "4+ Pair Hetauda Offer",
  pickupAddress: "Ward 4 Hetauda",
  locationUrl: "https://maps.google.com/?q=Hetauda",
  notes: "Please call before pickup.",
  expressRequested: false,
  status: "new",
  createdAt: "2026-08-22T04:00:00.000Z",
  updatedAt: "2026-08-22T04:00:00.000Z",
  items: [
    {
      id: "item-1",
      bookingId: "booking-2",
      pairNumber: 1,
      serviceId: "basic-clean",
      serviceName: "Basic Clean",
      servicePriceLabel: "Rs 299",
      servicePrice: 299,
      footwearType: "Sneakers <script>alert('x')</script>",
      brand: "Goldstar",
      specialRequest: "Mud on the sole.",
      status: null,
      createdAt: "2026-08-22T04:00:00.000Z",
    },
    {
      id: "item-2",
      bookingId: "booking-2",
      pairNumber: 2,
      serviceId: "deep-clean",
      serviceName: "Deep Clean",
      servicePriceLabel: "Rs 449",
      servicePrice: 449,
      footwearType: "Running shoes",
      brand: null,
      specialRequest: null,
      status: null,
      createdAt: "2026-08-22T04:00:00.000Z",
    },
    {
      id: "item-3",
      bookingId: "booking-2",
      pairNumber: 3,
      serviceId: "premium-care",
      serviceName: "Premium Care",
      servicePriceLabel: "Rs 699",
      servicePrice: 699,
      footwearType: "Sneakers",
      brand: "Puma",
      specialRequest: "Water marks.",
      status: null,
      createdAt: "2026-08-22T04:00:00.000Z",
    },
    {
      id: "item-4",
      bookingId: "booking-2",
      pairNumber: 4,
      serviceId: "repair-priority",
      serviceName: "Repair Priority",
      servicePriceLabel: "From Rs 149",
      servicePrice: 149,
      footwearType: "Boots",
      brand: "Caliber",
      specialRequest: "Scuff marks.",
      status: null,
      createdAt: "2026-08-22T04:00:00.000Z",
    },
  ],
  statusHistory: [],
};

test("builds one escaped multi-pair customer booking confirmation", () => {
  const message = buildBookingConfirmationEmail(booking);

  assert.equal(
    message.subject,
    "\u{1F45F} Booking Confirmation \u2014 SD-MULTI-1234",
  );
  assert.match(message.text, /^SHOE DOCTOR BOOKING CONFIRMATION/m);
  assert.match(message.text, /Pairs: 4 pairs selected/);
  assert.match(message.text, /PAIR 1/);
  assert.match(message.text, /PAIR 4/);
  assert.match(message.text, /Pickup & return: FREE/);
  assert.match(message.text, /Free delivery offer: 4\+ Pair Hetauda Offer/);
  assert.match(message.text, /Services subtotal: Rs 1,596/);
  assert.match(message.text, /Total estimated cost: Rs 1,596/);
  assert.match(
    message.html,
    /Sneakers &lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/,
  );
  assert.match(
    message.html,
    /Ravi &lt;img src=x onerror=alert\(&#39;x&#39;\)&gt;/,
  );
  assert.doesNotMatch(message.html, /<script>alert/);
});

test("does not call Gmail when the booking has no customer email", async () => {
  const result = await sendBookingConfirmationEmail({
    ...booking,
    email: null,
  });

  assert.deepEqual(result, {
    status: "skipped",
    reason: "customer_email_missing",
  });
});
