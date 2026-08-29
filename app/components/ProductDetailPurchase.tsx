"use client";

import { useState } from "react";
import { useProductCart } from "./ProductCart";
import styles from "./ProductShop.module.css";

export default function ProductDetailPurchase({ productSlug, stockQuantity }: { productSlug: string; stockQuantity: number | null }) {
  const { add } = useProductCart();
  const available = Math.max(0, stockQuantity ?? 0);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  if (!available) return <button className={styles.checkoutButton} type="button" disabled>Out of Stock</button>;
  return (
    <div className={styles.purchaseRow}>
      <div className={styles.quantityControl} aria-label="Quantity selector">
        <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity">−</button>
        <span aria-live="polite">{quantity}</span>
        <button type="button" onClick={() => setQuantity((value) => Math.min(available, value + 1))} aria-label="Increase quantity" disabled={quantity >= available}>+</button>
      </div>
      <button className={styles.checkoutButton} type="button" onClick={() => {
        add(productSlug, quantity, available);
        setNotice(`${quantity} ${quantity === 1 ? "item" : "items"} added to cart.`);
      }}>
        Add to Cart
      </button>
      <span className="sr-only" aria-live="polite">{notice}</span>
    </div>
  );
}
