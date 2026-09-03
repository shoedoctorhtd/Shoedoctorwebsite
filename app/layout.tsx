import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const siteUrl = "https://www.shoedoctor.com.np";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Shoe Doctor Pvt. Ltd.",
  url: siteUrl,
  logo: `${siteUrl}/shoe-doctor-logo.png`,
  image: `${siteUrl}/shoe-doctor-logo.png`,
  telephone: "+9779761716743",
  email: "shoedoctorhtd@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Hetauda-4",
    addressRegion: "Makwanpur",
    addressCountry: "NP",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Shoe Doctor | Clean. Repair. Restore.",
    template: "%s | Shoe Doctor",
  },
  description:
    "Professional shoe cleaning, repair and restoration for every kind of footwear.",
  openGraph: {
    siteName: "Shoe Doctor",
    locale: "en_NP",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/shoe-doctor-logo.png",
    shortcut: "/shoe-doctor-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessSchema).replace(/</gu, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
