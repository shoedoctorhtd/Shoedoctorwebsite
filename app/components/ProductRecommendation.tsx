/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { ProductCard } from "@/lib/product-types";
import { formatNprOrPending } from "@/lib/money";
import styles from "./ProductShop.module.css";

export default function ProductRecommendation({
  product,
  explanation,
}: {
  product: ProductCard | null;
  explanation: string;
}) {
  if (!product?.slug || product.badge !== "doctors_pick" || product.stockQuantity === 0) return null;
  return (
    <aside className={styles.doctorRecommendation} aria-label="Doctor's Recommendation">
      <p className="sd-kicker">Doctor&apos;s recommendation</p>
      <div>
        {product.primaryImage ? (
          <img alt={product.primaryImage.altText ?? product.name} loading="lazy" src={product.primaryImage.url} />
        ) : null}
        <div>
          <h3>{product.name}</h3>
          <p>{explanation}</p>
          <strong>{formatNprOrPending(product.priceNpr)}</strong>
          <Link href={`/products/${encodeURIComponent(product.slug)}`}>Shop now →</Link>
        </div>
      </div>
    </aside>
  );
}
