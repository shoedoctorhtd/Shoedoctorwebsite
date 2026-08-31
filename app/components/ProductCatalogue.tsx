/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { ProductCard } from "@/lib/product-types";
import { AddToCartButton } from "./ProductCart";
import styles from "./ProductShop.module.css";

export default function ProductCatalogue({ products }: { products: ProductCard[] }) {
  if (!products.length) {
    return (
      <section className={styles.empty} aria-labelledby="products-empty-title">
        <p className="sd-kicker">Shoe Doctor shop</p>
        <h2 id="products-empty-title">Care essentials are on their way.</h2>
        <p>We are preparing our product catalogue. Please check back soon, or book professional shoe care today.</p>
        <Link className="sd-primary-button" href="/#book">Book shoe care</Link>
      </section>
    );
  }
  return (
    <div className={styles.grid}>
      {products.map((product) => {
        const unavailable = product.stockQuantity === 0;
        return (
          <article className={styles.card} key={product.slug}>
            {product.primaryImage ? (
              <img className={styles.cardImage} src={product.primaryImage.url} alt={product.primaryImage.altText ?? product.name} />
            ) : null}
            <div className={styles.cardBody}>
              <div className={styles.cardMeta}>
                <h2>{product.name}</h2>
                {unavailable ? <span className={`${styles.tag} ${styles.tagOut}`}>Out of Stock</span> : product.isLowStock ? <span className={styles.tag}>Low Stock</span> : null}
              </div>
              <p className={styles.cardDescription}>{product.shortDescription}</p>
              <strong className={styles.price}>{formatNpr(product.priceNpr)}</strong>
              <p className={`${styles.availability} ${unavailable ? styles.availabilityOut : product.isLowStock ? styles.availabilityLow : ""}`}>
                {availabilityCopy(product.stockQuantity, product.lowStockThreshold)}
              </p>
              <div className={styles.cardActions}>
                <Link href={`/products/${encodeURIComponent(product.slug ?? "")}`}>View Product</Link>
                <AddToCartButton className="" productSlug={product.slug ?? ""} stockQuantity={product.stockQuantity} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function formatNpr(value: number | null) {
  return value === null ? "Price pending" : `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(value)}`;
}

export function availabilityCopy(stockQuantity: number | null, lowStockThreshold: number) {
  if (stockQuantity === null) return "Availability pending";
  if (stockQuantity === 0) return "Out of stock";
  if (stockQuantity <= lowStockThreshold) return `Low stock — ${stockQuantity} available`;
  return `${stockQuantity} available`;
}
