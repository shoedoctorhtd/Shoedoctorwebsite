import assert from "node:assert/strict";
import test from "node:test";

const { buildStatusEmail } = await import("../lib/email/statusTemplates.ts");
const { buildRawGmailMessage } = await import("../lib/email/mime.ts");
const {
  buildProductPaymentReceiptOwnerEmail,
  buildProductPaymentRejectedCustomerEmail,
} = await import("../lib/product-order-email.ts");

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

test("Gmail receipt attachments are safely nested as binary MIME parts", () => {
  const raw = buildRawGmailMessage({
    from: "shoedoctorhtd@gmail.com",
    to: "owner@example.com",
    subject: "Payment receipt received",
    text: "Receipt metadata only.",
    html: "<p>Receipt metadata only.</p>",
    attachments: [{
      contentType: "image/png",
      filename: "payment-receipt-PO-260829-ABC.png",
      data: Uint8Array.from([0, 1, 2, 3, 254, 255]),
    }],
  });
  const mime = Buffer.from(
    raw.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("latin1");

  assert.match(mime, /Content-Type: multipart\/mixed; boundary=/);
  assert.match(mime, /Content-Type: multipart\/alternative; boundary=/);
  assert.match(mime, /Content-Type: image\/png; name="payment-receipt-PO-260829-ABC\.png"/);
  assert.match(mime, /Content-Disposition: attachment; filename="payment-receipt-PO-260829-ABC\.png"/);
  assert.match(mime, /AAECA\/7\//);
});

test("Gmail receipt attachments reject unsafe MIME metadata", () => {
  const input = {
    from: "shoedoctorhtd@gmail.com",
    to: "owner@example.com",
    subject: "Payment receipt received",
    text: "Receipt metadata only.",
    html: "<p>Receipt metadata only.</p>",
  };
  assert.throws(() => buildRawGmailMessage({
    ...input,
    attachments: [{
      contentType: "image/png",
      filename: "receipt.png\r\nBcc: outside@example.com",
      data: Uint8Array.of(1),
    }],
  }), /Invalid Gmail attachment/);
  assert.throws(() => buildRawGmailMessage({
    ...input,
    attachments: [{
      contentType: "text/html",
      filename: "receipt.html",
      data: Uint8Array.of(1),
    }],
  }), /Invalid Gmail attachment/);
});

test("payment receipt and replacement emails contain only safe payment metadata", () => {
  const order = {
    id: "internal-order-id",
    publicReference: "PO-260829-ABC",
    channel: "online",
    customerName: "Asha <script>alert('x')</script>",
    customerPhone: "9812345678",
    customerEmail: "asha@example.com",
    fulfillmentMethod: "delivery",
    deliveryAddress: "Hetauda <img src=x>",
    customerNote: null,
    subtotal: 1200,
    deliveryCharge: 100,
    total: 1300,
    status: "pending",
    paymentStatus: "unpaid",
    cancellationReason: null,
    cancelledAt: null,
    stockRestoredAt: null,
    createdByAdminId: null,
    createdAt: "2026-08-29T08:00:00.000Z",
    updatedAt: "2026-08-29T08:00:00.000Z",
    paymentMethod: "qr",
    paymentAmount: 1300,
    items: [{
      id: "item-1",
      productId: "product-1",
      sku: "CLEAN-001",
      productName: "Cleaner <script>alert('x')</script>",
      unitPriceNpr: 1200,
      quantity: 1,
      lineTotalNpr: 1200,
    }],
  };
  const owner = buildProductPaymentReceiptOwnerEmail(order, {
    mimeType: "image/png",
    safeAttachmentFilename: "payment-receipt-PO-260829-ABC.png",
    sha256: "a".repeat(64),
    sizeBytes: 1024,
    submittedAt: "2026-08-29T08:05:00.000Z",
    transactionReference: "FONEPAY-123",
  }, {
    adminOrderUrl: "https://shoedoctor.example/admin/product-orders/internal-order-id",
  });
  assert.match(owner.subject, /^Payment receipt received \u2013 PO-260829-ABC \u2013 Asha <script>alert\('x'\)<\/script>$/);
  assert.match(owner.text, /Receipt SHA-256: a{64}/);
  assert.match(owner.text, /CLEAN-001\) x1 at Rs 1,200 each/);
  assert.match(owner.html, />Unit price</);
  assert.match(owner.html, /Asha &lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/);
  assert.doesNotMatch(owner.html, /<script>alert/);
  assert.match(owner.html, /href="https:\/\/shoedoctor\.example\/admin\/product-orders\/internal-order-id"/);

  const rejected = buildProductPaymentRejectedCustomerEmail(order, {
    rejectionReason: "Receipt <script>alert('x')</script> is unreadable.",
    paymentPageUrl: "javascript:alert('x')",
  });
  assert.match(rejected.html, /Receipt &lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt; is unreadable\./);
  assert.doesNotMatch(rejected.html, /href="javascript:/i);
});
