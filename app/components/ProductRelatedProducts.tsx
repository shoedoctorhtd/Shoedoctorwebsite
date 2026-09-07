/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { formatNprOrPending } from "@/lib/money";
import type { RelatedProductCard } from "@/lib/product-related";
import {
  productAvailabilityCopy,
  productBadgeLabel,
  productCategoryLabel,
} from "./product-presentation";
import styles from "./ProductShop.module.css";

export default function ProductRelatedProducts({ products }: { products: RelatedProductCard[] }) {
  if (!products.length) return null;

  return (
    <section className={styles.relatedProducts} aria-labelledby="related-products-title">
      <div className={styles.relatedProductsHeading}>
        <p className="sd-kicker">Complete your care kit</p>
        <h2 id="related-products-title">COMPLETE YOUR CARE KIT.</h2>
      </div>
      <div className={styles.relatedProductsGrid}>
        {products.map((product) => {
          const badge = productBadgeLabel(product.badge);
          const category = productCategoryLabel(product.category);
          return (
            <article className={styles.relatedProductCard} key={product.slug}>
              <Link aria-label={`View ${product.name}`} className={styles.relatedProductLink} href={`/products/${encodeURIComponent(product.slug)}`}>
                {product.primaryImage ? (
                  <img
                    alt={product.primaryImage.altText ?? product.name}
                    className={styles.relatedProductImage}
                    decoding="async"
                    loading="lazy"
                    src={product.primaryImage.url}
                  />
                ) : <span className={styles.relatedProductImageMissing} aria-hidden="true" />}
                <span className={styles.relatedProductBody}>
                  <span className={styles.relatedProductMeta}>
                    {category ? <span>{category}</span> : <span />}
                    {badge ? <span className={styles.tag}>{badge}</span> : null}
                  </span>
                  <strong>{product.name}</strong>
                  {product.shortDescription ? <span>{product.shortDescription}</span> : null}
                  <span className={styles.relatedProductPrice}>{formatNprOrPending(product.priceNpr)}</span>
                  <span className={styles.relatedProductAvailability}>{productAvailabilityCopy(product.stockQuantity, product.lowStockThreshold)}</span>
                  <span className={styles.relatedProductAction}>View Product</span>
                </span>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
