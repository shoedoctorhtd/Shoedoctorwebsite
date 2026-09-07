"use client";

import { useState } from "react";
import Link from "next/link";
import { useProductCart } from "./ProductCart";
import QuantitySelector from "./QuantitySelector";
import styles from "./ProductShop.module.css";

export default function ProductDetailPurchase({ productSlug, stockQuantity }: { productSlug: string; stockQuantity: number | null }) {
  const { add } = useProductCart();
  const available = Math.max(0, stockQuantity ?? 0);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  if (!available) return <button className={styles.checkoutButton} type="button" disabled>Out of Stock</button>;
  return (
    <div className={styles.purchasePanel}>
      <QuantitySelector label="Quantity" maximum={available} onChange={setQuantity} quantity={quantity} />
      <div className={styles.purchaseActions}>
        <Link className={styles.buyNowButton} href={`/checkout?mode=buy-now&product=${encodeURIComponent(productSlug)}&quantity=${quantity}`}>Buy Now</Link>
        <button className={styles.addToCartButton} type="button" onClick={() => {
          add(productSlug, quantity, available);
          setNotice(`${quantity} ${quantity === 1 ? "item" : "items"} added to cart.`);
          window.setTimeout(() => setNotice(""), 1800);
        }}>
          {notice ? "Added to Cart" : "Add to Cart"}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">{notice}</span>
    </div>
  );
}
