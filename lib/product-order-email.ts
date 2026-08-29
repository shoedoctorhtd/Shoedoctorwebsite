import type { ProductOrder } from "./product-types";

export function buildProductOrderOwnerEmail(order: ProductOrder) {
  const items = order.items
    .map((item) => `${item.productName} (${item.sku}) x${item.quantity} — ${formatNpr(item.lineTotalNpr)}`)
    .join("\n");
  const fulfillment = order.fulfillmentMethod === "delivery" ? "Delivery" : "Shop collection";
  const text = [
    "NEW PRODUCT ORDER",
    "",
    `Order reference: ${order.publicReference}`,
    `Customer: ${order.customerName ?? "Walk-in customer"}`,
    `Phone: ${order.customerPhone ?? "Not provided"}`,
    `Email: ${order.customerEmail ?? "Not provided"}`,
    `Fulfilment: ${fulfillment}`,
    ...(order.deliveryAddress ? [`Address: ${order.deliveryAddress}`] : []),
    `Payment status: ${label(order.paymentStatus)}`,
    "",
    "Products:",
    items,
    "",
    `Subtotal: ${formatNpr(order.subtotal)}`,
    `Delivery: ${formatNpr(order.deliveryCharge)}`,
    `Total: ${formatNpr(order.total)}`,
    ...(order.customerNote ? ["", `Customer note: ${order.customerNote}`] : []),
  ].join("\n");
  return {
    subject: `New Shoe Doctor product order — ${safeHeader(order.publicReference)}`,
    text,
    html: emailHtml("New product order", order, "A customer has placed a product order."),
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

function emailHtml(title: string, order: ProductOrder, intro: string) {
  const rows = order.items
    .map((item) => `<tr><td style="padding:9px 0;border-bottom:1px solid #e7e4de">${escapeHtml(item.productName)} <small style="color:#5e5a55">(${escapeHtml(item.sku)})</small></td><td style="padding:9px 0;border-bottom:1px solid #e7e4de;text-align:center">${item.quantity}</td><td style="padding:9px 0;border-bottom:1px solid #e7e4de;text-align:right">${escapeHtml(formatNpr(item.lineTotalNpr))}</td></tr>`)
    .join("");
  const address = order.deliveryAddress
    ? `<p style="margin:16px 0 0"><strong>Delivery address:</strong><br>${escapeHtml(order.deliveryAddress)}</p>`
    : "";
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f6f5f2;color:#171412;font-family:Arial,sans-serif"><main style="max-width:640px;margin:0 auto;padding:24px 16px"><section style="background:#fff;border:1px solid #dedbd4;border-radius:12px;overflow:hidden"><header style="padding:24px 28px;background:#7b1738;color:#fff"><p style="font-size:11px;font-weight:700;letter-spacing:.12em;margin:0 0 7px;text-transform:uppercase">Shoe Doctor shop</p><h1 style="font-size:25px;line-height:1.2;margin:0">${escapeHtml(title)}</h1></header><div style="padding:25px 28px"><p style="font-size:16px;line-height:1.55;margin:0">${escapeHtml(intro)}</p><p style="margin:20px 0 0"><strong>Order reference:</strong> ${escapeHtml(order.publicReference)}</p><table role="presentation" style="border-collapse:collapse;font-size:14px;line-height:1.45;margin:20px 0 0;width:100%"><thead><tr><th style="padding:0 0 8px;text-align:left">Product</th><th style="padding:0 0 8px;text-align:center">Qty</th><th style="padding:0 0 8px;text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table><p style="font-size:16px;font-weight:700;margin:22px 0 0;text-align:right">Total: ${escapeHtml(formatNpr(order.total))}</p><p style="margin:16px 0 0"><strong>Fulfilment:</strong> ${escapeHtml(order.fulfillmentMethod === "delivery" ? "Delivery" : "Shop collection")}</p><p style="margin:8px 0 0"><strong>Payment status:</strong> ${escapeHtml(label(order.paymentStatus))}</p>${address}</div></section></main></body></html>`;
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
