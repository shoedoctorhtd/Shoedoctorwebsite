"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable @next/next/no-img-element */

import { usePathname } from "next/navigation";
import styles from "./SiteChrome.module.css";

type NavigationKey =
  | "home"
  | "about"
  | "services"
  | "steam"
  | "products"
  | "donate"
  | "blog"
  | "contact";

type NavigationItem = {
  href: string;
  key: NavigationKey;
  label: string;
};

const navigationItems: Record<NavigationKey, NavigationItem> = {
  home: { href: "/", key: "home", label: "Home" },
  about: { href: "/about", key: "about", label: "About Us" },
  services: { href: "/services", key: "services", label: "Services" },
  steam: { href: "/steam-cleaning", key: "steam", label: "Steam Cleaning" },
  products: { href: "/products", key: "products", label: "Products" },
  donate: { href: "/shoe-donation", key: "donate", label: "Donate Shoes" },
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
  {
    key: "primary",
    items: [
      navigationItems.home,
      navigationItems.about,
      navigationItems.donate,
      navigationItems.services,
    ],
  },
  {
    key: "secondary",
    items: [
      navigationItems.steam,
      navigationItems.products,
      navigationItems.blog,
      navigationItems.contact,
    ],
  },
];

const footerNavigation = desktopNavigation.filter(
  (item) => item.key !== "home" && item.key !== "steam",
);

export function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

type NavigationItemsProps = {
  items: readonly NavigationItem[];
  isCurrentPage: (href: string) => boolean;
};

function NavigationItems({ items, isCurrentPage }: NavigationItemsProps) {
  return (
    <>
      {items.map((item) => {
        const isCurrent = isCurrentPage(item.href);
        const isSteam = item.key === "steam";
        return (
          <a
            aria-current={isCurrent ? "page" : undefined}
            className={`sd-nav-item sd-nav-item--${item.key}${
              isSteam ? ` sd-steam-nav-trigger ${styles.steamNavTrigger}` : ""
            }`}
            data-current={isSteam && isCurrent ? "true" : undefined}
            data-nav-key={item.key}
            href={item.href}
            key={item.href}
          >
            {isSteam ? (
              <span className={styles.steamLabel}>{item.label}</span>
            ) : (
              item.label
            )}
            {isSteam ? (
              <span aria-hidden="true" className={styles.steamNewBadge}>
                New
              </span>
            ) : null}
          </a>
        );
      })}
    </>
  );
}

type QuickAction = {
  href: string;
  label: string;
  tone: "default" | "secondary" | "accent";
};

function quickActionsForPath(pathname: string): QuickAction[] {
  const call: QuickAction = { href: "tel:+9779761716743", label: "Call", tone: "default" };
  const whatsapp: QuickAction = { href: "https://wa.me/9779761716743", label: "WhatsApp", tone: "secondary" };

  if (pathname.startsWith("/shoe-donation")) {
    return [
      call,
      whatsapp,
      {
        href: pathname === "/shoe-donation" ? "#donation-form" : "/shoe-donation#donation-form",
        label: "Donate Now",
        tone: "accent",
      },
    ];
  }

  if (pathname.startsWith("/steam-cleaning")) {
    return [
      call,
      whatsapp,
      { href: "/?service=steam-assisted-deep-clean#book", label: "Book Steam Clean", tone: "accent" },
    ];
  }

  if (
    pathname === "/products"
    || pathname.startsWith("/products/")
    || pathname === "/cart"
    || pathname === "/checkout"
    || pathname === "/order-confirmation"
    || pathname.startsWith("/orders/")
  ) {
    return [
      whatsapp,
      { href: "/products", label: "Shop", tone: "secondary" },
      { href: "/cart", label: "View Cart", tone: "accent" },
    ];
  }

  return [
    call,
    whatsapp,
    { href: "/#book", label: "Book Now", tone: "accent" },
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
  const pathname = usePathname() ?? "/";

  function isCurrentPage(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const navigationProps = {
    isCurrentPage,
  };
  const quickActions = quickActionsForPath(pathname);

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
          <NavigationItems {...navigationProps} items={desktopNavigation} />
        </nav>
        <a className="sd-header-cta" href="/#book">
          Book your pair <ArrowUpRight />
        </a>
        <nav className="sd-mobile-nav" aria-label="Primary navigation">
          {mobileNavigationRows.map((row) => (
            <div className="sd-mobile-nav-row" data-nav-row={row.key} key={row.key}>
              <NavigationItems {...navigationProps} items={row.items} />
            </div>
          ))}
        </nav>
      </header>
      <nav className="sd-mobile-action-bar" aria-label="Quick actions">
        {quickActions.map((action) => (
          <a data-quick-action={action.tone} href={action.href} key={action.label}>
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
          {footerNavigation.map((item) => (
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
