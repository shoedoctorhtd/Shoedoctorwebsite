import type { Metadata } from "next";
import { ArrowUpRight, SiteFooter, SiteHeader } from "../components/SiteChrome";
import ProductCatalogue from "../components/ProductCatalogue";
import { ProductCartProvider } from "../components/ProductCart";
import styles from "../components/ProductShop.module.css";
import { listPublicProducts } from "@/lib/product-data";
import type { ProductCard } from "@/lib/product-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products",
  description: "Shop Shoe Doctor care essentials and accessories in Nepal.",
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
          <p className="sd-kicker">Shoe Doctor shop</p>
          <h1>CARE ESSENTIALS,<br /><span>READY FOR YOUR PAIR.</span></h1>
          <p>Shop the tools and accessories selected for everyday shoe care.</p>
          <a className="sd-primary-button" href="/cart">View cart <ArrowUpRight /></a>
        </section>
        <section className={styles.catalogue} aria-labelledby="catalogue-heading">
          <div className={styles.catalogueHead}>
            <h2 id="catalogue-heading">SHOP THE<br />CARE CABINET.</h2>
            <p>Every listed product is ready to order, with live availability shown before you add it to your cart.</p>
          </div>
          <ProductCatalogue products={products} />
        </section>
        <SiteFooter />
      </main>
    </ProductCartProvider>
  );
}
