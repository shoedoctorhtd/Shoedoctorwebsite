"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable @next/next/no-img-element */

import { usePathname } from "next/navigation";
import styles from "./SiteChrome.module.css";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/shoe-donation", label: "Donate Shoes" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact Us" },
];

export function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

type NavigationItemsProps = {
  isCurrentPage: (href: string) => boolean;
};

function NavigationItems({ isCurrentPage }: NavigationItemsProps) {
  return (
    <>
      {navItems.slice(0, 3).map((item) => (
        <a
          aria-current={isCurrentPage(item.href) ? "page" : undefined}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </a>
      ))}
      <a
        aria-current={isCurrentPage("/steam-cleaning") ? "page" : undefined}
        className={`sd-steam-nav-trigger ${styles.steamNavTrigger}`}
        data-current={isCurrentPage("/steam-cleaning")}
        href="/steam-cleaning"
      >
        Steam Cleaning <span>New</span>
      </a>
      {navItems.slice(3).map((item) => (
        <a
          aria-current={isCurrentPage(item.href) ? "page" : undefined}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </a>
      ))}
    </>
  );
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

  const navigationProps = {
    isCurrentPage,
  };

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
          <NavigationItems {...navigationProps} />
        </nav>
        <a className="sd-header-cta" href="/#book">
          Book your pair <ArrowUpRight />
        </a>
        <nav className="sd-mobile-nav" aria-label="Primary navigation">
          <NavigationItems {...navigationProps} />
        </nav>
      </header>
      <nav className="sd-mobile-action-bar" aria-label="Quick actions">
        <a href="tel:+9779761716743">Call</a>
        <a href="https://wa.me/9779761716743">WhatsApp</a>
        <a href="/#book">Book Now</a>
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
          {navItems.slice(1).map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
          <a href="/privacy-policy">Privacy Policy</a>
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
