import type { Metadata } from "next";
import type { Product } from "./product-types";

export const SITE_URL = "https://www.shoedoctor.com.np";
export const BUSINESS_ID = `${SITE_URL}/#business`;
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/shoe-doctor-logo.png`;

export function canonicalUrl(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Canonical paths must be local absolute paths.");
  }
  const url = new URL(path, SITE_URL);
  if (url.origin !== SITE_URL) throw new Error("Unexpected canonical origin.");
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function publicImageUrl(value: string) {
  try {
    const url = new URL(value, SITE_URL);
    if (["shoedoctor.com.np", "www.shoedoctor.com.np"].includes(url.hostname)) {
      url.protocol = "https:";
      url.hostname = "www.shoedoctor.com.np";
      url.port = "";
    }
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function publicPageMetadata({ title, description, path, images = [], article }: {
  title: string;
  description: string;
  path: string;
  images?: { url: string; alt?: string }[];
  article?: { publishedTime?: string; modifiedTime?: string };
}): Metadata {
  const url = canonicalUrl(path);
  const publicImages = images.flatMap((image) => {
    const imageUrl = publicImageUrl(image.url);
    return imageUrl ? [{ ...image, url: imageUrl }] : [];
  });
  const socialImages = publicImages.length ? publicImages : [{ url: DEFAULT_SOCIAL_IMAGE, alt: "Shoe Doctor" }];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, siteName: "Shoe Doctor", locale: "en_NP",
      images: socialImages,
      ...(article ? { type: "article", ...article } : { type: "website" }),
    },
    twitter: { card: "summary_large_image", title, description, images: socialImages.map((image) => image.url) },
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</gu, "\\u003c");
}

// Verified against the existing Contact page. LocalBusiness is also an
// Organization, so use this one identity rather than a second business entity.
export const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness",
      "@id": BUSINESS_ID,
      name: "Shoe Doctor",
      legalName: "Shoe Doctor Pvt. Ltd.",
      url: `${SITE_URL}/`,
      logo: DEFAULT_SOCIAL_IMAGE,
      image: `${SITE_URL}/hero-cleaning-sneaker.png`,
      telephone: "+9779761716743",
      email: "shoedoctorhtd@gmail.com",
      description: "Professional shoe cleaning, steam cleaning, repair and restoration in Hetauda, Nepal, with shoe-care products and pickup and return delivery where available.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Opposite the main gate of Huprachaur, Hetauda-4",
        addressLocality: "Hetauda-4",
        addressRegion: "Makwanpur",
        addressCountry: "NP",
      },
      areaServed: { "@type": "City", name: "Hetauda" },
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "19:00" },
        { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "14:00", closes: "19:00" },
      ],
      // Address and hours confirmed by the owner on 2026-09-15.
      // TODO(owner): Add official social-profile sameAs URLs once created.
      // Postal code is omitted because none has been confirmed.
      // Omit priceRange: inspected treatments have no verified fixed range.
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Shoe Doctor",
      url: `${SITE_URL}/`,
      inLanguage: "en",
      publisher: { "@id": BUSINESS_ID },
    },
  ],
};

export function productStructuredData(product: Product) {
  if (product.status !== "published" || !product.slug?.trim()
    || product.priceNpr === null || !Number.isFinite(product.priceNpr) || product.priceNpr < 0) return null;
  const url = canonicalUrl(`/products/${encodeURIComponent(product.slug)}`);
  const images = product.images.flatMap((image) => publicImageUrl(image.url) ?? []);
  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#product`,
      url,
      name: product.name,
      description: product.fullDescription || product.shortDescription || undefined,
      sku: product.sku || undefined,
      ...(product.details.brand ? { brand: { "@type": "Brand", name: product.details.brand } } : {}),
      ...(images.length ? { image: images } : {}),
      offers: {
        "@type": "Offer",
        priceCurrency: "NPR",
        price: String(product.priceNpr),
        // Unknown stock is not evidence of availability. Preserve NULL vs zero.
        ...(product.stockQuantity !== null ? {
          availability: product.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        } : {}),
        url,
        seller: { "@id": BUSINESS_ID, "@type": "Organization", name: "Shoe Doctor", url: `${SITE_URL}/` },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl("/") },
        { "@type": "ListItem", position: 2, name: "Products", item: canonicalUrl("/products") },
        { "@type": "ListItem", position: 3, name: product.name, item: url },
      ],
    },
  ];
}

// Only accept persisted, unambiguous dates. Never substitute the build time.
export function reliableModifiedDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return undefined;
  const date = new Date(value);
  const calendarDate = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || calendarDate.toISOString().slice(0, 10) !== value.slice(0, 10) ? undefined : value;
}

export function preferredHostRedirect(requestUrl: string) {
  const url = new URL(requestUrl);
  if (!["shoedoctor.com.np", "www.shoedoctor.com.np"].includes(url.hostname)) return null;
  if (url.origin === SITE_URL) return null;
  url.protocol = "https:";
  url.hostname = "www.shoedoctor.com.np";
  url.port = "";
  return url.toString();
}
