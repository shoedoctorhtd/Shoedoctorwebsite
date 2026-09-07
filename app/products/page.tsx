import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import ProductCatalogue from "../components/ProductCatalogue";
import { CartHeaderLink, ProductCartProvider } from "../components/ProductCart";
import ProductTrustStrip from "../components/ProductTrustStrip";
import ProfessionalCleaningCTA from "../components/ProfessionalCleaningCTA";
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
      <main id="main-content" className={`public-site ${styles.page}`}>
        <SiteHeader />
        <section className={styles.storeHeader} aria-labelledby="products-page-title">
          <div>
            <h1 id="products-page-title">Shoe Doctor Care Essentials</h1>
            <p>Everyday care, chosen by Shoe Doctor for cleaner, longer-lasting pairs.</p>
          </div>
          <CartHeaderLink className={styles.storeCartLink} />
        </section>
        <section className={styles.catalogue} aria-labelledby="catalogue-heading">
          <h2 className="sr-only" id="catalogue-heading">Care essentials</h2>
          <ProductCatalogue products={products} />
        </section>
        <ProductTrustStrip />
        <section className={styles.productsSupport} aria-label="Professional shoe care">
          <ProfessionalCleaningCTA />
        </section>
        <SiteFooter />
      </main>
    </ProductCartProvider>
  );
}
