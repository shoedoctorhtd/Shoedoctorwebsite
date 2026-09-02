"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PRODUCT_CATEGORIES,
  type ProductCard,
  type ProductCategory,
} from "@/lib/product-types";
import { formatNprOrPending } from "@/lib/money";
import { AddToCartButton } from "./ProductCart";
import {
  PRODUCT_CATEGORY_LABELS,
  productAvailabilityCopy,
  productBadgeLabel,
  productCategoryLabel,
} from "./product-presentation";
import styles from "./ProductShop.module.css";

type CareGuide = {
  label: string;
  category: ProductCategory;
};

const careGuides: CareGuide[] = [
  { label: "Sneakers", category: "quick_clean" },
  { label: "Suede / Nubuck", category: "suede_nubuck" },
  { label: "White Shoes", category: "restoration" },
  { label: "Leather", category: "protection" },
  { label: "Sports Shoes", category: "cleaning_kits" },
  { label: "Rain Protection", category: "protection" },
  { label: "Storage", category: "storage" },
];

export default function ProductCatalogue({ products }: { products: ProductCard[] }) {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const availableCategories = useMemo(() => {
    const categories = new Set(products.flatMap((product) => product.category ? [product.category] : []));
    return PRODUCT_CATEGORIES.filter((category) => categories.has(category));
  }, [products]);
  const visibleProducts = selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : products;
  const availableCareGuides = careGuides.filter((guide) => availableCategories.includes(guide.category));

  if (!products.length) {
    return (
      <section className={styles.empty} aria-labelledby="products-empty-title">
        <p className="sd-kicker">Shoe Doctor shop</p>
        <h2 id="products-empty-title">SHOP CARE WITH CONFIDENCE.</h2>
        <p>
          Shoe Doctor only lists products that are ready to order. For a
          treatment decision today, book professional shoe care with the team.
        </p>
        <Link className="sd-primary-button" href="/#book">Book shoe care</Link>
      </section>
    );
  }

  return (
    <>
      {availableCategories.length > 1 ? (
        <nav className={styles.categoryFilters} aria-label="Filter care products by category">
          <button
            aria-pressed={selectedCategory === null}
            className={selectedCategory === null ? styles.categoryFilterActive : ""}
            onClick={() => setSelectedCategory(null)}
            type="button"
          >
            All care
          </button>
          {availableCategories.map((category) => (
            <button
              aria-pressed={selectedCategory === category}
              className={selectedCategory === category ? styles.categoryFilterActive : ""}
              key={category}
              onClick={() => setSelectedCategory(category)}
              type="button"
            >
              {PRODUCT_CATEGORY_LABELS[category]}
            </button>
          ))}
        </nav>
      ) : null}

      <div className={`${styles.grid} ${visibleProducts.length === 1 ? styles.gridSingle : ""}`}>
        {visibleProducts.map((product) => <ProductCardItem key={product.slug ?? product.name} product={product} />)}
      </div>

      <section className={styles.careMatcher} aria-labelledby="care-matcher-title">
        <div>
          <p className="sd-kicker">Not sure what your shoes need?</p>
          <h2 id="care-matcher-title">START WITH THE RIGHT KIND OF CARE.</h2>
          <p>
            Product availability changes as Shoe Doctor completes each
            catalogue record. Only categories with currently published items
            are shown here.
          </p>
        </div>
        {availableCareGuides.length ? (
          <div className={styles.careMatcherActions}>
            {availableCareGuides.map((guide) => (
              <button key={guide.label} onClick={() => setSelectedCategory(guide.category)} type="button">
                {guide.label}<span>{PRODUCT_CATEGORY_LABELS[guide.category]}</span>
              </button>
            ))}
            <Link href="/#book">Need professional help? Book Shoe Doctor →</Link>
          </div>
        ) : (
          <Link className="sd-primary-button" href="/#book">Book professional shoe care</Link>
        )}
      </section>
    </>
  );
}

function ProductCardItem({ product }: { product: ProductCard }) {
  const unavailable = product.stockQuantity === 0;
  const badge = productBadgeLabel(product.badge);
  const category = productCategoryLabel(product.category);
  const hasCompareAtPrice = product.compareAtPriceNpr !== null
    && product.priceNpr !== null
    && product.compareAtPriceNpr > product.priceNpr;
  return (
    <article className={styles.card}>
      <Link aria-label={`View ${product.name}`} className={styles.cardImageLink} href={`/products/${encodeURIComponent(product.slug ?? "")}`}>
        {product.primaryImage ? (
          <img
            className={styles.cardImage}
            alt={product.primaryImage.altText ?? product.name}
            decoding="async"
            loading="lazy"
            src={product.primaryImage.url}
          />
        ) : <span className={styles.cardImageMissing} aria-hidden="true" />}
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          {category ? <span className={styles.cardCategory}>{category}</span> : <span />}
          {badge ? <span className={styles.tag}>{badge}</span> : null}
        </div>
        <h3>{product.name}</h3>
        {product.shortDescription ? <p className={styles.cardDescription}>{product.shortDescription}</p> : null}
        <div className={styles.priceStack}>
          <strong className={styles.price}>{formatNprOrPending(product.priceNpr)}</strong>
          {hasCompareAtPrice ? <span className={styles.comparePrice}>Was {formatNprOrPending(product.compareAtPriceNpr)}</span> : null}
        </div>
        <p className={`${styles.availability} ${unavailable ? styles.availabilityOut : ""}`}>
          {productAvailabilityCopy(product.stockQuantity, product.lowStockThreshold)}
        </p>
        <div className={styles.cardActions}>
          <Link href={`/products/${encodeURIComponent(product.slug ?? "")}`}>View product</Link>
          <AddToCartButton className="" productSlug={product.slug ?? ""} stockQuantity={product.stockQuantity} />
        </div>
      </div>
    </article>
  );
}

/** Compatibility exports for current cart/detail consumers. New code imports
 * the shared formatter/presentation utility directly. */
export const formatNpr = formatNprOrPending;
export const availabilityCopy = productAvailabilityCopy;
