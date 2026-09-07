/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ArrowUpRight } from "./SiteChrome";
import { formatNprOrPending } from "@/lib/money";
import { HOMEPAGE_PRODUCT_LIMIT } from "@/lib/product-home";
import type { ProductCard } from "@/lib/product-types";
import { productBadgeLabel } from "./product-presentation";
import styles from "./HomeCareEssentials.module.css";

export default function HomeCareEssentials({ products }: { products: ProductCard[] }) {
  const visibleProducts = products
    .filter(
      (product): product is ProductCard & { slug: string } =>
        Boolean(product.slug) &&
        typeof product.stockQuantity === "number" &&
        product.stockQuantity > 0,
    )
    .slice(0, HOMEPAGE_PRODUCT_LIMIT);
  if (!visibleProducts.length) return null;

  return (
    <section aria-labelledby="care-essentials-heading" className={`${styles.section} sd-section`} data-reveal>
      <div className={styles.heading}>
        <div>
          <p className="sd-kicker">The care cabinet</p>
          <h2 id="care-essentials-heading">SHOE DOCTOR<br /><span>CARE ESSENTIALS.</span></h2>
        </div>
        <p>Care products selected by Shoe Doctor for thoughtful cleaning, protection and everyday shoe maintenance.</p>
      </div>

      <div className={styles.grid}>
        {visibleProducts.map((product) => {
          const badge = productBadgeLabel(product.badge);
          return (
            <article className={styles.card} key={product.slug}>
              <Link aria-label={`View ${product.name}`} className={styles.imageLink} href={`/products/${encodeURIComponent(product.slug)}`}>
                {product.primaryImage ? (
                  <img alt={product.primaryImage.altText ?? product.name} decoding="async" loading="lazy" src={product.primaryImage.url} />
                ) : <span aria-hidden="true" className={styles.imageMissing} />}
              </Link>
              <div className={styles.cardBody}>
                <div className={styles.cardLabels}>
                  <span className={styles.genuine}>Genuine product</span>
                  {badge ? <span className={styles.pick}>{badge}</span> : null}
                </div>
                <h3>{product.name}</h3>
                <p className={styles.benefit}>{product.shortDescription}</p>
                <div className={styles.cardFooter}>
                  <div>
                    <strong>{formatNprOrPending(product.priceNpr)}</strong>
                    <span className={product.isOutOfStock ? styles.unavailable : product.isLowStock ? styles.limited : undefined}>
                      {product.isOutOfStock ? "Currently unavailable" : product.isLowStock ? "Limited stock" : "In stock"}
                    </span>
                  </div>
                  <Link href={`/products/${encodeURIComponent(product.slug)}`}>View product <ArrowUpRight /></Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Link className={styles.allProducts} href="/products">View all care essentials <ArrowUpRight /></Link>
    </section>
  );
}
