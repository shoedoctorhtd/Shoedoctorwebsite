import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/app/components/SiteChrome";
import ProductPaymentPage from "@/app/components/ProductPaymentPage";
import styles from "@/app/components/ProductShop.module.css";
import { normalizeProductOrderReferenceSearch } from "@/lib/product-order-reference";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Secure QR payment", robots: { index: false, follow: false } };

export default async function ProductPaymentRoute({ params }: { params: Promise<{ reference: string }> }) {
  const reference = normalizeProductOrderReferenceSearch((await params).reference);
  if (!reference) notFound();
  return <main id="main-content" className={`public-site ${styles.page}`}><SiteHeader /><ProductPaymentPage reference={reference} /><SiteFooter /></main>;
}
