"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductOrder, ProductPaymentReceipt } from "@/lib/product-types";
import styles from "./ProductAdmin.module.css";
import { clearSessionRetryToken, getSessionRetryToken } from "./ProductRetryToken";

const CANCELLATION_RETRY_SCOPE = "product-order-cancellation";
const RETURN_RETRY_SCOPE = "product-order-return";
type AuditItem = { action: string; administratorName: string | null; actorType: string; reason: string | null; createdAt: string };

export default function ProductOrderDetailsDashboard({ initialOrder, receipts, auditTrail, canManage, canCancel, canVerifyPayments }: { initialOrder: ProductOrder; receipts: ProductPaymentReceipt[]; auditTrail: AuditItem[]; canManage: boolean; canCancel: boolean; canVerifyPayments: boolean }) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!canManage) return;
    const form = new FormData(event.currentTarget); const body: Record<string, unknown> = { status: form.get("status") };
    if (!order.paymentMethod) body.paymentStatus = form.get("paymentStatus");
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/admin/product-orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { order?: ProductOrder; message?: string };
      if (!response.ok || !result.order) throw new Error(result.message ?? "Unable to update order.");
      setOrder(result.order); setNotice("Order updated.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update order."); } finally { setBusy(false); }
  }

  async function orderAction(path: string, body: Record<string, unknown>, scope: string, success: string, updatesOrder = true) {
    setBusy(true); setError(null); setNotice(null);
    try {
      const idempotencyKey = await getSessionRetryToken(scope, { orderId: order.id, ...body });
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, idempotencyKey }) });
      const result = await response.json() as { order?: ProductOrder; message?: string; duplicate?: boolean };
      if (!response.ok) throw new Error(result.message ?? "Unable to complete this order action.");
      clearSessionRetryToken(scope, idempotencyKey);
      if (updatesOrder && result.order) setOrder(result.order);
      setNotice(result.duplicate ? "This action was already recorded; no stock was changed again." : success);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to complete this order action."); } finally { setBusy(false); }
  }

  async function cancel(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!canCancel) return; const reason = String(new FormData(event.currentTarget).get("reason") ?? ""); if (!window.confirm("Cancel this order and restore the deducted stock exactly once?")) return; await orderAction(`/api/admin/product-orders/${encodeURIComponent(order.id)}/cancel`, { reason }, CANCELLATION_RETRY_SCOPE, "Order cancelled and stock restored."); }
  async function returnItem(event: FormEvent<HTMLFormElement>, productId: string) { event.preventDefault(); if (!canManage) return; const form = new FormData(event.currentTarget); await orderAction(`/api/admin/product-orders/${encodeURIComponent(order.id)}/returns`, { productId, quantity: Number(form.get("quantity")), restock: form.get("restock") === "on", reason: String(form.get("reason") ?? "") }, RETURN_RETRY_SCOPE, "Return recorded. Stock changed only when marked suitable for restocking.", false); router.refresh(); }
  async function approveQrPayment() { if (!canVerifyPayments || !window.confirm("Approve this QR payment? Check the owner Gmail receipt attachment first.")) return; await orderAction(`/api/admin/product-orders/${encodeURIComponent(order.id)}/payment/approve`, { confirmation: true }, "product-qr-payment-approval", "QR payment approved. Stock was not deducted again."); }
  async function rejectQrPayment(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!canVerifyPayments) return; const reason = String(new FormData(event.currentTarget).get("reason") ?? ""); if (!window.confirm("Reject this receipt and allow a replacement?")) return; await orderAction(`/api/admin/product-orders/${encodeURIComponent(order.id)}/payment/reject`, { reason }, "product-qr-payment-rejection", "Payment receipt rejected. The customer can submit a replacement."); }
  async function collectCod(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!canVerifyPayments) return; const amountCollected = Number(new FormData(event.currentTarget).get("amountCollected")); if (!window.confirm("Record this COD collection? This will not deduct stock again.")) return; await orderAction(`/api/admin/product-orders/${encodeURIComponent(order.id)}/payment/cod-collection`, { confirmation: true, amountCollected }, "product-cod-collection", "COD payment recorded. Stock was not deducted again."); }

  const isCancellable = order.status !== "completed" && order.status !== "cancelled";
  return <main className={styles.shell}>
    <nav className={styles.nav} aria-label="Product administration"><Link href="/admin">Dashboard</Link><Link href="/admin/product-orders">All product orders</Link><Link href="/admin/inventory">Inventory</Link></nav>
    <section className={styles.intro}><p className="section-kicker">Product order</p><h1>{order.publicReference}</h1><p>{order.channel === "online" ? "Online customer order" : "Offline shop sale"} · Created {formatDate(order.createdAt)}</p></section>
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}{error ? <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p> : null}
    <div className={styles.detailGrid}>
      <section><h2>Customer and fulfilment</h2><p><strong>Name:</strong> {order.customerName ?? "Walk-in customer"}</p><p><strong>Phone:</strong> {order.customerPhone ?? "Not provided"}</p><p><strong>Email:</strong> {order.customerEmail ?? "Not provided"}</p><p><strong>Method:</strong> {order.fulfillmentMethod === "delivery" ? "Delivery" : "Shop collection"}</p>{order.deliveryAddress ? <p><strong>Address:</strong> {order.deliveryAddress}</p> : null}{order.customerNote ? <p><strong>Note:</strong> {order.customerNote}</p> : null}</section>
      <section><h2>Payment and status</h2><p><span className={`${styles.status} ${styles[order.status]}`}>{order.status}</span> <span className={styles.status}>{order.paymentStatus}</span></p><p><strong>Payment method:</strong> {order.paymentMethod === "qr" ? "Online QR" : order.paymentMethod === "cod" ? "Cash on Delivery" : "Legacy / offline"}</p><p><strong>Payable amount:</strong> Rs {order.paymentAmount.toLocaleString("en-NP")}</p><p><strong>Stock:</strong> {order.stockRestoredAt ? `Restored ${formatDate(order.stockRestoredAt)}` : "Committed once at order creation"}</p>{order.paymentRejectionReason ? <p><strong>Rejection reason:</strong> {order.paymentRejectionReason}</p> : null}{order.cancellationReason ? <p><strong>Cancellation reason:</strong> {order.cancellationReason}</p> : null}{canManage && order.status !== "cancelled" ? <form className={styles.form} onSubmit={update}><label>Status<select name="status" defaultValue={order.status}><option value={order.status}>{order.status}</option>{order.status === "pending" ? <option value="confirmed">confirmed</option> : null}{order.status === "confirmed" ? <option value="processing">processing</option> : null}{order.status === "processing" ? <option value="completed">completed</option> : null}</select></label>{!order.paymentMethod ? <label>Payment<select name="paymentStatus" defaultValue={order.paymentStatus}><option value="pending">pending</option><option value="unpaid">unpaid</option><option value="partial">partial</option><option value="paid">paid</option><option value="refunded">refunded</option></select></label> : null}<div className={styles.full}><button className={styles.primary} disabled={busy}>Save order status</button></div></form> : null}</section>
      <section className={styles.full}><h2>Ordered products</h2><ul className={styles.orderItems}>{order.items.map((item) => <li key={item.id}><span><strong>{item.productName}</strong><br /><small>{item.sku} · Rs {item.unitPriceNpr.toLocaleString("en-NP")} × {item.quantity}</small></span><strong>Rs {item.lineTotalNpr.toLocaleString("en-NP")}</strong></li>)}</ul><p><strong>Subtotal:</strong> Rs {order.subtotal.toLocaleString("en-NP")} · <strong>Delivery:</strong> Rs {order.deliveryCharge.toLocaleString("en-NP")} · <strong>Total:</strong> Rs {order.total.toLocaleString("en-NP")}</p></section>
    </div>
    {order.paymentMethod ? <section className={styles.panel}><h2>Payment verification</h2>{order.paymentMethod === "qr" ? <><p>The attached receipt was sent to shoedoctorhtd@gmail.com. Check the owner Gmail before verifying payment. Receipt files are not retained by the website.</p><ul className={styles.orderItems}>{receipts.length ? receipts.map((receipt) => <li key={receipt.id}><span><strong>{receipt.attachmentFilename}</strong><br /><small>{receipt.contentType} · {formatBytes(receipt.byteSize)} · {receipt.emailDeliveryStatus}{receipt.gmailMessageId ? ` · Gmail ID ${receipt.gmailMessageId}` : ""}</small><br /><small>SHA-256: {receipt.sha256Checksum}</small></span><strong>{receipt.submittedAt ? formatDate(receipt.submittedAt) : "Not submitted"}</strong></li>) : <li><span>No receipt has been submitted.</span></li>}</ul>{canVerifyPayments && order.paymentStatus === "submitted" && order.status === "payment_review" ? <><div className={styles.full}><button className={styles.primary} type="button" onClick={() => void approveQrPayment()} disabled={busy}>Approve QR payment</button></div><form className={styles.form} onSubmit={rejectQrPayment}><label className={styles.full}>Required rejection reason<textarea name="reason" minLength={3} maxLength={500} required /></label><div className={styles.full}><button className={styles.danger} disabled={busy}>Reject receipt and allow replacement</button></div></form></> : null}</> : <><p>Cash on Delivery: record payment only after collecting the exact server-calculated amount. This does not deduct stock again.</p>{canVerifyPayments && order.paymentStatus === "cod_pending" && order.status !== "cancelled" ? <form className={styles.form} onSubmit={collectCod}><label>Amount collected (NPR)<input name="amountCollected" type="number" min="0" max="10000000" defaultValue={order.paymentAmount} required /></label><div className={styles.full}><button className={styles.primary} disabled={busy}>Mark COD as paid</button></div></form> : null}</>}</section> : null}
    <section className={styles.panel}><h2>Payment and order audit history</h2><ul className={styles.orderItems}>{auditTrail.length ? auditTrail.map((entry, index) => <li key={`${entry.action}-${entry.createdAt}-${index}`}><span><strong>{entry.action.replace(/_/gu, " ")}</strong><br /><small>{entry.administratorName ?? entry.actorType}{entry.reason ? ` · ${entry.reason}` : ""}</small></span><strong>{formatDate(entry.createdAt)}</strong></li>) : <li><span>No audit history is available.</span></li>}</ul></section>
    {canCancel && isCancellable ? <section className={styles.panel}><h2>Cancel order</h2><form className={styles.form} onSubmit={cancel}><label className={styles.full}>Required cancellation reason<textarea name="reason" minLength={3} maxLength={500} required /></label><div className={styles.full}><button className={styles.danger} disabled={busy}>Cancel and restore stock</button></div></form></section> : null}
    {canManage && order.status === "completed" ? <section className={styles.panel}><h2>Customer returns</h2><p>Only restock items that are suitable to sell again. Damaged returns stay out of stock but remain in the history.</p>{order.items.map((item) => <form className={styles.form} onSubmit={(event) => void returnItem(event, item.productId)} key={item.id}><p className={styles.full}><strong>{item.productName}</strong> · Sold quantity: {item.quantity}</p><label>Return quantity<input name="quantity" type="number" min="1" max={item.quantity} defaultValue="1" required /></label><label className={styles.check}><input name="restock" type="checkbox" />Suitable for restocking</label><label className={styles.full}>Return reason<textarea name="reason" minLength={3} maxLength={500} required /></label><div className={styles.full}><button className={styles.secondary} disabled={busy}>Record return</button></div></form>)}</section> : null}
  </main>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(new Date(value)); }
function formatBytes(value: number) { return value < 1024 ? `${value} bytes` : `${(value / 1024).toFixed(1)} KB`; }
