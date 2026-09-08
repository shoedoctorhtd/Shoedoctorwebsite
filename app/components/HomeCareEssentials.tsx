/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ArrowUpRight } from "./SiteChrome";
import { formatNprOrPending } from "@/lib/money";
import { HOMEPAGE_PRODUCT_LIMIT } from "@/lib/product-home";
import type { ProductCard } from "@/lib/product-types";
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
        <p>Selected products for thoughtful cleaning, protection and everyday care.</p>
      </div>

      <div className={styles.grid}>
        {visibleProducts.map((product) => {
          return (
            <article className={styles.card} key={product.slug}>
              <Link aria-label={`View ${product.name}`} className={styles.imageLink} href={`/products/${encodeURIComponent(product.slug)}`}>
                {product.primaryImage ? (
                  <img alt={product.primaryImage.altText ?? product.name} decoding="async" loading="lazy" src={product.primaryImage.url} />
                ) : <span aria-hidden="true" className={styles.imageMissing} />}
              </Link>
              <div className={styles.cardBody}>
                <h3>{product.name}</h3>
                <div className={styles.cardFooter}>
                  <strong>{formatNprOrPending(product.priceNpr)}</strong>
                  <Link href={`/products/${encodeURIComponent(product.slug)}`}>View Product <ArrowUpRight /></Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Link className={styles.allProducts} href="/products">View All Products <ArrowUpRight /></Link>
    </section>
  );
}
