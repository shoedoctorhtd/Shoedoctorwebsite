"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./ProductShop.module.css";

const MAX_RECEIPT_BYTES = 3 * 1024 * 1024;
const paymentTokenKey = (reference: string) => `shoe-doctor-product-payment-token-v1:${reference}`;

type PaymentItem = {
  productName: string;
  sku: string;
  quantity: number;
  lineTotalNpr: number;
};

type PaymentOrder = {
  publicReference: string;
  customerName: string | null;
  fulfillmentMethod: "delivery" | "collection";
  deliveryAddress: string | null;
  total: number;
  paymentAmount: number;
  paymentMethod: "qr" | "cod" | null;
  paymentStatus: string;
  status: string;
  items: PaymentItem[];
  receipt: PaymentReceipt | null;
  canUploadReceipt: boolean;
};

type PaymentReceipt = {
  originalDisplayFilename: string;
  contentType: string;
  byteSize: number;
  emailDeliveryStatus: string;
  submittedAt: string | null;
};

type PaymentResponse = { order?: PaymentOrder; receipt?: PaymentReceipt | null; message?: string };

export default function ProductPaymentPage({ reference }: { reference: string }) {
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPayment = useCallback(async (token: string) => {
    const response = await fetch(`/api/orders/${encodeURIComponent(reference)}/payment`, {
      headers: { "x-payment-access-token": token },
      cache: "no-store",
    });
    const result = await response.json() as PaymentResponse;
    if (!response.ok || !result.order) throw new Error(result.message ?? "This secure payment page is unavailable.");
    setOrder(result.order);
    setReceipt(result.order.receipt ?? result.receipt ?? null);
  }, [reference]);

  useEffect(() => {
    const token = window.sessionStorage.getItem(paymentTokenKey(reference));
    const timer = window.setTimeout(() => {
      if (!token) {
        setError("This secure payment page must be opened from the QR checkout in the same browser.");
        return;
      }
      setAccessToken(token);
      void loadPayment(token).catch((reason) => {
        setError(reason instanceof Error ? reason.message : "This secure payment page is unavailable.");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPayment, reference]);

  async function selectReceipt(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setError(null);
    if (nextFile && nextFile.size > MAX_RECEIPT_BYTES) {
      event.target.value = "";
      setFile(null);
      setIdempotencyKey(null);
      setError("Payment receipts must be 3 MB or smaller.");
      return;
    }
    const preparedFile = nextFile ? await compressReceiptImage(nextFile) : null;
    if (nextFile && preparedFile !== nextFile) setNotice("Large image compressed in this browser before upload.");
    setFile(preparedFile);
    setIdempotencyKey(preparedFile ? crypto.randomUUID() : null);
  }

  async function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !file || !order) return;
    if (file.size > MAX_RECEIPT_BYTES) {
      setError("Payment receipts must be 3 MB or smaller.");
      return;
    }
    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const body = new FormData();
      body.set("receipt", file);
      body.set("transactionReference", transactionReference);
      body.set("idempotencyKey", key);
      const response = await fetch(`/api/orders/${encodeURIComponent(reference)}/payment`, {
        method: "POST",
        headers: { "x-payment-access-token": accessToken },
        body,
      });
      const result = await response.json() as PaymentResponse;
      if (!response.ok || !result.order) throw new Error(result.message ?? "We could not send your receipt to Shoe Doctor. Please try uploading it again.");
      setOrder(result.order);
      setReceipt(result.order.receipt ?? result.receipt ?? null);
      setNotice("Payment receipt submitted. Shoe Doctor will verify your payment.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not send your receipt to Shoe Doctor. Please try uploading it again.");
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return <section className={styles.paymentLoading} aria-live="polite"><p className="sd-kicker">Secure payment</p><h1>VERIFYING PAYMENT ACCESS.</h1><p>{error ?? "Opening your secure QR payment page…"}</p>{error ? <Link className="sd-primary-button" href="/checkout">Return to checkout</Link> : null}</section>;
  }

  const canUpload = order.canUploadReceipt;
  const payableAmount = Number.isSafeInteger(order.paymentAmount) ? order.paymentAmount : order.total;
  return <section className={styles.paymentPage}>
    <div className={styles.paymentIntro}>
      <p className="sd-kicker">Shoe Doctor shop</p>
      <h1>PAY BY QR.</h1>
      <p>Complete this payment only for your saved Shoe Doctor product order.</p>
    </div>
    <div className={styles.paymentGrid}>
      <section className={styles.paymentCard}>
        <div className={styles.paymentReference}><span>Order reference</span><strong>{order.publicReference}</strong></div>
        <p className={styles.paymentAmount}><span>Exact payable amount</span><strong>{formatNpr(payableAmount)}</strong></p>
        <div className={styles.qrPanel}>
          <img src="/payment/shoe-doctor-fonepay-qr.png" alt="Official Shoe Doctor Fonepay payment QR" />
          <a className={styles.qrDownload} href="/payment/shoe-doctor-fonepay-qr.png" download="shoe-doctor-fonepay-qr.png">Download QR</a>
        </div>
        <ol className={styles.paymentInstructions}>
          <li>Scan or download the QR.</li>
          <li>Pay the exact displayed amount.</li>
          <li>Take a screenshot or save the payment receipt.</li>
          <li>Upload the receipt below and wait for Shoe Doctor to verify it.</li>
        </ol>
        <p className={styles.paymentWarning}>Uploading a receipt does not automatically confirm payment. Shoe Doctor will verify it first.</p>
      </section>
      <aside className={styles.paymentSummary}>
        <p><span>Payment status</span><strong>{label(order.paymentStatus)}</strong></p>
        <p><span>Order status</span><strong>{label(order.status)}</strong></p>
        <p><span>Fulfilment</span><strong>{order.fulfillmentMethod === "delivery" ? "Delivery" : "Shop collection"}</strong></p>
        {order.deliveryAddress ? <p><span>Delivery address</span><strong>{order.deliveryAddress}</strong></p> : null}
        <h2>Order summary</h2>
        <ul>{order.items.map((item, index) => <li key={`${item.sku}-${index}`}><span>{item.productName} <small>({item.sku}) x {item.quantity}</small></span><strong>{formatNpr(item.lineTotalNpr)}</strong></li>)}</ul>
        <p className={styles.paymentSummaryTotal}><span>Total</span><strong>{formatNpr(order.total)}</strong></p>
      </aside>
    </div>
    <section className={styles.receiptPanel}>
      <div><p className="sd-kicker">Payment receipt</p><h2>SUBMIT FOR VERIFICATION.</h2><p>Your file is sent directly to Shoe Doctor by email. It is not stored on this website.</p></div>
      {receipt ? <p className={styles.receiptMeta}><strong>{receipt.originalDisplayFilename}</strong><br />Email delivery: {label(receipt.emailDeliveryStatus)}{receipt.submittedAt ? ` · ${formatDate(receipt.submittedAt)}` : ""}</p> : null}
      {notice ? <p className={styles.formNotice} role="status">{notice}</p> : null}
      {error ? <p className={`${styles.formNotice} ${styles.formError}`} role="alert">{error}</p> : null}
      {canUpload ? <form className={styles.receiptForm} onSubmit={submitReceipt}>
        <label>Payment receipt<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { void selectReceipt(event); }} required /></label>
        <label>Transaction/reference number <small>(optional)</small><input value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} maxLength={160} /></label>
        <p>JPEG, PNG, WebP, or PDF only. Maximum file size: 3 MB.</p>
        <button className={styles.checkoutButton} type="submit" disabled={busy || !file}>{busy ? "Submitting receipt..." : "Submit Payment Receipt"}</button>
      </form> : <p className={styles.paymentClosed}>{order.status === "cancelled" ? "This order has been cancelled, so receipt uploads are closed." : order.paymentStatus === "paid" ? "Payment has been approved. No further receipt upload is needed." : "A receipt is already being reviewed by Shoe Doctor."}</p>}
    </section>
  </section>;
}

async function compressReceiptImage(file: File) {
  if (!file.type.startsWith("image/") || file.size <= 2 * 1024 * 1024 || typeof createImageBitmap !== "function") return file;
  try {
    const image = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob || blob.size >= file.size || blob.size > MAX_RECEIPT_BYTES) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/u, "") || "payment-receipt"}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function formatNpr(value: number) {
  return `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(value)}`;
}

function label(value: string) {
  return value.replace(/_/gu, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(date);
}
