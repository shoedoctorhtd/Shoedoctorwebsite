import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/SiteChrome";
import ProductDetailPurchase from "../../components/ProductDetailPurchase";
import { ProductCartProvider } from "../../components/ProductCart";
import ProductGallery from "../../components/ProductGallery";
import ProductCareGuide from "../../components/ProductCareGuide";
import ProductRelatedProducts from "../../components/ProductRelatedProducts";
import ProfessionalCleaningCTA from "../../components/ProfessionalCleaningCTA";
import ProductStructuredData from "../../components/ProductStructuredData";
import styles from "../../components/ProductShop.module.css";
import { getPublicProductBySlug } from "@/lib/product-data";
import { listRelatedPublicProducts } from "@/lib/product-related";
import { formatNpr } from "@/lib/money";
import { productAvailabilityCopy, productBadgeLabel, productCategoryLabel } from "../../components/product-presentation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getPublicProductBySlug((await params).slug).catch(() => null);
  if (!product || !product.slug) return { title: "Product", robots: { index: false, follow: false } };
  const title = product.details.seoTitle ?? `${product.name} in Nepal | Shoe Doctor`;
  const description = product.details.seoDescription ?? product.shortDescription ?? product.fullDescription ?? "Shoe Doctor care essential.";
  const imageUrls = product.images.map((image) => ({ url: image.url, alt: image.altText ?? product.name }));
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/products/${encodeURIComponent(product.slug)}` },
    openGraph: { title, description, url: `/products/${encodeURIComponent(product.slug)}`, images: imageUrls },
    twitter: { card: "summary_large_image", title, description, images: imageUrls.map((image) => image.url) },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getPublicProductBySlug((await params).slug).catch(() => null);
  if (!product || !product.slug || product.priceNpr === null) notFound();
  const relatedProducts = await listRelatedPublicProducts(product).catch(() => []);
  const valueProposition = product.details.valueProposition ?? product.shortDescription;
  const category = productCategoryLabel(product.category);
  const badge = productBadgeLabel(product.badge);
  const hasCompareAtPrice = product.compareAtPriceNpr !== null && product.compareAtPriceNpr > product.priceNpr;
  return (
    <ProductCartProvider>
      <main id="main-content" className={`public-site ${styles.page}`}>
        <SiteHeader />
        <ProductStructuredData product={product} />
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <ol>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/products">Products</Link></li>
            <li aria-current="page">{product.name}</li>
          </ol>
        </nav>
        <section className={styles.detail}>
          <ProductGallery key={product.slug} productName={product.name} images={product.images} />
          <div className={styles.detailInfo}>
            <p className="sd-kicker">{category ?? "Shoe Doctor shop"}</p>
            {badge ? <span className={styles.tag}>{badge}</span> : null}
            <h1>{product.name}</h1>
            {valueProposition ? <p>{valueProposition}</p> : null}
            <p className={styles.detailPrice}>{formatNpr(product.priceNpr)}</p>
            {hasCompareAtPrice ? <p className={styles.detailComparePrice}>Was {formatNpr(product.compareAtPriceNpr!)}</p> : null}
            <p className={styles.detailAvailability}>{productAvailabilityCopy(product.stockQuantity, product.lowStockThreshold)}</p>
            <ProductDetailPurchase productSlug={product.slug} stockQuantity={product.stockQuantity} />
            <ul className={styles.detailReassurance}>
              <li>QR payment and Cash on Delivery are available at checkout.</li>
              <li>Delivery availability and any charge are confirmed for the order.</li>
              <li><Link href="/contact">Need help choosing? Contact Shoe Doctor.</Link></li>
            </ul>
          </div>
        </section>
        <div className={styles.detailSections}>
          {product.fullDescription && product.fullDescription !== valueProposition ? (
            <section className={styles.careGuide} aria-labelledby="product-description-title">
              <p className="sd-kicker">Product details</p>
              <h2 id="product-description-title">PRODUCT DETAILS.</h2>
              <p>{product.fullDescription}</p>
            </section>
          ) : null}
          <ProductCareGuide product={product} />
          <ProductRelatedProducts products={relatedProducts} />
          <ProfessionalCleaningCTA />
        </div>
        <SiteFooter />
      </main>
    </ProductCartProvider>
  );
}
