import assert from "node:assert/strict";
import test from "node:test";

const { buildStatusEmail } = await import("../lib/email/statusTemplates.ts");
const { buildRawGmailMessage } = await import("../lib/email/mime.ts");

const booking = {
  bookingReference: "SD-260825-XM",
  customerName: "Asha <script>alert('x')</script>",
  fulfillmentMethod: "self_dropoff",
  serviceName: "Deep Clean & Restore",
};

test("customer-facing statuses have a centralized predefined email", () => {
  for (const status of [
    "confirmed",
    "received",
    "in_progress",
    "completed",
    "ready",
    "cancelled",
  ]) {
    const content = buildStatusEmail(status, booking);
    assert.ok(content, `${status} should create a customer notification`);
    assert.match(content.text, /Shoe Doctor/);
    assert.match(content.text, /Booking: SD-260825-XM/);
    assert.match(content.subject, /SD-260825-XM/);
    assert.match(content.html, /We Diagnose\. We Clean\. We Restore\./);
  }
  assert.equal(buildStatusEmail("new", booking), null);
});

test("status email HTML escapes customer-controlled booking fields", () => {
  const content = buildStatusEmail("completed", booking);
  assert.ok(content);
  assert.match(content.html, /Asha &lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/);
  assert.match(content.html, /Deep Clean &amp; Restore/);
  assert.doesNotMatch(content.html, /<script>alert/);
});

test("ready email uses the saved collection method and never invents a total", () => {
  const collection = buildStatusEmail("ready", booking);
  const delivery = buildStatusEmail("ready", {
    ...booking,
    fulfillmentMethod: "pickup_delivery",
  });
  assert.ok(collection && delivery);
  assert.match(collection.text, /ready for collection at Shoe Doctor/i);
  assert.match(delivery.text, /prepared for return delivery/i);
  assert.doesNotMatch(collection.text, /Total:/i);
  assert.doesNotMatch(delivery.text, /Total:/i);
});

test("Gmail payload contains portable plain-text and HTML alternatives", () => {
  const raw = buildRawGmailMessage({
    from: "shoedoctorhtd@gmail.com",
    to: "customer@example.com",
    subject: "\u{1F45F} Booking Accepted \u2014 SD-TEST-1234",
    text: "Plain text fallback",
    html: "<p>HTML alternative</p>",
  });
  assert.doesNotMatch(raw, /[+/=]/);
  const mime = Buffer.from(
    raw.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
  assert.match(mime, /Content-Type: text\/plain; charset=UTF-8/);
  assert.match(mime, /Content-Type: text\/html; charset=UTF-8/);
  assert.ok(mime.includes("UGxhaW4gdGV4dCBmYWxsYmFjaw=="));
  assert.ok(mime.includes("PHA+SFRNTCBhbHRlcm5hdGl2ZTwvcD4="));
});
