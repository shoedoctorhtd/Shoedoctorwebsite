import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL, DEFAULT_SOCIAL_IMAGE } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Shoe Doctor Hetauda | Shoe Cleaning & Repair in Nepal",
    template: "%s | Shoe Doctor",
  },
  description:
    "Professional shoe cleaning, repair and restoration in Hetauda, Nepal.",
  openGraph: {
    siteName: "Shoe Doctor",
    locale: "en_NP",
    type: "website",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, alt: "Shoe Doctor" }],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/shoe-doctor-logo.png",
    shortcut: "/shoe-doctor-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#071a3a",
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
        <a className="sd-skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
