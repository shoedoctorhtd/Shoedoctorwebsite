import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, SiteFooter, SiteHeader } from "../components/SiteChrome";
import ProductCatalogue from "../components/ProductCatalogue";
import { ProductCartProvider } from "../components/ProductCart";
import ProductTrustStrip from "../components/ProductTrustStrip";
import styles from "../components/ProductShop.module.css";
import { listPublicProducts } from "@/lib/product-data";
import type { ProductCard } from "@/lib/product-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Shoe Care Products in Nepal | Shoe Doctor" },
  description: "Professional shoe-care products selected by Shoe Doctor for everyday maintenance, protection and restoration.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage() {
  let products: ProductCard[] = [];
  try {
    products = await listPublicProducts();
  } catch {
    // Before migration application, retain a professional empty catalogue.
  }
  return (
    <ProductCartProvider>
      <main className={`public-site ${styles.page}`}>
        <SiteHeader />
        <section className={styles.hero}>
          <p className="sd-kicker">The Shoe Doctor care cabinet</p>
          <h1>SHOE DOCTOR<br /><span>CARE ESSENTIALS.</span></h1>
          <p>Professional shoe-care essentials selected for everyday maintenance, protection and restoration.</p>
          <Link className="sd-primary-button" href="/cart">View cart <ArrowUpRight /></Link>
        </section>
        <ProductTrustStrip />
        <section className={styles.catalogue} aria-labelledby="catalogue-heading">
          <div className={styles.catalogueHead}>
            <h2 id="catalogue-heading">SHOP THE<br />CARE CABINET.</h2>
            <p>Every listing is a published Shoe Doctor product. Live availability and pricing are checked again when you check out.</p>
          </div>
          <ProductCatalogue products={products} />
        </section>
        <SiteFooter />
      </main>
    </ProductCartProvider>
  );
}
