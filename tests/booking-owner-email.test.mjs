import assert from "node:assert/strict";
import test from "node:test";

const { sendBookingEmailNotification } = await import(
  "../lib/booking-email.ts"
);

const baseBooking = {
  id: "booking-1",
  reference: "SD-TEST-1234",
  customerName: "Asha <img src=x onerror=alert('x')>",
  phone: "+977 9812345678",
  email: "asha@example.com",
  serviceId: "deep-clean",
  serviceName: "Deep Clean & Restore",
  shoeType: "Sneakers <script>alert('x')</script>",
  shoeBrand: "Nike",
  preferredDate: "2026-08-25",
  fulfillmentMethod: "pickup_delivery",
  pickupArea: "hetauda_city",
  deliveryFee: 0,
  pairCount: 4,
  serviceSubtotal: 1746,
  expressFee: 0,
  totalAmount: 1746,
  freeDeliveryApplied: true,
  freeDeliveryReason: "4+ Pair Hetauda Offer",
  pickupAddress: "Ward 4 <b>Hetauda</b>",
  locationUrl: "https://maps.google.com/?q=Hetauda",
  notes: "Please treat the <strong>stain</strong>.",
  expressRequested: false,
  status: "new",
  createdAt: "2026-08-22T04:00:00.000Z",
  updatedAt: "2026-08-22T04:00:00.000Z",
  items: [
    {
      id: "item-1",
      bookingId: "booking-1",
      pairNumber: 1,
      serviceId: "deep-clean",
      serviceName: "Deep Clean & Restore",
      servicePriceLabel: "Rs 449",
      servicePrice: 449,
      footwearType: "Sneakers <script>alert('x')</script>",
      brand: "Nike",
      specialRequest: "Please treat the <strong>stain</strong>.",
      status: null,
      createdAt: "2026-08-22T04:00:00.000Z",
    },
    {
      id: "item-2",
      bookingId: "booking-1",
      pairNumber: 2,
      serviceId: "basic-clean",
      serviceName: "Basic Clean",
      servicePriceLabel: "Rs 299",
      servicePrice: 299,
      footwearType: "Running shoes",
      brand: null,
      specialRequest: null,
      status: null,
      createdAt: "2026-08-22T04:00:00.000Z",
    },
    {
      id: "item-3",
      bookingId: "booking-1",
      pairNumber: 3,
      serviceId: "premium-care",
      serviceName: "Premium Care",
      servicePriceLabel: "Rs 699",
      servicePrice: 699,
      footwearType: "Sneakers",
      brand: "Goldstar",
      specialRequest: null,
      status: null,
      createdAt: "2026-08-22T04:00:00.000Z",
    },
    {
      id: "item-4",
      bookingId: "booking-1",
      pairNumber: 4,
      serviceId: "repair-priority",
      serviceName: "Repair Priority",
      servicePriceLabel: "From Rs 299",
      servicePrice: 299,
      footwearType: "Boots",
      brand: "Caliber",
      specialRequest: "Scuff on the toe.",
      status: null,
      createdAt: "2026-08-22T04:00:00.000Z",
    },
  ],
  statusHistory: [],
};

function configuredEnvironment(messages) {
  return {
    BOOKING_NOTIFICATION_FROM: "bookings@shoedoctor.com.np",
    BOOKING_EMAIL: {
      async send(message) {
        messages.push(message);
      },
    },
  };
}

test("sends one complete, escaped owner email through the configured binding", async () => {
  const messages = [];
  const result = await sendBookingEmailNotification(
    baseBooking,
    configuredEnvironment(messages),
  );

  assert.deepEqual(result, { status: "sent" });
  assert.equal(messages.length, 1);

  const [message] = messages;
  assert.equal(message.from, "bookings@shoedoctor.com.np");
  assert.equal(message.to, "shoedoctorhtd@gmail.com");
  assert.equal(
    message.subject,
    "\u{1F534} New Shoe Doctor Booking \u2014 SD-TEST-1234 \u2014 Asha <img src=x onerror=alert('x')>",
  );
  assert.match(message.text, /^NEW BOOKING/m);
  assert.match(message.text, /Created:/);
  assert.match(message.text, /Total pairs: 4 pairs/);
  assert.match(message.text, /PAIR 1/);
  assert.match(message.text, /PAIR 4/);
  assert.match(message.text, /Price: Rs 449/);
  assert.match(message.text, /Free delivery offer: 4\+ Pair Hetauda Offer/);
  assert.match(message.text, /Services subtotal: Rs 1,746/);
  assert.match(message.text, /Pickup & return fee: FREE/);
  assert.match(message.text, /Open WhatsApp: https:\/\/wa\.me\/9779812345678/);
  assert.match(message.text, /Open map: https:\/\/maps\.google\.com\/\?q=Hetauda/);
  assert.match(message.text, /We Diagnose\. We Clean\. We Restore\./);
  assert.match(message.html, /Asha &lt;img src=x onerror=alert\(&#39;x&#39;\)&gt;/);
  assert.match(message.html, /Sneakers &lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/);
  assert.match(message.html, /Please treat the &lt;strong&gt;stain&lt;\/strong&gt;\./);
  assert.doesNotMatch(message.html, /<script>alert/);
  assert.match(message.html, /href="https:\/\/wa\.me\/9779812345678"/);
  assert.match(message.html, /href="https:\/\/maps\.google\.com\/\?q=Hetauda"/);
});

test("does not turn an unsafe saved location into an email link", async () => {
  const messages = [];
  const result = await sendBookingEmailNotification(
    {
      ...baseBooking,
      locationUrl: "javascript:alert('x')",
      phone: "9812345678",
    },
    configuredEnvironment(messages),
  );

  assert.deepEqual(result, { status: "sent" });
  assert.equal(messages.length, 1);
  assert.doesNotMatch(messages[0].html, /href="javascript:/i);
  assert.doesNotMatch(messages[0].html, /wa\.me/);
});

test("keeps customer-provided line breaks out of the email subject", async () => {
  const messages = [];
  const result = await sendBookingEmailNotification(
    {
      ...baseBooking,
      customerName: "Asha\r\nBcc: outside@example.com",
    },
    configuredEnvironment(messages),
  );

  assert.deepEqual(result, { status: "sent" });
  assert.doesNotMatch(messages[0].subject, /[\r\n]/);
  assert.match(messages[0].subject, /Asha Bcc: outside@example\.com$/);
});

test("a binding failure is contained after the booking has been created", async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const result = await sendBookingEmailNotification(baseBooking, {
      BOOKING_NOTIFICATION_FROM: "bookings@shoedoctor.com.np",
      BOOKING_EMAIL: {
        async send() {
          throw new Error("binding rejected message");
        },
      },
    });

    assert.deepEqual(result, { status: "failed" });
  } finally {
    console.error = originalConsoleError;
  }
});

test("a missing binding is reported without attempting owner delivery", async () => {
  const result = await sendBookingEmailNotification(baseBooking, {
    BOOKING_NOTIFICATION_FROM: "bookings@shoedoctor.com.np",
  });

  assert.deepEqual(result, { status: "not_configured" });
});
