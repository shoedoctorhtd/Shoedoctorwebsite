import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { ProductCartProvider } from "../components/ProductCart";
import ProductCartPage from "../components/ProductCartPage";
import styles from "../components/ProductShop.module.css";
import { listPublicProducts } from "@/lib/product-data";
import type { ProductCard } from "@/lib/product-types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } };

export default async function CartPage() {
  let products: ProductCard[] = [];
  try { products = await listPublicProducts(); } catch { /* no public D1 error */ }
  return <ProductCartProvider><main className={`public-site ${styles.page}`}><SiteHeader /><section className={styles.cartPage}><p className="sd-kicker">Shoe Doctor shop</p><h1>YOUR CART.</h1><ProductCartPage products={products} /></section><SiteFooter /></main></ProductCartProvider>;
}
