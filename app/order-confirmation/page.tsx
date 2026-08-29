import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, SiteFooter, SiteHeader } from "../components/SiteChrome";
import styles from "../components/ProductShop.module.css";
import { normalizeProductOrderReferenceSearch } from "@/lib/product-order-reference";

export const metadata: Metadata = { title: "Order received", robots: { index: false, follow: false } };

export default async function OrderConfirmationPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const reference = normalizeProductOrderReferenceSearch((await searchParams).reference ?? "") ?? "Order received";
  return <main className={`public-site ${styles.page}`}><SiteHeader /><section className={styles.confirmation}><p className="sd-kicker">Shoe Doctor shop</p><h1>ORDER RECEIVED.</h1><div className={styles.confirmationBox}><strong>{reference}</strong><p>Thank you. Your product order has been saved. Payment is pending, and Shoe Doctor will confirm payment and delivery or collection with you shortly.</p><Link className="sd-primary-button" href="/products">Continue shopping <ArrowUpRight /></Link></div></section><SiteFooter /></main>;
}
