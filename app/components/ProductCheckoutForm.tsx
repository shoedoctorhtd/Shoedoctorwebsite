"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductCard } from "@/lib/product-types";
import { useProductCart } from "./ProductCart";
import { formatNpr } from "./ProductCatalogue";
import { clearSessionRetryToken, getSessionRetryToken } from "./ProductRetryToken";
import styles from "./ProductShop.module.css";

const CHECKOUT_RETRY_SCOPE = "online-checkout";

export default function ProductCheckoutForm({ products }: { products: ProductCard[] }) {
  const { lines, hydrated, clear } = useProductCart();
  const router = useRouter();
  const [method, setMethod] = useState<"collection" | "delivery">("collection");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const productsBySlug = useMemo(() => new Map(products.filter((product) => product.slug).map((product) => [product.slug!, product])), [products]);
  const activeLines = lines.map((line) => ({ line, product: productsBySlug.get(line.productSlug) ?? null }));
  const stockProblem = activeLines.some(({ line, product }) => !product || product.stockQuantity === null || product.stockQuantity < line.quantity);
  const subtotal = activeLines.reduce((sum, { line, product }) => sum + (product?.priceNpr ?? 0) * line.quantity, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stockProblem || !lines.length) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    try {
      const request = {
        customerName: String(form.get("customerName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        fulfillmentMethod: method,
        deliveryAddress: method === "delivery" ? String(form.get("deliveryAddress") ?? "") : null,
        customerNote: String(form.get("customerNote") ?? ""),
        items: lines.map((line) => ({ productSlug: line.productSlug, quantity: line.quantity })),
      };
      const idempotencyToken = await getSessionRetryToken(CHECKOUT_RETRY_SCOPE, request);
      const response = await fetch("/api/product-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyToken,
          ...request,
        }),
      });
      const result = await response.json() as { order?: { publicReference?: string }; message?: string };
      if (!response.ok || !result.order?.publicReference) {
        throw new Error(result.message ?? "Unable to place your order.");
      }
      clearSessionRetryToken(CHECKOUT_RETRY_SCOPE, idempotencyToken);
      clear();
      router.push(`/order-confirmation?reference=${encodeURIComponent(result.order.publicReference)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to place your order.");
      // Preserve the hashed request's token for a deliberate retry. If the
      // server committed before a network failure, it returns the same order.
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) return <p>Loading checkout…</p>;
  if (!lines.length) return <section className={styles.empty}><p className="sd-kicker">Checkout</p><h2>Your cart is empty.</h2><Link className="sd-primary-button" href="/products">Browse products</Link></section>;
  return (
    <div className={styles.checkoutGrid}>
      <form className={styles.form} onSubmit={submit}>
        <label>Full name<input required minLength={2} maxLength={120} name="customerName" autoComplete="name" /></label>
        <label>Phone number<input required minLength={7} maxLength={32} name="phone" inputMode="tel" autoComplete="tel" /></label>
        <label className={styles.full}>Email <small>(optional — for your confirmation)</small><input maxLength={160} name="email" type="email" autoComplete="email" /></label>
        <label className={styles.full}>Fulfilment method<select name="fulfillmentMethod" value={method} onChange={(event) => setMethod(event.target.value as "collection" | "delivery")}><option value="collection">Shop collection</option><option value="delivery">Delivery</option></select></label>
        {method === "delivery" ? <label className={styles.full}>Delivery address<textarea required maxLength={500} name="deliveryAddress" /></label> : null}
        <label className={styles.full}>Order note <small>(optional)</small><textarea maxLength={1000} name="customerNote" placeholder="Anything Shoe Doctor should know?" /></label>
        <p className={styles.formNotice}>Payment is pending. Shoe Doctor will confirm payment and {method === "delivery" ? "delivery" : "collection"} with you after your order is received.</p>
        {message ? <p className={`${styles.formNotice} ${styles.formError}`} role="alert">{message}</p> : null}
        <button className={styles.checkoutButton} type="submit" disabled={busy || stockProblem}>{busy ? "Placing order…" : stockProblem ? "Resolve stock changes" : "Place order"}</button>
      </form>
      <aside className={styles.summary}>
        <h2>Your order</h2>
        {activeLines.map(({ line, product }) => <p key={line.productSlug}><span>{product?.name ?? "Unavailable"} × {line.quantity}</span><span>{formatNpr((product?.priceNpr ?? 0) * line.quantity)}</span></p>)}
        <strong><span>Estimated total</span><span>{formatNpr(subtotal)}</span></strong>
      </aside>
    </div>
  );
}
