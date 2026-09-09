"use client";

import { useRef, useState } from "react";
import { AdminModuleNav } from "./AdminAccessProvider";
import { useRouter } from "next/navigation";
import type { CounterSaleDetail } from "@/lib/counter-sales";
import { clearSessionRetryToken, getSessionRetryToken } from "./ProductRetryToken";
import { counterDate } from "./CounterInventoryDashboard";
import styles from "./ProductAdmin.module.css";
import counter from "./CounterInventory.module.css";

export default function CounterSaleDetails({ detail, canReverse }: { detail: CounterSaleDetail; canReverse: boolean }) {
  const router = useRouter();
  const [order, setOrder] = useState(detail.order);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const created = detail.audit.find((event) => ["COUNTER_SALE_CREATED", "PRODUCT_OFFLINE_SALE_RECORDED"].includes(event.action));
  const reversed = detail.audit.find((event) => ["COUNTER_SALE_REVERSED", "PRODUCT_ORDER_CANCELLED"].includes(event.action));

  async function reverse() {
    if (busy || !canReverse) return;
    setBusy(true); setError("");
    try {
      const token = await getSessionRetryToken("counter-sale-reversal", { id: order.id, reason });
      const response = await fetch(`/api/admin/counter-inventory/${order.id}/reverse`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason, idempotencyKey: token }) });
      const result = await response.json() as { order?: typeof order; message?: string };
      if (!response.ok || !result.order) throw new Error(result.message ?? "Unable to reverse sale.");
      clearSessionRetryToken("counter-sale-reversal", token);
      setOrder(result.order); dialog.current?.close(); setNotice("Counter sale reversed. Quantities restored to inventory."); router.refresh();
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to reverse sale."); }
    finally { setBusy(false); }
  }

  return <main id="main-content" className={`${styles.shell} ${counter.shell}`}>
    <AdminModuleNav activeHref="/admin/counter-inventory" />
    <header className={counter.header}><h1>{order.publicReference}</h1><p>{order.status === "cancelled" ? "Reversed" : "Recorded"} · {counterDate(order.createdAt)} NPT</p></header>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <section className={styles.panel}><h2>Counter Sale</h2><p>Recorded by: <strong>{created?.administratorName ?? "Legacy / unknown"}</strong> {created?.administratorEmail}</p><div className={counter.tableWrap}><table className={counter.table}><thead><tr><th>Product / SKU</th><th>Quantity</th><th>Unit price at sale</th><th>Subtotal</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id}><td>{item.productName}<br /><small>{item.sku}</small></td><td>{item.quantity}</td><td>Rs {item.unitPriceNpr}</td><td>Rs {item.lineTotalNpr}</td></tr>)}</tbody></table></div><p className={counter.total}>Total sale <strong>Rs {order.total}</strong></p></section>
    <section className={styles.panel}><h2>Inventory movements</h2>{detail.movements.map((movement, index) => <p key={index}><strong>{movement.productName}</strong>: {movement.previousStock} → {movement.resultingStock} ({movement.stockChange > 0 ? "+" : ""}{movement.stockChange}) · {movement.movementType.replaceAll("_", " ")} · {counterDate(movement.createdAt)}</p>)}</section>
    {order.status === "cancelled" ? <section className={styles.panel}><h2>Reversal</h2><p>Reversed by: {reversed?.administratorName ?? "Recorded in activity history"} {reversed?.administratorEmail}</p><p>{order.cancelledAt ? counterDate(order.cancelledAt) : ""} NPT</p><p>{order.cancellationReason}</p></section> : canReverse ? <section className={styles.panel}><h2>Cancel / Reverse Sale</h2><p>Restore every product in this transaction to inventory.</p>{detail.hasReturns ? <p>This sale already has returns. A full reversal is unavailable.</p> : <button className={styles.danger} onClick={() => { setError(""); dialog.current?.showModal(); }}>Cancel / Reverse Sale</button>}</section> : null}
    <section className={styles.panel}><h2>Admin activity</h2>{detail.audit.map((event) => <p key={event.id}>{event.action.replaceAll("_", " ")} · {event.administratorName ?? "Legacy / unknown"} · {counterDate(event.createdAt)}{event.ownerAlertStatus ? ` · Management email: ${event.ownerAlertStatus}` : ""}</p>)}</section>
    <dialog ref={dialog} className={counter.dialog} aria-labelledby="reverse-title" onCancel={(event) => { if (busy) event.preventDefault(); }}><h2 id="reverse-title">Reverse {order.publicReference}?</h2><p>The original sale stays in history. All {order.items.reduce((sum, item) => sum + item.quantity, 0)} units will return to inventory.</p><label className={counter.reason}>Reason (optional)<textarea maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} /></label>{error && <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>}<div className={counter.actions}><button className={styles.secondary} disabled={busy} onClick={() => dialog.current?.close()}>Back</button><button className={styles.danger} disabled={busy} onClick={() => void reverse()}>{busy ? "Reversing…" : "Confirm Reversal"}</button></div></dialog>
  </main>;
}
