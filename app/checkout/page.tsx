import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { ProductCartProvider } from "../components/ProductCart";
import ProductCheckoutForm from "../components/ProductCheckoutForm";
import styles from "../components/ProductShop.module.css";
import { listPublicProducts } from "@/lib/product-data";
import type { ProductCard } from "@/lib/product-types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  let products: ProductCard[] = [];
  try { products = await listPublicProducts(); } catch { /* no public D1 error */ }
  return <ProductCartProvider><main id="main-content" className={`public-site ${styles.page}`}><SiteHeader /><section className={styles.checkoutPage}><p className="sd-kicker">Shoe Doctor shop</p><h1>CHECK OUT.</h1><ProductCheckoutForm products={products} /></section><SiteFooter /></main></ProductCartProvider>;
}
