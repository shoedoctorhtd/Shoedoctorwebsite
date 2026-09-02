import type { MetadataRoute } from "next";
import { getPublicDonationPageData } from "@/lib/csr-data";
import { listPublicProducts } from "@/lib/product-data";

const siteUrl = "https://www.shoedoctor.com.np";

const publicPaths = [
  "/",
  "/about",
  "/services",
  "/steam-cleaning",
  "/products",
  "/blog",
  "/contact",
  "/shoe-donation",
  "/privacy-policy",
  "/shipping-delivery",
  "/returns-refunds",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = publicPaths.map((path) => ({
    url: new URL(path, siteUrl).toString(),
  }));

  try {
    const products = await listPublicProducts();
    entries.push(
      ...products
        .filter((product) => Boolean(product.slug))
        .map((product) => ({
          url: new URL(`/products/${encodeURIComponent(product.slug!)}`, siteUrl).toString(),
        })),
    );
  } catch {
    // Static routes remain discoverable while an unavailable D1 binding
    // prevents the published-product list from loading.
  }

  try {
    const donationData = await getPublicDonationPageData();
    entries.push(
      ...donationData.donationDrives
        .filter((drive) => drive.isPublished && drive.slug)
        .map((drive) => ({
          url: new URL(`/shoe-donation/updates/${encodeURIComponent(drive.slug)}`, siteUrl).toString(),
        })),
      ...donationData.restorationStories
        .filter((story) => story.isPublished && story.slug)
        .map((story) => ({
          url: new URL(`/shoe-donation/restorations/${encodeURIComponent(story.slug)}`, siteUrl).toString(),
        })),
      ...donationData.communityUpdates
        .filter((update) => update.isPublished && update.slug)
        .map((update) => ({
          url: new URL(`/shoe-donation/updates/${encodeURIComponent(update.slug)}`, siteUrl).toString(),
        })),
    );
  } catch {
    // The static donation page stays in the sitemap if public D1 content is
    // temporarily unavailable.
  }

  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}
