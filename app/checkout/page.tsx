import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { ProductCartProvider } from "../components/ProductCart";
import ProductCheckoutForm from "../components/ProductCheckoutForm";
import styles from "../components/ProductShop.module.css";
import { listPublicProducts } from "@/lib/product-data";
import { resolveCheckoutSource } from "@/lib/product-direct-checkout";
import type { ProductCard } from "@/lib/product-types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, products] = await Promise.all([
    searchParams,
    listPublicProducts().catch((): ProductCard[] => []),
  ]);
  const checkoutSource = resolveCheckoutSource(params);
  return <ProductCartProvider><main id="main-content" className={`public-site ${styles.page}`}><SiteHeader /><section className={styles.checkoutPage}><p className="sd-kicker">Care essentials</p><h1>YOUR ORDER.</h1><ProductCheckoutForm checkoutSource={checkoutSource} products={products} /></section><SiteFooter /></main></ProductCartProvider>;
}
