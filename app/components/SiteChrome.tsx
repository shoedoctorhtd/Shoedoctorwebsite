"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable @next/next/no-img-element */

import { usePathname } from "next/navigation";
import styles from "./SiteChrome.module.css";

type NavigationItem = {
  href: string;
  key:
    | "home"
    | "about"
    | "donate"
    | "services"
    | "steam"
    | "products"
    | "blog"
    | "contact";
  label: string;
};

const navigationItems: Record<NavigationItem["key"], NavigationItem> = {
  home: { href: "/", key: "home", label: "Home" },
  about: { href: "/about", key: "about", label: "About Us" },
  donate: { href: "/shoe-donation", key: "donate", label: "Donate Shoes" },
  services: { href: "/services", key: "services", label: "Services" },
  steam: { href: "/steam-cleaning", key: "steam", label: "Steam Cleaning" },
  products: { href: "/products", key: "products", label: "Products" },
  blog: { href: "/blog", key: "blog", label: "Blog" },
  contact: { href: "/contact", key: "contact", label: "Contact Us" },
};

const desktopNavigation = [
  navigationItems.home,
  navigationItems.about,
  navigationItems.services,
  navigationItems.steam,
  navigationItems.products,
  navigationItems.donate,
  navigationItems.blog,
  navigationItems.contact,
];

const mobileNavigationRows = [
  [
    navigationItems.home,
    navigationItems.about,
    navigationItems.donate,
    navigationItems.services,
  ],
  [
    navigationItems.steam,
    navigationItems.products,
    navigationItems.blog,
    navigationItems.contact,
  ],
] as const;

export function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

type NavigationItemsProps = {
  isCurrentPage: (href: string) => boolean;
  items: readonly NavigationItem[];
};

function NavigationItems({ isCurrentPage, items }: NavigationItemsProps) {
  return (
    <>
      {items.map((item) => (
        <a
          aria-current={isCurrentPage(item.href) ? "page" : undefined}
          className={`sd-nav-item sd-nav-item--${item.key}${
            item.key === "steam"
              ? ` sd-steam-nav-trigger ${styles.steamNavTrigger}`
              : ""
          }`}
          data-current={
            item.key === "steam" ? isCurrentPage(item.href) : undefined
          }
          data-nav-key={item.key}
          href={item.href}
          key={item.href}
        >
          {item.label}
          {item.key === "steam" ? (
            <span aria-hidden="true" className={styles.steamNewBadge}>
              New
            </span>
          ) : null}
        </a>
      ))}
    </>
  );
}

type QuickAction = {
  ariaLabel: string;
  href: string;
  label: string;
};

function mobileQuickActions(pathname: string): QuickAction[] {
  if (pathname.startsWith("/shoe-donation")) {
    return [
      { ariaLabel: "Call Shoe Doctor", href: "tel:+9779761716743", label: "Call" },
      { ariaLabel: "Message Shoe Doctor on WhatsApp", href: "https://wa.me/9779761716743", label: "WhatsApp" },
      { ariaLabel: "Go to the donation form", href: "#donation-form", label: "Donate Now" },
    ];
  }

  if (pathname.startsWith("/steam-cleaning")) {
    return [
      { ariaLabel: "Call Shoe Doctor", href: "tel:+9779761716743", label: "Call" },
      { ariaLabel: "Message Shoe Doctor on WhatsApp", href: "https://wa.me/9779761716743", label: "WhatsApp" },
      {
        ariaLabel: "Book a Steam-Assisted Deep Clean",
        href: "/?service=steam-assisted-deep-clean#book",
        label: "Book Steam Clean",
      },
    ];
  }

  if (
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname.startsWith("/orders/") ||
    pathname === "/order-confirmation"
  ) {
    return [
      { ariaLabel: "Message Shoe Doctor on WhatsApp", href: "https://wa.me/9779761716743", label: "WhatsApp" },
      { ariaLabel: "Shop Shoe Doctor care essentials", href: "/products", label: "Shop" },
      { ariaLabel: "View shopping cart", href: "/cart", label: "View Cart" },
    ];
  }

  return [
    { ariaLabel: "Call Shoe Doctor", href: "tel:+9779761716743", label: "Call" },
    { ariaLabel: "Message Shoe Doctor on WhatsApp", href: "https://wa.me/9779761716743", label: "WhatsApp" },
    { ariaLabel: "Book your pair", href: "/#book", label: "Book Now" },
  ];
}

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a
      className={`sd-brand${footer ? " sd-brand-footer" : ""}`}
      href="/"
      aria-label="Shoe Doctor home"
    >
      <span className="sd-logo-crop" aria-hidden="true">
        <img
          src="/shoe-stethoscope-mark.webp"
          alt=""
          width={180}
          height={180}
          loading={footer ? "lazy" : "eager"}
        />
      </span>
      <span className="sd-wordmark" aria-hidden="true">
        SH<span className="sd-plus-o">+</span>E <b>DOCTOR</b>
      </span>
    </a>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  function isCurrentPage(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const quickActions = mobileQuickActions(pathname);

  return (
    <>
      <div className="sd-topbar">
        <span>Professional shoe cleaning · repair · restoration</span>
        <div>
          <a href="tel:+9779761716743">+977 9761716743</a>
          <span>Follow: Shoe Doctor</span>
        </div>
      </div>
      <header className="sd-header">
        <Brand />
        <nav className="sd-desktop-nav" aria-label="Main navigation">
          <NavigationItems isCurrentPage={isCurrentPage} items={desktopNavigation} />
        </nav>
        <a className="sd-header-cta" href="/#book">
          Book your pair <ArrowUpRight />
        </a>
        <nav className="sd-mobile-nav" aria-label="Primary navigation">
          {mobileNavigationRows.map((row, index) => (
            <div
              className={`sd-mobile-nav-row sd-mobile-nav-row--${index + 1}`}
              key={`mobile-navigation-row-${index + 1}`}
            >
              <NavigationItems isCurrentPage={isCurrentPage} items={row} />
            </div>
          ))}
        </nav>
      </header>
      <nav
        className="sd-mobile-action-bar"
        aria-label="Quick actions"
        data-context={pathname}
      >
        {quickActions.map((action, index) => (
          <a
            aria-label={action.ariaLabel}
            data-quick-action={
              index === 2 ? "accent" : index === 1 ? "secondary" : "default"
            }
            href={action.href}
            key={action.label}
          >
            {action.label}
          </a>
        ))}
      </nav>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="sd-footer">
      <div className="sd-footer-main">
        <div>
          <Brand footer />
          <p>
            Thoughtful cleaning, repair and restoration for every pair worth
            wearing again.
          </p>
        </div>
        <div className="sd-footer-links">
          <span>Explore</span>
          {desktopNavigation.filter((item) => item.key !== "home").map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
          <a href="/shipping-delivery">Shipping &amp; Delivery</a>
          <a href="/returns-refunds">Returns &amp; Refunds</a>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms">Terms</a>
        </div>
        <div className="sd-footer-contact">
          <span>Talk to the Doctor</span>
          <a href="tel:+9779761716743">+977 9761716743</a>
          <a href="https://wa.me/9779761716743">WhatsApp us ↗</a>
          <a href="mailto:shoedoctorhtd@gmail.com">
            shoedoctorhtd@gmail.com
          </a>
        </div>
      </div>
      <div className="sd-footer-bottom">
        <span>© 2026 Shoe Doctor. All rights reserved.</span>
        <strong>WE DIAGNOSE. WE CLEAN. WE RESTORE.</strong>
        <a href="/admin">Owner dashboard</a>
      </div>
    </footer>
  );
}
