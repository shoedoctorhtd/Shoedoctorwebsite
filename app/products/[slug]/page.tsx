/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/SiteChrome";
import ProductDetailPurchase from "../../components/ProductDetailPurchase";
import { ProductCartProvider } from "../../components/ProductCart";
import { availabilityCopy, formatNpr } from "../../components/ProductCatalogue";
import styles from "../../components/ProductShop.module.css";
import { getPublicProductBySlug } from "@/lib/product-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getPublicProductBySlug((await params).slug).catch(() => null);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: product.shortDescription ?? "Shoe Doctor care essential.",
    openGraph: product.images[0] ? { images: [{ url: product.images[0].url }] } : { images: [] },
    twitter: product.images[0] ? { images: [product.images[0].url] } : { images: [] },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getPublicProductBySlug((await params).slug).catch(() => null);
  if (!product || !product.slug || product.priceNpr === null) notFound();
  return (
    <ProductCartProvider>
      <main className={`public-site ${styles.page}`}>
        <SiteHeader />
        <section className={styles.detail}>
          <div className={styles.gallery} aria-label={`${product.name} images`}>
            {product.images.map((image) => <img src={image.url} alt={image.altText ?? (image.isPrimary ? product.name : `${product.name} view`)} key={image.id} />)}
          </div>
          <div className={styles.detailInfo}>
            <p className="sd-kicker">Shoe Doctor shop</p>
            <h1>{product.name}</h1>
            <p>{product.fullDescription ?? product.shortDescription}</p>
            <p className={styles.detailPrice}>{formatNpr(product.priceNpr)}</p>
            <p className={styles.detailAvailability}>{availabilityCopy(product.stockQuantity, product.lowStockThreshold)}</p>
            <ProductDetailPurchase productSlug={product.slug} stockQuantity={product.stockQuantity} />
          </div>
        </section>
        <SiteFooter />
      </main>
    </ProductCartProvider>
  );
}
