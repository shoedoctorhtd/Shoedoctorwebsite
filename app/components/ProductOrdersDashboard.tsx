"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product, ProductOrder, ProductOrderStatus, ProductPaymentStatus } from "@/lib/product-types";
import { clearSessionRetryToken, getSessionRetryToken } from "./ProductRetryToken";
import styles from "./ProductAdmin.module.css";

type Filters = { search?: string; channel?: "online" | "offline"; status?: ProductOrderStatus; paymentStatus?: ProductPaymentStatus; date?: string; page?: number };
const OFFLINE_SALE_RETRY_SCOPE = "offline-sale";

export default function ProductOrdersDashboard({ initialOrders, products, filters, page, pageSize, total, canRecordOffline, canManage, canCancel }: { initialOrders: ProductOrder[]; products: Product[]; filters: Filters; page: number; pageSize: number; total: number; canRecordOffline: boolean; canManage: boolean; canCancel: boolean }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [offlineLines, setOfflineLines] = useState([{ productSlug: "", quantity: 1 }]);
  const [paymentStatus, setPaymentStatus] = useState<ProductPaymentStatus>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saleProducts = products.filter((product) => product.status === "published" && product.slug && product.stockQuantity !== null && product.stockQuantity > 0);

  async function updateOrder(order: ProductOrder, body: Record<string, unknown>) {
    setBusy(order.id); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/admin/product-orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { order?: ProductOrder; message?: string; duplicate?: boolean };
      if (!response.ok || !result.order) throw new Error(result.message ?? "Unable to update order.");
      setOrders((current) => current.map((candidate) => candidate.id === order.id ? result.order! : candidate));
      setNotice("Order updated.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update order."); }
    finally { setBusy(null); }
  }

  async function cancel(order: ProductOrder) {
    const reason = window.prompt(`Enter the cancellation reason for ${order.publicReference}.`);
    if (!reason) return;
    if (!window.confirm("Cancel this order and restore stock exactly once?")) return;
    setBusy(order.id); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/admin/product-orders/${encodeURIComponent(order.id)}/cancel`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason, idempotencyKey: crypto.randomUUID() }) });
      const result = await response.json() as { order?: ProductOrder; message?: string; duplicate?: boolean };
      if (!response.ok || !result.order) throw new Error(result.message ?? "Unable to cancel order.");
      setOrders((current) => current.map((candidate) => candidate.id === order.id ? result.order! : candidate));
      setNotice(result.duplicate ? "This order was already cancelled; stock was not restored again." : "Order cancelled and stock restored.");
    } catch (reasonValue) { setError(reasonValue instanceof Error ? reasonValue.message : "Unable to cancel order."); }
    finally { setBusy(null); }
  }

  async function recordOfflineSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validLines = offlineLines.filter((line) => line.productSlug && line.quantity > 0);
    if (!validLines.length) { setError("Add at least one product to the offline sale."); return; }
    const form = new FormData(event.currentTarget);
    setBusy("offline"); setError(null); setNotice(null);
    try {
      const request = {
        customerName: String(form.get("customerName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        paymentStatus,
        note: String(form.get("note") ?? ""),
        items: validLines.map((line) => ({ productSlug: line.productSlug, quantity: line.quantity })),
      };
      const idempotencyToken = await getSessionRetryToken(OFFLINE_SALE_RETRY_SCOPE, request);
      const response = await fetch("/api/admin/product-orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        idempotencyToken,
        ...request,
      }) });
      const result = await response.json() as { order?: ProductOrder; message?: string };
      if (!response.ok || !result.order) throw new Error(result.message ?? "Unable to record offline sale.");
      clearSessionRetryToken(OFFLINE_SALE_RETRY_SCOPE, idempotencyToken);
      setNotice(`Offline sale ${result.order.publicReference} recorded and stock deducted.`);
      setOfflineLines([{ productSlug: "", quantity: 1 }]);
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to record offline sale."); }
    finally { setBusy(null); }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <main className={styles.shell}>
    <nav className={styles.nav} aria-label="Product administration"><Link href="/admin">Dashboard</Link><Link href="/admin/products">Products</Link><Link href="/admin/inventory">Inventory</Link></nav>
    <section className={styles.intro}><p className="section-kicker">Shop management</p><h1>PRODUCT ORDERS</h1><p>Manage online and walk-in shop orders independently from shoe-cleaning bookings. Prices below are immutable snapshots from the completed sale.</p></section>
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}{error ? <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p> : null}
    {canRecordOffline ? <section className={styles.panel}><div className={styles.panelHead}><h2>Record offline sale</h2><span>Walk-in shop sale</span></div><form className={styles.form} onSubmit={recordOfflineSale}><label>Customer name <small>(optional)</small><input name="customerName" maxLength={120} /></label><label>Phone <small>(optional)</small><input name="phone" maxLength={32} inputMode="tel" /></label><label>Payment status<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as ProductPaymentStatus)}><option value="pending">Pending</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option></select></label><label className={styles.full}>Sale note <small>(optional)</small><input name="note" maxLength={1000} /></label>{offlineLines.map((line, index) => <div className={styles.full} key={index} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 110px auto", gap: 10 }}><select value={line.productSlug} onChange={(event) => setOfflineLines((current) => current.map((candidate, position) => position === index ? { ...candidate, productSlug: event.target.value } : candidate))} aria-label={`Product ${index + 1}`}><option value="">Choose product</option>{saleProducts.map((product) => <option key={product.id} value={product.slug!}>{product.name} — Rs {product.priceNpr?.toLocaleString("en-NP")} ({product.stockQuantity} available)</option>)}</select><input type="number" min="1" max="100" value={line.quantity} onChange={(event) => setOfflineLines((current) => current.map((candidate, position) => position === index ? { ...candidate, quantity: Number(event.target.value) } : candidate))} aria-label={`Quantity ${index + 1}`} />{offlineLines.length > 1 ? <button className={styles.secondary} type="button" onClick={() => setOfflineLines((current) => current.filter((_, position) => position !== index))}>Remove</button> : <span />}</div>)}<div className={styles.full}><button className={styles.secondary} type="button" onClick={() => setOfflineLines((current) => [...current, { productSlug: "", quantity: 1 }])}>+ Add another product</button> <button className={styles.primary} type="submit" disabled={busy === "offline"}>{busy === "offline" ? "Recording…" : "Confirm offline sale"}</button></div></form></section> : null}
    <section className={styles.panel}><div className={styles.panelHead}><h2>Orders</h2><span>{total} total</span></div><form className={styles.filters} action="/admin/product-orders"><input name="search" defaultValue={filters.search} placeholder="Reference, customer name, or phone" /><select name="channel" defaultValue={filters.channel ?? ""}><option value="">All channels</option><option value="online">Online</option><option value="offline">Offline</option></select><select name="status" defaultValue={filters.status ?? ""}><option value="">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""}><option value="">All payments</option><option value="pending">Pending</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select><input name="date" type="date" defaultValue={filters.date} /><button className={styles.primary} type="submit">Filter</button></form><div className={styles.orderList}>{orders.map((order) => <article className={styles.order} key={order.id}><div><strong>{order.publicReference}</strong><small>{formatDate(order.createdAt)} · {order.channel}</small></div><div><strong>{order.customerName ?? "Walk-in customer"}</strong><small>{order.customerPhone ?? "No phone"}</small><small>{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(", ")}</small></div><div><span className={`${styles.status} ${styles[order.status]}`}>{order.status}</span><small>{order.stockRestoredAt ? "Stock restored" : "Stock active"}</small></div><div><strong>Rs {order.total.toLocaleString("en-NP")}</strong><small>{order.paymentStatus}</small></div><div className={styles.rowActions}><Link href={`/admin/product-orders/${encodeURIComponent(order.id)}`}>View</Link>{canManage && order.status !== "cancelled" ? <select aria-label={`Status for ${order.publicReference}`} disabled={busy === order.id} value={order.status} onChange={(event) => void updateOrder(order, { status: event.target.value as ProductOrderStatus })}><option value={order.status}>{order.status}</option>{order.status === "pending" ? <><option value="confirmed">confirmed</option></> : null}{order.status === "confirmed" ? <option value="processing">processing</option> : null}{order.status === "processing" ? <option value="completed">completed</option> : null}</select> : null}{canCancel && order.status !== "cancelled" && order.status !== "completed" ? <button type="button" onClick={() => void cancel(order)} disabled={busy === order.id}>Cancel</button> : null}</div></article>)}</div><div className={styles.nav} style={{ marginTop: 16 }}>{page > 1 ? <Link href={pageHref(filters, page - 1)}>Previous</Link> : null}<span>Page {page} of {pages}</span>{page < pages ? <Link href={pageHref(filters, page + 1)}>Next</Link> : null}</div></section>
  </main>;
}

function pageHref(filters: Filters, page: number) { const query = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value && key !== "page") query.set(key, String(value)); }); query.set("page", String(page)); return `/admin/product-orders?${query}`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(new Date(value)); }
