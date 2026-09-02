"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { ProductImage } from "@/lib/product-types";
import styles from "./ProductShop.module.css";

export default function ProductGallery({
  productName,
  images,
}: {
  productName: string;
  images: ProductImage[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0] ?? null;
  if (!activeImage) return null;

  return (
    <section className={styles.productGallery} aria-label={`${productName} image gallery`}>
      <div className={styles.productGalleryMain}>
        <img
          src={activeImage.url}
          alt={activeImage.altText ?? productName}
          decoding="async"
          fetchPriority="high"
        />
      </div>
      {images.length > 1 ? (
        <div className={styles.productGalleryThumbs} aria-label={`Choose a ${productName} image`}>
          {images.map((image, index) => (
            <button
              aria-current={index === activeIndex ? "true" : undefined}
              aria-label={`View ${image.altText ?? `${productName} image ${index + 1}`}`}
              className={index === activeIndex ? styles.productGalleryThumbActive : ""}
              key={image.id}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <img alt="" decoding="async" loading="lazy" src={image.url} />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
