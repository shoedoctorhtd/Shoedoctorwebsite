"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AdminModuleNav, AdminLink as Link } from "./AdminAccessProvider";
import type { CounterHistory, CounterInventory } from "@/lib/counter-sales";
import type { Product, ProductOrder } from "@/lib/product-types";
import { clearSessionRetryToken, getSessionRetryToken } from "./ProductRetryToken";
import styles from "./ProductAdmin.module.css";
import counter from "./CounterInventory.module.css";

type Line = { product: Product; quantity: number };
const money = (value: number) => `Rs ${value.toLocaleString("en-NP")}`;
export const counterDate = (value: string) => new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(new Date(value));

export default function CounterInventoryDashboard({ initialInventory, initialHistory, canRecord }: {
  initialInventory: CounterInventory; initialHistory: CounterHistory | null; canRecord: boolean;
}) {
  const [inventory, setInventory] = useState(initialInventory);
  const [history, setHistory] = useState(initialHistory);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Line[]>([]);
  const [confirmation, setConfirmation] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const latestRequest = useRef(0);
  const total = lines.reduce((sum, line) => sum + line.quantity * (line.product.priceNpr ?? 0), 0);
  const confirmationTotal = confirmation.reduce((sum, line) => sum + line.quantity * (line.product.priceNpr ?? 0), 0);

  const loadInventory = useCallback(async (query: string, page: number) => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/counter-inventory?${new URLSearchParams({ search: query, page: String(page) })}`, { cache: "no-store" });
      const data = await response.json() as CounterInventory & { message?: string };
      if (!response.ok || !data.products) throw new Error(data.message ?? "Unable to refresh counter inventory.");
      if (requestId === latestRequest.current) { setInventory(data); setActiveSearch(query); }
    } finally { if (requestId === latestRequest.current) setLoading(false); }
  }, []);

  const loadHistory = useCallback(async (page: number) => {
    const response = await fetch(`/api/admin/counter-inventory/history?page=${page}`, { cache: "no-store" });
    const data = await response.json() as CounterHistory & { message?: string };
    if (!response.ok || !data.orders) throw new Error(data.message ?? "Unable to load counter sales history.");
    setHistory(data);
  }, []);

  useEffect(() => {
    const refresh = () => { if (!busy && !document.hidden) void loadInventory(activeSearch, inventory.page).catch(() => undefined); };
    window.addEventListener("focus", refresh);
    const interval = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(interval); };
  }, [activeSearch, busy, inventory.page, loadInventory]);

  useEffect(() => {
    if (confirmation.length) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirmation]);

  function selectedLine(product: Product): Line | null {
    const quantity = Number(quantities[product.id] ?? "1");
    return product.slug && product.priceNpr && product.stockQuantity !== null
      && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= Math.min(100, product.stockQuantity)
      ? { product, quantity } : null;
  }

  function addLine(line: Line) {
    setError("");
    setLines((current) => [...current.filter((item) => item.product.id !== line.product.id), line]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!confirmation.length || busy || !canRecord) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const request = {
        items: confirmation.map((line) => ({ productSlug: line.product.slug!, quantity: line.quantity })).sort((a, b) => a.productSlug.localeCompare(b.productSlug)),
        expectedPrices: Object.fromEntries(confirmation.map((line) => [line.product.slug!, line.product.priceNpr!])),
      };
      const token = await getSessionRetryToken("counter-sale", request);
      const response = await fetch("/api/admin/counter-inventory", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...request, idempotencyToken: token }) });
      const data = await response.json() as { order?: ProductOrder; message?: string; duplicate?: boolean };
      if (!response.ok || !data.order) throw new Error(data.message ?? "Unable to record counter sale.");
      clearSessionRetryToken("counter-sale", token);
      const soldIds = new Set(confirmation.map((line) => line.product.id));
      setLines((current) => current.filter((line) => !soldIds.has(line.product.id)));
      setConfirmation([]);
      setNotice(`${data.order.publicReference} ${data.duplicate ? "was already recorded" : "recorded"} — ${money(data.order.total)}. Inventory updated.`);
      // Refresh failure cannot turn a committed sale into a failed submission.
      const refresh = await Promise.allSettled([loadInventory(activeSearch, inventory.page), ...(history ? [loadHistory(1)] : [])]);
      if (refresh.some((result) => result.status === "rejected")) setError("Sale saved. Use Refresh to reload the latest inventory and history.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to record counter sale.");
    } finally { setBusy(false); }
  }

  function refresh(query = activeSearch, page = inventory.page) {
    setError("");
    void loadInventory(query, page).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to refresh."));
  }

  return <main id="main-content" className={`${styles.shell} ${counter.shell}`}>
    <AdminModuleNav activeHref="/admin/counter-inventory" />
    <header className={counter.header}><h1>Counter Product Inventory</h1><p>Record products sold directly from the shop counter.</p></header>
    <div className={counter.summary}>{[["Products In Stock", inventory.summary.inStock], ["Low Stock Products", inventory.summary.lowStock], ["Out of Stock Products", inventory.summary.outOfStock], ["Counter Sales Today", inventory.summary.salesToday]].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {error && !confirmation.length && <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>}
    <div className={counter.workspace}>
      <section aria-label="Counter products">
        <form className={counter.search} onSubmit={(event) => { event.preventDefault(); refresh(search, 1); }}><label htmlFor="counter-search">Search product name or SKU</label><div><input id="counter-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} /><button className={styles.primary} disabled={loading || busy}>Search</button><button className={styles.secondary} type="button" disabled={loading || busy} onClick={() => refresh()}>Refresh</button></div></form>
        <div className={counter.products} aria-busy={loading}>{inventory.products.map((product) => {
          const line = selectedLine(product);
          const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
          return <article className={counter.product} key={product.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {image ? <img src={image.url} alt={image.altText ?? product.name} width={72} height={72} /> : <div className={counter.placeholder}>No image</div>}
            <div><h2>{product.name}</h2><p>SKU: {product.sku ?? "Pending"}</p><p>Available: <strong>{product.stockQuantity ?? "Not set"}</strong> · <strong>{product.priceNpr ? money(product.priceNpr) : "Price not set"}</strong></p></div>
            {canRecord && <div className={counter.controls}><label htmlFor={`qty-${product.id}`}>Quantity to sell</label><div className={counter.quantity}><button type="button" aria-label={`Decrease ${product.name} quantity`} disabled={busy || !canRecord || Number(quantities[product.id] ?? 1) <= 1} onClick={() => setQuantities({ ...quantities, [product.id]: String(Number(quantities[product.id] ?? 1) - 1) })}>−</button><input id={`qty-${product.id}`} type="number" min={1} max={Math.min(100, product.stockQuantity ?? 0)} value={quantities[product.id] ?? "1"} disabled={busy || !canRecord || !product.stockQuantity} onChange={(event) => setQuantities({ ...quantities, [product.id]: event.target.value })} /><button type="button" aria-label={`Increase ${product.name} quantity`} disabled={busy || !canRecord || Number(quantities[product.id] ?? 1) >= Math.min(100, product.stockQuantity ?? 0)} onClick={() => setQuantities({ ...quantities, [product.id]: String(Number(quantities[product.id] ?? 1) + 1) })}>+</button></div><div className={counter.actions}><button className={styles.secondary} disabled={!canRecord || !line || busy || (lines.length >= 20 && !lines.some((item) => item.product.id === product.id))} onClick={() => line && addLine(line)}>Add to sale</button><button className={styles.primary} disabled={!canRecord || !line || busy} onClick={() => { setError(""); if (line) setConfirmation([line]); }}>Record Counter Sale</button></div></div>}
          </article>;
        })}</div>
        {!inventory.products.length && <p className={styles.panel}>No published products match this search.</p>}
        <div className={counter.actions}><button className={styles.secondary} disabled={loading || busy || inventory.page <= 1} onClick={() => refresh(activeSearch, inventory.page - 1)}>Previous</button><span>Page {inventory.page}</span><button className={styles.secondary} disabled={loading || busy || !inventory.hasMore} onClick={() => refresh(activeSearch, inventory.page + 1)}>Next</button></div>
      </section>
      {canRecord && <aside className={`${styles.panel} ${counter.basket}`}><h2>Counter Sale</h2>{lines.length ? lines.map((line) => <div className={counter.line} key={line.product.id}><span>{line.product.name} × {line.quantity}<small>{money(line.product.priceNpr!)} each</small></span><strong>{money(line.quantity * line.product.priceNpr!)}</strong><button className={styles.secondary} disabled={busy} aria-label={`Remove ${line.product.name}`} onClick={() => setLines(lines.filter((item) => item.product.id !== line.product.id))}>Remove</button></div>) : <p>Add products for one counter transaction.</p>}<p className={counter.total}>Total <strong>{money(total)}</strong></p><button className={styles.primary} disabled={!canRecord || !lines.length || busy} onClick={() => { setError(""); setConfirmation([...lines]); }}>Confirm Counter Sale</button>{!canRecord && <p>Your account can view inventory. Recording a sale requires counter-sale permission.</p>}</aside>}
    </div>
    {history && <section className={styles.panel}><h2>Counter Sales History</h2>{history.orders.map((order) => <article key={order.id} className={counter.history}><div><Link href={`/admin/counter-inventory/${order.id}`}><strong>{order.publicReference}</strong></Link><small>{counterDate(order.createdAt)} NPT · {order.recordedBy}</small></div><div>{order.items.map((item) => <p key={item.id}>{item.productName} × {item.quantity} · {money(item.unitPriceNpr)} each</p>)}</div><div><strong>{money(order.total)}</strong><small>{order.status === "cancelled" ? "Reversed" : "Recorded"}</small></div><Link href={`/admin/counter-inventory/${order.id}`}>View details</Link></article>)}{!history.orders.length && <p>No counter sales recorded yet.</p>}<div className={counter.actions}><button className={styles.secondary} disabled={history.page <= 1 || busy} onClick={() => void loadHistory(history.page - 1).catch((reason: Error) => setError(reason.message))}>Previous</button><span>Page {history.page} of {Math.max(1, Math.ceil(history.total / history.pageSize))}</span><button className={styles.secondary} disabled={history.page * history.pageSize >= history.total || busy} onClick={() => void loadHistory(history.page + 1).catch((reason: Error) => setError(reason.message))}>Next</button></div></section>}
    <dialog ref={dialog} className={counter.dialog} aria-labelledby="counter-confirm-title" onCancel={(event) => { if (busy) event.preventDefault(); else setConfirmation([]); }}><form onSubmit={submit}><h2 id="counter-confirm-title">Confirm Counter Sale</h2><p>{confirmation.length === 1 ? `Record counter sale of ${confirmation[0].quantity} × ${confirmation[0].product.name} for ${money(confirmationTotal)}?` : `Record this counter sale for ${money(confirmationTotal)}?`}</p>{confirmation.map((line) => <p key={line.product.id}>{line.product.name} × {line.quantity} — {money(line.quantity * line.product.priceNpr!)}</p>)}{error && <p role="alert" className={`${styles.notice} ${styles.error}`}>{error}</p>}<div className={counter.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={() => setConfirmation([])}>Back</button><button className={styles.primary} disabled={busy || !confirmation.length}>{busy ? "Recording…" : "Confirm Counter Sale"}</button></div></form></dialog>
  </main>;
}
