"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductCard } from "@/lib/product-types";
import { useProductCart } from "./ProductCart";
import { formatNpr } from "@/lib/money";
import { clearSessionRetryToken, getSessionRetryToken } from "./ProductRetryToken";
import styles from "./ProductShop.module.css";

const CHECKOUT_RETRY_SCOPE = "online-checkout";
const CHECKOUT_PAYMENT_TOKEN_KEY = "shoe-doctor-product-payment-token-v1:online-checkout";
const paymentTokenKey = (reference: string) => `shoe-doctor-product-payment-token-v1:${reference}`;

function generatePaymentAccessToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
}

function checkoutPaymentAccessToken() {
  const existing = window.sessionStorage.getItem(CHECKOUT_PAYMENT_TOKEN_KEY);
  if (existing && /^[A-Za-z0-9_-]{43}$/u.test(existing)) return existing;
  const token = generatePaymentAccessToken();
  window.sessionStorage.setItem(CHECKOUT_PAYMENT_TOKEN_KEY, token);
  return token;
}

export default function ProductCheckoutForm({ products }: { products: ProductCard[] }) {
  const { lines, hydrated, clear } = useProductCart();
  const router = useRouter();
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"collection" | "delivery">("collection");
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "cod" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const productsBySlug = useMemo(() => new Map(products.filter((product) => product.slug).map((product) => [product.slug!, product])), [products]);
  const activeLines = lines.map((line) => ({ line, product: productsBySlug.get(line.productSlug) ?? null }));
  const stockProblem = activeLines.some(({ line, product }) => !product || product.stockQuantity === null || product.stockQuantity < line.quantity);
  const subtotal = activeLines.reduce((sum, { line, product }) => sum + (product?.priceNpr ?? 0) * line.quantity, 0);

  useEffect(() => {
    if (paymentMethod !== "qr") window.sessionStorage.removeItem(CHECKOUT_PAYMENT_TOKEN_KEY);
  }, [paymentMethod]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stockProblem || !lines.length || !paymentMethod) {
      if (!paymentMethod) setMessage("Choose QR Online Payment or Cash on Delivery to continue.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    try {
      const request = {
        customerName: String(form.get("customerName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        fulfillmentMethod,
        deliveryAddress: fulfillmentMethod === "delivery" ? String(form.get("deliveryAddress") ?? "") : null,
        customerNote: String(form.get("customerNote") ?? ""),
        paymentMethod,
        paymentAccessToken: paymentMethod === "qr" ? checkoutPaymentAccessToken() : undefined,
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
      if (paymentMethod === "qr") {
        const token = request.paymentAccessToken;
        if (!token) throw new Error("Unable to prepare secure payment access. Please try again.");
        window.sessionStorage.setItem(paymentTokenKey(result.order.publicReference), token);
        window.sessionStorage.removeItem(CHECKOUT_PAYMENT_TOKEN_KEY);
        router.push(`/orders/${encodeURIComponent(result.order.publicReference)}/payment`);
      } else {
        router.push(`/order-confirmation?reference=${encodeURIComponent(result.order.publicReference)}&payment=cod`);
      }
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
        <h2 className={styles.checkoutSectionTitle}>Your details</h2>
        <label>Full name<input required minLength={2} maxLength={120} name="customerName" autoComplete="name" /></label>
        <label>Phone number<input required minLength={7} maxLength={32} name="phone" inputMode="tel" autoComplete="tel" /></label>
        <label className={styles.full}>Email <small>(optional — for your confirmation)</small><input maxLength={160} name="email" type="email" autoComplete="email" /></label>
        <h2 className={`${styles.checkoutSectionTitle} ${styles.full}`}>Collection or delivery</h2>
        <label className={styles.full}>Fulfilment method<select name="fulfillmentMethod" value={fulfillmentMethod} onChange={(event) => setFulfillmentMethod(event.target.value as "collection" | "delivery")}><option value="collection">Shop collection</option><option value="delivery">Delivery</option></select></label>
        {fulfillmentMethod === "delivery" ? <label className={styles.full}>Delivery address<textarea required maxLength={500} name="deliveryAddress" /></label> : null}
        <p className={`${styles.formNotice} ${styles.full}`}>Delivery availability, timing and any charge are confirmed for your order before fulfilment.</p>
        <label className={styles.full}>Order note <small>(optional)</small><textarea maxLength={1000} name="customerNote" placeholder="Anything Shoe Doctor should know?" /></label>
        <h2 className={`${styles.checkoutSectionTitle} ${styles.full}`}>Payment</h2>
        <fieldset className={`${styles.paymentChoices} ${styles.full}`}>
          <legend>Payment method</legend>
          <label className={paymentMethod === "qr" ? styles.paymentChoiceSelected : ""}>
            <input type="radio" name="paymentMethod" value="qr" checked={paymentMethod === "qr"} onChange={() => setPaymentMethod("qr")} required />
            <span><strong>Online Payment - Scan QR</strong><small>Place your order first, then scan Shoe Doctor&apos;s official Fonepay QR and submit your receipt for verification.</small></span>
          </label>
          <label className={paymentMethod === "cod" ? styles.paymentChoiceSelected : ""}>
            <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} required />
            <span><strong>Cash on Delivery (COD)</strong><small>Pay the final order amount when Shoe Doctor delivers your order or when you collect it.</small></span>
          </label>
        </fieldset>
        <p className={styles.formNotice}>{paymentMethod === "qr" ? "After your order is saved, you will be taken to the secure QR payment page." : paymentMethod === "cod" ? `Cash will be collected during ${fulfillmentMethod === "delivery" ? "delivery" : "collection"}.` : "Choose a payment method before placing your order."}</p>
        {message ? <p className={`${styles.formNotice} ${styles.formError}`} role="alert">{message}</p> : null}
        <button className={styles.checkoutButton} type="submit" disabled={busy || stockProblem}>{busy ? "Placing order…" : stockProblem ? "Resolve stock changes" : "Place order"}</button>
      </form>
      <aside className={styles.summary}>
        <h2>Your order</h2>
        {activeLines.map(({ line, product }) => <p key={line.productSlug}><span>{product?.name ?? "Unavailable"} × {line.quantity}</span><span>{formatNpr((product?.priceNpr ?? 0) * line.quantity)}</span></p>)}
        <p><span>Delivery</span><span>Confirmed before fulfilment</span></p>
        <strong><span>Current total</span><span>{formatNpr(subtotal)}</span></strong>
      </aside>
    </div>
  );
}
