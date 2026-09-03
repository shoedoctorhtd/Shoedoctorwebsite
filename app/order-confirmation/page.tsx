import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, SiteFooter, SiteHeader } from "../components/SiteChrome";
import styles from "../components/ProductShop.module.css";
import { normalizeProductOrderReferenceSearch } from "@/lib/product-order-reference";

export const metadata: Metadata = { title: "Order received", robots: { index: false, follow: false } };

export default async function OrderConfirmationPage({ searchParams }: { searchParams: Promise<{ reference?: string; payment?: string }> }) {
  const query = await searchParams;
  const reference = normalizeProductOrderReferenceSearch(query.reference ?? "") ?? "Order received";
  const isCod = query.payment === "cod";
  return <main className={`public-site ${styles.page}`}><SiteHeader /><section className={styles.confirmation}><p className="sd-kicker">Shoe Doctor shop</p><h1>ORDER RECEIVED.</h1><div className={styles.confirmationBox}><strong>{reference}</strong><p>{isCod ? "Thank you. Your Cash on Delivery order has been saved. Payment will be collected when Shoe Doctor delivers your order or when you collect it." : "Thank you. Your product order has been saved. Shoe Doctor will confirm payment and delivery or collection with you shortly."}</p><Link className="sd-primary-button" href="/products">Continue shopping <ArrowUpRight /></Link></div></section><SiteFooter /></main>;
}
