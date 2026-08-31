import type { ProductOrder } from "./product-types";

export function buildProductOrderOwnerEmail(order: ProductOrder, options: { adminOrderUrl?: string | null } = {}) {
  const items = order.items
    .map((item) => `${item.productName} (${item.sku}) x${item.quantity} — ${formatNpr(item.lineTotalNpr)}`)
    .join("\n");
  const fulfillment = order.fulfillmentMethod === "delivery" ? "Delivery" : "Shop collection";
  const paymentMethod = order.paymentMethod === "qr"
    ? "Online Payment - Scan QR"
    : order.paymentMethod === "cod"
      ? "Cash on Delivery (COD)"
      : "Not recorded";
  const paymentInstruction = order.paymentMethod === "qr"
    ? "Waiting for the customer to submit a payment receipt."
    : order.paymentMethod === "cod"
      ? "Cash will be collected during delivery."
      : "Payment status should be confirmed with the customer.";
  const adminOrderUrl = safeAdminOrderUrl(options.adminOrderUrl);
  const text = [
    "NEW PRODUCT ORDER",
    "",
    `Order reference: ${order.publicReference}`,
    `Order date and time: ${formatKathmandu(order.createdAt)}`,
    `Customer: ${order.customerName ?? "Walk-in customer"}`,
    `Phone: ${order.customerPhone ?? "Not provided"}`,
    `Email: ${order.customerEmail ?? "Not provided"}`,
    `Fulfilment: ${fulfillment}`,
    ...(order.deliveryAddress ? [`Address: ${order.deliveryAddress}`] : []),
    `Payment method: ${paymentMethod}`,
    `Payment status: ${label(order.paymentStatus)}`,
    paymentInstruction,
    "",
    "Products:",
    items,
    "",
    `Subtotal: ${formatNpr(order.subtotal)}`,
    `Delivery: ${formatNpr(order.deliveryCharge)}`,
    `Total: ${formatNpr(order.total)}`,
    ...(order.customerNote ? ["", `Customer note: ${order.customerNote}`] : []),
    ...(adminOrderUrl ? ["", `Open order in admin dashboard: ${adminOrderUrl}`] : []),
  ].join("\n");
  return {
    subject: `New product order - ${safeHeader(order.publicReference)} - ${safeHeader(order.customerName ?? "Customer")}`,
    text,
    html: emailHtml("New product order", order, "A customer has placed a product order.", adminOrderUrl),
  };
}

export function buildProductOrderCustomerEmail(order: ProductOrder) {
  const text = [
    "SHOE DOCTOR PRODUCT ORDER RECEIVED",
    "",
    `Order reference: ${order.publicReference}`,
    "We have received your order. Shoe Doctor will confirm payment and delivery with you shortly.",
    "",
    "Products:",
    ...order.items.map((item) => `${item.productName} x${item.quantity} — ${formatNpr(item.lineTotalNpr)}`),
    "",
    `Total: ${formatNpr(order.total)}`,
    `Fulfilment: ${order.fulfillmentMethod === "delivery" ? "Delivery" : "Shop collection"}`,
    `Payment status: ${label(order.paymentStatus)}`,
  ].join("\n");
  return {
    subject: `Shoe Doctor order received — ${safeHeader(order.publicReference)}`,
    text,
    html: emailHtml(
      "Order received",
      order,
      "We have received your order. We will confirm payment and delivery with you shortly.",
    ),
  };
}

/**
 * Payment fields are optional here so this email layer stays compatible while
 * the product-order persistence migration is introduced separately.
 */
export type ProductOrderPaymentEmailOrder = ProductOrder & {
  paymentAmount?: number | null;
  paymentMethod?: "qr" | "cod" | null;
  paymentRejectionReason?: string | null;
  paymentSubmittedAt?: string | null;
  paymentVerifiedAt?: string | null;
};

export type ProductPaymentReceiptEmailDetails = {
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  safeAttachmentFilename: string;
  sha256: string;
  sizeBytes: number;
  submittedAt?: string | null;
  transactionReference?: string | null;
};

export type ProductPaymentCustomerEmailKind = "receipt_submitted" | "approved" | "rejected" | "cod_order";

export type ProductPaymentCustomerEmailOptions = {
  paymentPageUrl?: string | null;
  rejectionReason?: string | null;
};

/**
 * Content for the owner Gmail message that carries the validated receipt as a
 * separate MIME attachment. This builder deliberately receives metadata only.
 */
export function buildProductPaymentReceiptOwnerEmail(
  order: ProductOrderPaymentEmailOrder,
  receipt: ProductPaymentReceiptEmailDetails,
  options: { adminOrderUrl?: string | null } = {},
) {
  const customerName = displayText(order.customerName, "Customer");
  const adminOrderUrl = safeAdminOrderUrl(options.adminOrderUrl);
  const submittedAt = formatKathmandu(receipt.submittedAt ?? order.paymentSubmittedAt);
  const transactionReference = displayText(receipt.transactionReference, "Not provided");
  const text = [
    "PAYMENT RECEIPT RECEIVED",
    "",
    `Order reference: ${displayText(order.publicReference, "Not available")}`,
    `Customer: ${customerName}`,
    `Phone: ${displayText(order.customerPhone, "Not provided")}`,
    `Email: ${displayText(order.customerEmail, "Not provided")}`,
    `Fulfilment: ${fulfillmentLabel(order)}`,
    ...(order.deliveryAddress ? [`Delivery address: ${displayText(order.deliveryAddress, "Not provided")}`] : []),
    `Payment method: ${paymentMethodLabel(order.paymentMethod)}`,
    `Payment status: Payment verification required`,
    "",
    "Products:",
    ...productLines(order),
    "",
    `Subtotal: ${formatNpr(order.subtotal)}`,
    `Delivery: ${formatNpr(order.deliveryCharge)}`,
    `Final payable amount: ${formatNpr(paymentAmount(order))}`,
    `Receipt filename: ${displayText(receipt.safeAttachmentFilename, "Unavailable")}`,
    `Receipt type: ${receipt.mimeType}`,
    `Receipt size: ${formatFileSize(receipt.sizeBytes)}`,
    `Receipt SHA-256: ${safeChecksum(receipt.sha256)}`,
    `Transaction/reference number: ${transactionReference}`,
    `Receipt submitted: ${submittedAt}`,
    ...(adminOrderUrl ? ["", `Open order in admin dashboard: ${adminOrderUrl}`] : []),
    "",
    "The receipt is attached to this email. Check the owner Gmail before verifying payment.",
  ].join("\n");
  return {
    subject: `Payment receipt received \u2013 ${safeHeader(order.publicReference)} \u2013 ${safeHeader(customerName)}`,
    text,
    html: paymentEmailHtml({
      title: "Payment receipt received",
      intro: "A customer submitted a payment receipt. Payment verification is required before confirming the order.",
      order,
      rows: [
        ["Customer", customerName],
        ["Phone", displayText(order.customerPhone, "Not provided")],
        ["Email", displayText(order.customerEmail, "Not provided")],
        ["Fulfilment", fulfillmentLabel(order)],
        ["Payment method", paymentMethodLabel(order.paymentMethod)],
        ["Payment status", "Payment verification required"],
        ["Receipt filename", displayText(receipt.safeAttachmentFilename, "Unavailable")],
        ["Receipt type", receipt.mimeType],
        ["Receipt size", formatFileSize(receipt.sizeBytes)],
        ["Receipt SHA-256", safeChecksum(receipt.sha256)],
        ["Transaction/reference number", transactionReference],
        ["Receipt submitted", submittedAt],
      ],
      notice: "The validated receipt is attached to this owner email. Check Gmail before verifying payment.",
      actionUrl: adminOrderUrl,
      actionLabel: "Open order in admin dashboard",
    }),
  };
}

export function buildProductPaymentReceiptSubmittedCustomerEmail(order: ProductOrderPaymentEmailOrder) {
  return buildPaymentCustomerEmail(order, {
    kind: "receipt_submitted",
    title: "Payment receipt submitted",
    intro: "We received your payment receipt. Shoe Doctor will verify it before confirming payment.",
    subject: `Payment receipt submitted \u2013 ${safeHeader(order.publicReference)}`,
    notice: "Submitting a receipt does not automatically confirm payment.",
  });
}

export function buildProductPaymentApprovedCustomerEmail(order: ProductOrderPaymentEmailOrder) {
  return buildPaymentCustomerEmail(order, {
    kind: "approved",
    title: "Payment confirmed",
    intro: "Shoe Doctor has confirmed your payment. We will continue with the next order step.",
    subject: `Payment confirmed \u2013 ${safeHeader(order.publicReference)}`,
    notice: "Your payment has been confirmed. We will update you as your order progresses.",
  });
}

export function buildProductPaymentRejectedCustomerEmail(
  order: ProductOrderPaymentEmailOrder,
  options: ProductPaymentCustomerEmailOptions = {},
) {
  const reason = displayText(options.rejectionReason ?? order.paymentRejectionReason, "Please contact Shoe Doctor for help.");
  const paymentPageUrl = safePaymentPageUrl(options.paymentPageUrl);
  const instructions = paymentPageUrl
    ? "Use the secure payment page below to submit a replacement receipt."
    : "Use the secure payment page you received after placing your order to submit a replacement receipt.";
  const content = buildPaymentCustomerEmail(order, {
    kind: "rejected",
    title: "Payment receipt needs replacement",
    intro: "Shoe Doctor could not verify the submitted payment receipt.",
    subject: `Payment receipt needs replacement \u2013 ${safeHeader(order.publicReference)}`,
    notice: instructions,
    rows: [["Rejection reason", reason]],
    actionUrl: paymentPageUrl,
    actionLabel: "Submit a replacement receipt",
  });
  return {
    ...content,
    text: `${content.text}\nRejection reason: ${reason}${paymentPageUrl ? `\nSecure payment page: ${paymentPageUrl}` : ""}`,
  };
}

export function buildProductCodOrderCustomerEmail(order: ProductOrderPaymentEmailOrder) {
  return buildPaymentCustomerEmail(order, {
    kind: "cod_order",
    title: "Cash on Delivery order received",
    intro: "Your order is confirmed for Cash on Delivery. Payment will be collected during delivery.",
    subject: `Cash on Delivery order received \u2013 ${safeHeader(order.publicReference)}`,
    notice: "Please have the final payable amount ready when your order is delivered.",
  });
}

/** A small dispatcher for durable notification workflows. */
export function buildProductPaymentStatusCustomerEmail(
  order: ProductOrderPaymentEmailOrder,
  kind: ProductPaymentCustomerEmailKind,
  options: ProductPaymentCustomerEmailOptions = {},
) {
  if (kind === "receipt_submitted") return buildProductPaymentReceiptSubmittedCustomerEmail(order);
  if (kind === "approved") return buildProductPaymentApprovedCustomerEmail(order);
  if (kind === "rejected") return buildProductPaymentRejectedCustomerEmail(order, options);
  return buildProductCodOrderCustomerEmail(order);
}

function buildPaymentCustomerEmail(
  order: ProductOrderPaymentEmailOrder,
  input: {
    actionLabel?: string;
    actionUrl?: string | null;
    intro: string;
    kind: ProductPaymentCustomerEmailKind;
    notice: string;
    rows?: Array<[string, string]>;
    subject: string;
    title: string;
  },
) {
  const status = input.kind === "receipt_submitted"
    ? "Awaiting verification"
    : input.kind === "approved"
      ? "Paid"
      : input.kind === "rejected"
        ? "Replacement receipt required"
        : "Cash on Delivery";
  const text = [
    "SHOE DOCTOR PRODUCT ORDER",
    "",
    `Order reference: ${displayText(order.publicReference, "Not available")}`,
    `Payment method: ${input.kind === "cod_order" ? "Cash on Delivery (COD)" : paymentMethodLabel(order.paymentMethod)}`,
    `Payment status: ${status}`,
    "",
    "Products:",
    ...productLines(order),
    "",
    `Final payable amount: ${formatNpr(paymentAmount(order))}`,
    ...(order.deliveryAddress ? [`Delivery address: ${displayText(order.deliveryAddress, "Not provided")}`] : []),
    "",
    input.intro,
    input.notice,
  ].join("\n");
  return {
    subject: input.subject,
    text,
    html: paymentEmailHtml({
      title: input.title,
      intro: input.intro,
      order,
      rows: [
        ["Payment method", input.kind === "cod_order" ? "Cash on Delivery (COD)" : paymentMethodLabel(order.paymentMethod)],
        ["Payment status", status],
        ...(input.rows ?? []),
      ],
      notice: input.notice,
      actionUrl: input.actionUrl ?? null,
      actionLabel: input.actionLabel,
    }),
  };
}

function paymentEmailHtml(input: {
  actionLabel?: string;
  actionUrl?: string | null;
  intro: string;
  notice: string;
  order: ProductOrderPaymentEmailOrder;
  rows: Array<[string, string]>;
  title: string;
}) {
  const order = input.order;
  const productRows = order.items
    .map((item) => `<tr><td style="padding:9px 0;border-bottom:1px solid #e7e4de">${escapeHtml(item.productName)} <small style="color:#5e5a55">(${escapeHtml(item.sku)})</small></td><td style="padding:9px 0;border-bottom:1px solid #e7e4de;text-align:right">${escapeHtml(formatNpr(item.unitPriceNpr))}</td><td style="padding:9px 0;border-bottom:1px solid #e7e4de;text-align:center">${item.quantity}</td><td style="padding:9px 0;border-bottom:1px solid #e7e4de;text-align:right">${escapeHtml(formatNpr(item.lineTotalNpr))}</td></tr>`)
    .join("");
  const metadataRows = input.rows
    .map(([name, value]) => `<p style="margin:8px 0 0"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(value)}</p>`)
    .join("");
  const address = order.deliveryAddress
    ? `<p style="margin:16px 0 0"><strong>Delivery address:</strong><br>${escapeHtml(displayText(order.deliveryAddress, "Not provided"))}</p>`
    : "";
  const action = input.actionUrl && input.actionLabel
    ? `<p style="margin:20px 0 0"><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#7b1738;border-radius:8px;color:#fff;padding:11px 15px;text-decoration:none">${escapeHtml(input.actionLabel)}</a></p>`
    : "";
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f6f5f2;color:#171412;font-family:Arial,sans-serif"><main style="max-width:640px;margin:0 auto;padding:24px 16px"><section style="background:#fff;border:1px solid #dedbd4;border-radius:12px;overflow:hidden"><header style="padding:24px 28px;background:#7b1738;color:#fff"><p style="font-size:11px;font-weight:700;letter-spacing:.12em;margin:0 0 7px;text-transform:uppercase">Shoe Doctor shop</p><h1 style="font-size:25px;line-height:1.2;margin:0">${escapeHtml(input.title)}</h1></header><div style="padding:25px 28px"><p style="font-size:16px;line-height:1.55;margin:0">${escapeHtml(input.intro)}</p><p style="margin:20px 0 0"><strong>Order reference:</strong> ${escapeHtml(displayText(order.publicReference, "Not available"))}</p><table role="presentation" style="border-collapse:collapse;font-size:14px;line-height:1.45;margin:20px 0 0;width:100%"><thead><tr><th style="padding:0 0 8px;text-align:left">Product</th><th style="padding:0 0 8px;text-align:right">Unit price</th><th style="padding:0 0 8px;text-align:center">Qty</th><th style="padding:0 0 8px;text-align:right">Total</th></tr></thead><tbody>${productRows}</tbody></table><p style="font-size:16px;font-weight:700;margin:22px 0 0;text-align:right">Final payable amount: ${escapeHtml(formatNpr(paymentAmount(order)))}</p>${address}${metadataRows}<p style="margin:20px 0 0;font-weight:700">${escapeHtml(input.notice)}</p>${action}</div></section></main></body></html>`;
}

function productLines(order: ProductOrderPaymentEmailOrder) {
  return order.items.map((item) => `${displayText(item.productName, "Product")} (${displayText(item.sku, "SKU unavailable")}) x${item.quantity} at ${formatNpr(item.unitPriceNpr)} each \u2014 ${formatNpr(item.lineTotalNpr)}`);
}

function paymentAmount(order: ProductOrderPaymentEmailOrder) {
  return typeof order.paymentAmount === "number" && Number.isFinite(order.paymentAmount) && order.paymentAmount >= 0
    ? order.paymentAmount
    : order.total;
}

function paymentMethodLabel(method: ProductOrderPaymentEmailOrder["paymentMethod"]) {
  if (method === "qr") return "Online Payment \u2013 Scan QR";
  if (method === "cod") return "Cash on Delivery (COD)";
  return "Online payment";
}

function fulfillmentLabel(order: ProductOrderPaymentEmailOrder) {
  return order.fulfillmentMethod === "delivery" ? "Delivery" : "Shop collection";
}

function formatKathmandu(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(date);
}

function formatFileSize(value: number) {
  if (!Number.isFinite(value) || value < 0) return "Unavailable";
  if (value < 1024) return `${Math.floor(value)} bytes`;
  return `${(value / 1024).toFixed(value < 1024 * 1024 ? 1 : 2)} ${value < 1024 * 1024 ? "KB" : "MB"}`;
}

function safeChecksum(value: string) {
  return /^[a-f0-9]{64}$/iu.test(value) ? value.toLowerCase() : "Unavailable";
}

function displayText(value: string | null | undefined, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/[\r\n\t]+/gu, " ").replace(/\s+/gu, " ").trim();
  return normalized ? normalized.slice(0, 1000) : fallback;
}

function safeAdminOrderUrl(value: string | null | undefined) {
  return safeHttpsUrl(value, "/admin/");
}

function safePaymentPageUrl(value: string | null | undefined) {
  return safeHttpsUrl(value, "/orders/");
}

function safeHttpsUrl(value: string | null | undefined, requiredPathPrefix: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname.startsWith(requiredPathPrefix) ? url.toString() : null;
  } catch {
    return null;
  }
}

function emailHtml(title: string, order: ProductOrder, intro: string, adminOrderUrl: string | null = null) {
  const rows = order.items
    .map((item) => `<tr><td style="padding:9px 0;border-bottom:1px solid #e7e4de">${escapeHtml(item.productName)} <small style="color:#5e5a55">(${escapeHtml(item.sku)})</small></td><td style="padding:9px 0;border-bottom:1px solid #e7e4de;text-align:center">${item.quantity}</td><td style="padding:9px 0;border-bottom:1px solid #e7e4de;text-align:right">${escapeHtml(formatNpr(item.lineTotalNpr))}</td></tr>`)
    .join("");
  const address = order.deliveryAddress
    ? `<p style="margin:16px 0 0"><strong>Delivery address:</strong><br>${escapeHtml(order.deliveryAddress)}</p>`
    : "";
  const action = adminOrderUrl ? `<p style="margin:20px 0 0"><a href="${escapeHtml(adminOrderUrl)}" style="background:#7b1738;border-radius:8px;color:#fff;display:inline-block;padding:11px 15px;text-decoration:none">Open protected order dashboard</a></p>` : "";
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f6f5f2;color:#171412;font-family:Arial,sans-serif"><main style="max-width:640px;margin:0 auto;padding:24px 16px"><section style="background:#fff;border:1px solid #dedbd4;border-radius:12px;overflow:hidden"><header style="padding:24px 28px;background:#7b1738;color:#fff"><p style="font-size:11px;font-weight:700;letter-spacing:.12em;margin:0 0 7px;text-transform:uppercase">Shoe Doctor shop</p><h1 style="font-size:25px;line-height:1.2;margin:0">${escapeHtml(title)}</h1></header><div style="padding:25px 28px"><p style="font-size:16px;line-height:1.55;margin:0">${escapeHtml(intro)}</p><p style="margin:20px 0 0"><strong>Order reference:</strong> ${escapeHtml(order.publicReference)}</p><table role="presentation" style="border-collapse:collapse;font-size:14px;line-height:1.45;margin:20px 0 0;width:100%"><thead><tr><th style="padding:0 0 8px;text-align:left">Product</th><th style="padding:0 0 8px;text-align:center">Qty</th><th style="padding:0 0 8px;text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table><p style="font-size:16px;font-weight:700;margin:22px 0 0;text-align:right">Total: ${escapeHtml(formatNpr(order.total))}</p><p style="margin:16px 0 0"><strong>Fulfilment:</strong> ${escapeHtml(order.fulfillmentMethod === "delivery" ? "Delivery" : "Shop collection")}</p><p style="margin:8px 0 0"><strong>Payment status:</strong> ${escapeHtml(label(order.paymentStatus))}</p>${address}${action}</div></section></main></body></html>`;
}

function formatNpr(value: number) {
  return `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(value)}`;
}

function label(value: string) {
  return value.replace(/_/gu, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function safeHeader(value: string) {
  return value.replace(/[\r\n]+/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 120);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}
