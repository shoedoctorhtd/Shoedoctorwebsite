"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProductCard, ProductCategory } from "@/lib/product-types";
import { formatNprOrPending } from "@/lib/money";
import { AddToCartButton } from "./ProductCart";
import {
  productAvailabilityCopy,
  productBadgeLabel,
  productCategoryLabel,
} from "./product-presentation";
import styles from "./ProductShop.module.css";

type ShopFilter = {
  id: "all" | "clean" | "protect" | "restore";
  label: string;
  categories?: readonly ProductCategory[];
};

const SHOP_FILTERS: readonly ShopFilter[] = [
  { id: "all", label: "All" },
  { id: "clean", label: "Clean", categories: ["quick_clean", "cleaning_kits", "suede_nubuck"] },
  { id: "protect", label: "Protect", categories: ["protection", "storage", "accessories"] },
  { id: "restore", label: "Restore", categories: ["restoration"] },
];

function matchesShopFilter(product: ProductCard, filterId: ShopFilter["id"]) {
  const filter = SHOP_FILTERS.find((item) => item.id === filterId);
  if (!filter?.categories) return true;
  return product.category !== null && filter.categories.includes(product.category);
}

function compactDescription(description: string | null) {
  if (!description) return null;
  const compact = description.replace(/\s+/gu, " ").trim();
  return compact.length > 96 ? `${compact.slice(0, 93).trimEnd()}…` : compact;
}

export default function ProductCatalogue({ products }: { products: ProductCard[] }) {
  const [selectedFilter, setSelectedFilter] = useState<ShopFilter["id"]>("all");
  const visibleProducts = useMemo(
    () => products.filter((product) => matchesShopFilter(product, selectedFilter)),
    [products, selectedFilter],
  );
  const selectedFilterLabel = SHOP_FILTERS.find((filter) => filter.id === selectedFilter)?.label ?? "All";

  if (!products.length) {
    return (
      <section className={styles.empty} aria-labelledby="products-empty-title">
        <p className="sd-kicker">Shoe Doctor shop</p>
        <h2 id="products-empty-title">CARE ESSENTIALS ARE ON THE WAY.</h2>
        <p>Need help with your shoes in the meantime? Book professional care with Shoe Doctor.</p>
        <Link className="sd-primary-button" href="/#book">Book professional care</Link>
      </section>
    );
  }

  return (
    <>
      <nav className={styles.categoryFilters} aria-label="Filter care products by category">
        {SHOP_FILTERS.map((filter) => (
          <button
            aria-pressed={selectedFilter === filter.id}
            className={selectedFilter === filter.id ? styles.categoryFilterActive : ""}
            key={filter.id}
            onClick={() => setSelectedFilter(filter.id)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </nav>

      {visibleProducts.length ? (
        <div className={`${styles.grid} ${visibleProducts.length === 1 ? styles.gridSingle : ""}`}>
          {visibleProducts.map((product) => <ProductCardItem key={product.slug ?? product.name} product={product} />)}
        </div>
      ) : (
        <p className={styles.filterEmpty} role="status">
          No {selectedFilterLabel.toLowerCase()} care essentials are available right now. Please check back soon.
        </p>
      )}
    </>
  );
}

function ProductCardItem({ product }: { product: ProductCard }) {
  const unavailable = product.stockQuantity === 0;
  const badge = productBadgeLabel(product.badge);
  const category = productCategoryLabel(product.category);
  const productSlug = product.slug ?? "";
  const productHref = `/products/${encodeURIComponent(productSlug)}`;
  const hasCompareAtPrice = product.compareAtPriceNpr !== null
    && product.priceNpr !== null
    && product.compareAtPriceNpr > product.priceNpr;
  const description = compactDescription(product.shortDescription);

  return (
    <article className={styles.card}>
      <Link aria-label={`View ${product.name}`} className={styles.cardImageLink} href={productHref}>
        {product.primaryImage ? (
          <img
            className={styles.cardImage}
            alt={product.primaryImage.altText ?? product.name}
            decoding="async"
            loading="lazy"
            src={product.primaryImage.url}
          />
        ) : <span className={styles.cardImageMissing} aria-hidden="true" />}
        {badge ? <span className={styles.tag}>{badge}</span> : null}
      </Link>
      <div className={styles.cardBody}>
        {category ? <span className={styles.cardCategory}>{category}</span> : null}
        <h3><Link className={styles.cardTitleLink} href={productHref}>{product.name}</Link></h3>
        <div className={styles.priceStack}>
          <strong className={styles.price}>{formatNprOrPending(product.priceNpr)}</strong>
          {hasCompareAtPrice ? <span className={styles.comparePrice}>Was {formatNprOrPending(product.compareAtPriceNpr)}</span> : null}
        </div>
        {description ? <p className={styles.cardDescription}>{description}</p> : null}
        <p className={`${styles.availability} ${unavailable ? styles.availabilityOut : ""}`}>
          {productAvailabilityCopy(product.stockQuantity, product.lowStockThreshold)}
        </p>
        <div className={styles.cardActions}>
          <AddToCartButton className={`${styles.addToCartButton} ${styles.cardAddToCartButton}`} productSlug={productSlug} stockQuantity={product.stockQuantity} />
          <Link className={styles.viewProductButton} href={productHref}>View Product</Link>
        </div>
      </div>
    </article>
  );
}

/** Compatibility exports for current cart/detail consumers. New code imports
 * the shared formatter/presentation utility directly. */
export const formatNpr = formatNprOrPending;
export const availabilityCopy = productAvailabilityCopy;
