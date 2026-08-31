"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { ProductCard } from "@/lib/product-types";
import { useProductCart } from "./ProductCart";
import { availabilityCopy, formatNpr } from "./ProductCatalogue";
import styles from "./ProductShop.module.css";

export default function ProductCartPage({ products }: { products: ProductCard[] }) {
  const { lines, hydrated, setQuantity, remove } = useProductCart();
  const productsBySlug = new Map(products.filter((product) => product.slug).map((product) => [product.slug!, product]));
  const linesWithProducts = lines.map((line) => ({ line, product: productsBySlug.get(line.productSlug) ?? null }));
  const subtotal = linesWithProducts.reduce((sum, entry) => sum + (entry.product?.priceNpr ?? 0) * entry.line.quantity, 0);
  if (!hydrated) return <p>Loading your cart…</p>;
  if (!lines.length) {
    return <section className={styles.empty}><p className="sd-kicker">Your cart</p><h2>Your cart is empty.</h2><p>Add Shoe Doctor care essentials from the catalogue when you are ready.</p><Link className="sd-primary-button" href="/products">Browse products</Link></section>;
  }
  return (
    <div className={styles.cartLayout}>
      <section className={styles.cartLines} aria-label="Cart items">
        {linesWithProducts.map(({ line, product }) => {
          const stockChanged = !product || product.stockQuantity === null || line.quantity > product.stockQuantity;
          return (
            <article className={styles.cartLine} key={line.productSlug}>
              {product?.primaryImage ? <img src={product.primaryImage.url} alt={product.primaryImage.altText ?? product.name} /> : <div aria-hidden="true" />}
              <div>
                <h2>{product?.name ?? "This product is no longer available"}</h2>
                <p>{product ? formatNpr(product.priceNpr) : "Remove this item to continue."}</p>
                {stockChanged ? <p className={styles.stockChanged}>Stock changed — {product ? availabilityCopy(product.stockQuantity, product.lowStockThreshold) : "no longer available"}</p> : null}
              </div>
              <aside>
                {product ? <div className={styles.quantityControl} aria-label={`Quantity for ${product.name}`}><button type="button" aria-label={`Decrease ${product.name}`} onClick={() => setQuantity(line.productSlug, line.quantity - 1, product.stockQuantity ?? 0)}>−</button><span>{line.quantity}</span><button type="button" aria-label={`Increase ${product.name}`} disabled={line.quantity >= (product.stockQuantity ?? 0)} onClick={() => setQuantity(line.productSlug, line.quantity + 1, product.stockQuantity ?? 0)}>+</button></div> : null}
                <strong>{formatNpr(product ? (product.priceNpr ?? 0) * line.quantity : 0)}</strong>
                <button className={styles.linkButton} type="button" onClick={() => remove(line.productSlug)}>Remove</button>
              </aside>
            </article>
          );
        })}
      </section>
      <aside className={styles.summary}>
        <h2>Order summary</h2>
        <p><span>Subtotal</span><span>{formatNpr(subtotal)}</span></p>
        <p><span>Delivery</span><span>Confirmed later</span></p>
        <strong><span>Estimated total</span><span>{formatNpr(subtotal)}</span></strong>
        {linesWithProducts.some(({ line, product }) => !product || product.stockQuantity === null || line.quantity > product.stockQuantity) ? <p className={styles.stockChanged}>Resolve stock changes before checkout.</p> : <Link href="/checkout">Continue to checkout</Link>}
      </aside>
    </div>
  );
}
