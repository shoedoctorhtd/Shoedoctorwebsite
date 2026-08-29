"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { InventoryMovement, Product, ProductOrder } from "@/lib/product-types";
import { clearSessionRetryToken, getSessionRetryToken } from "./ProductRetryToken";
import styles from "./ProductAdmin.module.css";

type InventoryHistoryResponse = {
  movements?: InventoryMovement[];
  page?: number;
  pageSize?: number;
  total?: number;
  message?: string;
};

const INVENTORY_ADJUSTMENT_RETRY_SCOPE = "inventory-adjustment";
const INITIAL_STOCK_RETRY_SCOPE = "initial-product-stock";
const CUSTOMER_RETURN_RETRY_SCOPE = "customer-return";

export default function InventoryDashboard({
  initialProducts,
  initialMovements,
  initialHistoryPage,
  initialHistoryPageSize,
  initialHistoryTotal,
  initialCompletedOrders,
  selectedProductId,
  canAdjust,
  canReturn,
}: {
  initialProducts: Product[];
  initialMovements: InventoryMovement[];
  initialHistoryPage: number;
  initialHistoryPageSize: number;
  initialHistoryTotal: number;
  initialCompletedOrders: ProductOrder[];
  selectedProductId?: string;
  canAdjust: boolean;
  canReturn: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [movements, setMovements] = useState(initialMovements);
  const [historyPage, setHistoryPage] = useState(initialHistoryPage);
  const [historyPageSize, setHistoryPageSize] = useState(initialHistoryPageSize);
  const [historyTotal, setHistoryTotal] = useState(initialHistoryTotal);
  const [historyProductId, setHistoryProductId] = useState(selectedProductId ?? "");
  const [productId, setProductId] = useState(selectedProductId ?? initialProducts[0]?.id ?? "");
  const [movementType, setMovementType] = useState<"restock" | "damaged" | "missing" | "count_correction">("restock");
  const [quantity, setQuantity] = useState("");
  const [count, setCount] = useState("");
  const [reason, setReason] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [returnOrderId, setReturnOrderId] = useState(initialCompletedOrders[0]?.id ?? "");
  const [returnProductId, setReturnProductId] = useState(initialCompletedOrders[0]?.items[0]?.productId ?? "");
  const [returnQuantity, setReturnQuantity] = useState("1");
  const [returnRestock, setReturnRestock] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<"adjustment" | "initial-stock" | "return" | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const historyRequestId = useRef(0);

  const selected = products.find((product) => product.id === productId) ?? null;
  const selectedDraftWithoutStock = selected?.status === "draft" && selected.stockQuantity === null;
  const selectedReturnOrder = initialCompletedOrders.find((order) => order.id === returnOrderId) ?? null;
  const selectedReturnItem = selectedReturnOrder?.items.find((item) => item.productId === returnProductId) ?? null;
  const lowStock = useMemo(
    () => products.filter((product) => product.stockQuantity !== null && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold),
    [products],
  );
  const outStock = useMemo(() => products.filter((product) => product.stockQuantity === 0), [products]);
  const historyPages = Math.max(1, Math.ceil(historyTotal / Math.max(1, historyPageSize)));

  function historyUrl(page: number, scopeProductId = historyProductId) {
    const query = new URLSearchParams({ page: String(page) });
    return scopeProductId
      ? `/api/admin/products/${encodeURIComponent(scopeProductId)}/inventory?${query}`
      : `/api/admin/inventory?${query}`;
  }

  async function refreshProducts() {
    const response = await fetch("/api/admin/products", { cache: "no-store" });
    const result = await response.json() as { products?: Product[]; message?: string };
    if (!response.ok || !result.products) throw new Error(result.message ?? "Unable to refresh product inventory.");
    setProducts(result.products);
  }

  async function loadHistory(page: number, scopeProductId = historyProductId) {
    const requestId = historyRequestId.current + 1;
    historyRequestId.current = requestId;
    setHistoryBusy(true);
    try {
      const response = await fetch(historyUrl(page, scopeProductId), { cache: "no-store" });
      const result = await response.json() as InventoryHistoryResponse;
      const resultPage = result.page;
      const resultPageSize = result.pageSize;
      const resultTotal = result.total;
      if (
        !response.ok ||
        !result.movements ||
        typeof resultPage !== "number" || !Number.isSafeInteger(resultPage) ||
        typeof resultPageSize !== "number" || !Number.isSafeInteger(resultPageSize) ||
        typeof resultTotal !== "number" || !Number.isSafeInteger(resultTotal)
      ) {
        throw new Error(result.message ?? "Unable to load inventory history.");
      }
      if (requestId !== historyRequestId.current) return;
      setMovements(result.movements);
      setHistoryPage(resultPage);
      setHistoryPageSize(resultPageSize);
      setHistoryTotal(resultTotal);
    } finally {
      if (requestId === historyRequestId.current) setHistoryBusy(false);
    }
  }

  async function refreshInventory() {
    await Promise.all([refreshProducts(), loadHistory(historyPage, historyProductId)]);
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productId || !canAdjust || selected?.stockQuantity === null) return;
    setActionBusy("adjustment");
    setNotice(null);
    setError(null);
    try {
      const request = { movementType, quantity, count, reason };
      const idempotencyKey = await getSessionRetryToken(INVENTORY_ADJUSTMENT_RETRY_SCOPE, { productId, ...request });
      const response = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/inventory`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...request, idempotencyKey }),
      });
      const result = await response.json() as { message?: string; duplicate?: boolean };
      if (!response.ok) throw new Error(result.message ?? "Unable to adjust stock.");
      clearSessionRetryToken(INVENTORY_ADJUSTMENT_RETRY_SCOPE, idempotencyKey);
      await refreshInventory();
      setQuantity("");
      setCount("");
      setReason("");
      setNotice(result.duplicate ? "This inventory movement had already been recorded." : "Inventory movement recorded in the append-only history.");
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : "Unable to adjust stock.");
    } finally {
      setActionBusy(null);
    }
  }

  async function submitInitialStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productId || !canAdjust || selected?.status !== "draft" || selected.stockQuantity !== null) return;
    setActionBusy("initial-stock");
    setNotice(null);
    setError(null);
    try {
      const request = { initialStock };
      const idempotencyKey = await getSessionRetryToken(INITIAL_STOCK_RETRY_SCOPE, { productId, ...request });
      const response = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/inventory`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...request, idempotencyKey }),
      });
      const result = await response.json() as { message?: string; duplicate?: boolean };
      if (!response.ok) throw new Error(result.message ?? "Unable to set initial stock.");
      clearSessionRetryToken(INITIAL_STOCK_RETRY_SCOPE, idempotencyKey);
      await refreshInventory();
      setInitialStock("");
      setNotice(result.duplicate ? "This initial-stock action had already been recorded." : "Initial stock has been set. Later changes must use an inventory movement.");
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : "Unable to set initial stock.");
    } finally {
      setActionBusy(null);
    }
  }

  async function submitCustomerReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReturn || !selectedReturnOrder || !selectedReturnItem) return;
    setActionBusy("return");
    setNotice(null);
    setError(null);
    try {
      const request = {
        productId: selectedReturnItem.productId,
        quantity: Number(returnQuantity),
        restock: returnRestock,
        reason: returnReason,
      };
      const idempotencyKey = await getSessionRetryToken(CUSTOMER_RETURN_RETRY_SCOPE, { orderId: selectedReturnOrder.id, ...request });
      const response = await fetch(`/api/admin/product-orders/${encodeURIComponent(selectedReturnOrder.id)}/returns`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...request, idempotencyKey }),
      });
      const result = await response.json() as { message?: string; duplicate?: boolean };
      if (!response.ok) throw new Error(result.message ?? "Unable to record the customer return.");
      clearSessionRetryToken(CUSTOMER_RETURN_RETRY_SCOPE, idempotencyKey);
      await refreshInventory();
      setReturnQuantity("1");
      setReturnRestock(false);
      setReturnReason("");
      setNotice(result.duplicate ? "This customer return had already been recorded." : "Customer return recorded. Stock changed only when it was marked suitable for restocking.");
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : "Unable to record the customer return.");
    } finally {
      setActionBusy(null);
    }
  }

  function changeHistoryScope(nextProductId: string) {
    setHistoryProductId(nextProductId);
    setError(null);
    void loadHistory(1, nextProductId).catch((reasonValue: unknown) => {
      setError(reasonValue instanceof Error ? reasonValue.message : "Unable to load inventory history.");
    });
  }

  function changeReturnOrder(nextOrderId: string) {
    setReturnOrderId(nextOrderId);
    const nextOrder = initialCompletedOrders.find((order) => order.id === nextOrderId);
    setReturnProductId(nextOrder?.items[0]?.productId ?? "");
    setReturnQuantity("1");
  }

  return <main className={styles.shell}>
    <nav className={styles.nav} aria-label="Product administration"><Link href="/admin">Dashboard</Link><Link href="/admin/products">Products</Link><Link href="/admin/product-orders">Product orders</Link></nav>
    <section className={styles.intro}><p className="section-kicker">Stock management</p><h1>INVENTORY</h1><p>Every addition, loss, sale, correction, cancellation restoration, and return is recorded permanently with before and after stock.</p></section>
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    {error ? <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p> : null}
    <div className={styles.split}>
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>Stock history</h2><span>{historyTotal} total movements</span></div>
        <form className={styles.filters} onSubmit={(event) => event.preventDefault()}>
          <label>History scope<select value={historyProductId} onChange={(event) => changeHistoryScope(event.target.value)} disabled={historyBusy}><option value="">All products</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
          <span>{historyProductId ? "This product only" : "All products"}</span>
          <span>{historyBusy ? "Loading history…" : `Page ${historyPage} of ${historyPages}`}</span>
        </form>
        <div className={styles.movementTable}>{movements.length ? movements.map((movement) => <article className={styles.movement} key={movement.id}><div><strong>{movement.productName}</strong><small>{movement.productSku ?? "SKU pending"} · {movement.movementType.replaceAll("_", " ")}</small><small>{formatDate(movement.createdAt)} · {movement.adminName ?? "System"}</small></div><div><small>Previous</small><strong>{movement.previousStock}</strong></div><div><small>Change</small><strong className={movement.stockChange >= 0 ? styles.positive : styles.negative}>{movement.stockChange >= 0 ? "+" : ""}{movement.stockChange}</strong></div><div><small>Result</small><strong>{movement.resultingStock}</strong></div><div><small>{movement.relatedOrderReference ? `Order ${movement.relatedOrderReference}` : "Manual inventory"}</small><strong>{movement.reason}</strong></div></article>) : <p className={styles.panel}>No inventory movements match this history scope yet.</p>}</div>
        <div className={styles.nav} style={{ marginTop: 16 }}><button className={styles.secondary} type="button" disabled={historyBusy || historyPage <= 1} onClick={() => void loadHistory(historyPage - 1).catch((reasonValue: unknown) => setError(reasonValue instanceof Error ? reasonValue.message : "Unable to load inventory history."))}>Previous</button><span>Page {historyPage} of {historyPages}</span><button className={styles.secondary} type="button" disabled={historyBusy || historyPage >= historyPages} onClick={() => void loadHistory(historyPage + 1).catch((reasonValue: unknown) => setError(reasonValue instanceof Error ? reasonValue.message : "Unable to load inventory history."))}>Next</button></div>
      </section>
      <aside>
        <section className={styles.panel}><h2>Alerts</h2><p><strong>{lowStock.length}</strong> low-stock products</p>{lowStock.map((product) => <p key={product.id}>{product.name}: {product.stockQuantity} remaining</p>)}<p><strong>{outStock.length}</strong> out-of-stock products</p>{outStock.map((product) => <p key={product.id}>{product.name}</p>)}</section>
        {canAdjust ? <section className={styles.panel}>
          <h2>{selectedDraftWithoutStock ? "Set initial stock" : "Record inventory movement"}</h2>
          <label className={styles.full}>Product<select value={productId} onChange={(event) => setProductId(event.target.value)} required>{products.map((product) => <option value={product.id} key={product.id}>{product.name} — {product.stockQuantity ?? "stock pending"}</option>)}</select></label>
          {selectedDraftWithoutStock ? <form className={styles.form} onSubmit={submitInitialStock}>
            <p className={styles.full}>This draft has no stock quantity yet. Set its starting count once; future changes use the permanent movement history.</p>
            <label>Initial stock<input type="number" min="0" max="100000" value={initialStock} onChange={(event) => setInitialStock(event.target.value)} required /></label>
            <div className={styles.full}><button className={styles.primary} type="submit" disabled={actionBusy !== null || !productId}>{actionBusy === "initial-stock" ? "Setting stock…" : "Set initial stock"}</button></div>
          </form> : selected?.stockQuantity === null ? <p>This product has no usable stock quantity. Initial stock can only be set while it is a draft.</p> : selected ? <form className={styles.form} onSubmit={submitAdjustment}>
            <label>Movement<select value={movementType} onChange={(event) => setMovementType(event.target.value as typeof movementType)}><option value="restock">Restock</option><option value="damaged">Damaged stock</option><option value="missing">Missing stock</option><option value="count_correction">Counted-stock correction</option></select></label>
            {movementType === "count_correction" ? <label>Counted stock<input type="number" min="0" value={count} onChange={(event) => setCount(event.target.value)} required /></label> : <label>Quantity<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>}
            <label className={styles.full}>Reason or note<textarea minLength={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} required placeholder={movementType === "count_correction" ? "Why the physical count differs" : "Reason for this stock movement"} /></label>
            <p className={styles.full}>Current stock: <strong>{selected.stockQuantity}</strong></p>
            <div className={styles.full}><button className={styles.primary} type="submit" disabled={actionBusy !== null || !productId}>{actionBusy === "adjustment" ? "Recording…" : "Record movement"}</button></div>
          </form> : <p>Select a product to record an inventory movement.</p>}
        </section> : null}
      </aside>
    </div>
    {canReturn ? <section className={styles.panel}><div className={styles.panelHead}><h2>Customer returns</h2><span>Completed product orders only</span></div>{initialCompletedOrders.length ? <form className={styles.form} onSubmit={submitCustomerReturn}><label className={styles.full}>Completed order<select value={returnOrderId} onChange={(event) => changeReturnOrder(event.target.value)} disabled={actionBusy !== null}>{initialCompletedOrders.map((order) => <option key={order.id} value={order.id}>{order.publicReference} — {order.customerName ?? "Walk-in customer"}</option>)}</select></label>{selectedReturnOrder ? <p className={styles.full}>{selectedReturnOrder.customerPhone ?? "No phone recorded"} · {selectedReturnOrder.items.map((item) => `${item.productName} × ${item.quantity}`).join(", ")}</p> : null}<label>Returned product<select value={returnProductId} onChange={(event) => { setReturnProductId(event.target.value); setReturnQuantity("1"); }} disabled={actionBusy !== null}>{selectedReturnOrder?.items.map((item) => <option value={item.productId} key={item.id}>{item.productName} — sold quantity {item.quantity}</option>)}</select></label><label>Return quantity<input type="number" min="1" max={selectedReturnItem?.quantity ?? 1} value={returnQuantity} onChange={(event) => setReturnQuantity(event.target.value)} required disabled={actionBusy !== null || !selectedReturnItem} /></label><label className={styles.check}><input type="checkbox" checked={returnRestock} onChange={(event) => setReturnRestock(event.target.checked)} disabled={actionBusy !== null} />Suitable for restocking</label><label className={styles.full}>Return reason<textarea minLength={3} maxLength={500} value={returnReason} onChange={(event) => setReturnReason(event.target.value)} required disabled={actionBusy !== null} /></label><p className={styles.full}>Only mark an item for restocking when it is suitable to sell again. Non-restockable returns remain permanently recorded without increasing stock.</p><div className={styles.full}><button className={styles.secondary} type="submit" disabled={actionBusy !== null || !selectedReturnItem}>{actionBusy === "return" ? "Recording return…" : "Record customer return"}</button></div></form> : <p>No completed product orders are currently available for customer returns.</p>}</section> : null}
  </main>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(new Date(value));
}
