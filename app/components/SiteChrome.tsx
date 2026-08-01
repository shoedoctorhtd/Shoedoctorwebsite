"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import {
  STEAM_ASSISTED_DEEP_CLEAN_ID,
  steamCleaningContent,
} from "@/lib/steam-cleaning";
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
  isSteamPopupOpen: boolean;
  onSteamPopupToggle: () => void;
  popupId: string;
};

function NavigationItems({
  isCurrentPage,
  isSteamPopupOpen,
  onSteamPopupToggle,
  popupId,
}: NavigationItemsProps) {
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
      <button
        aria-controls={popupId}
        aria-expanded={isSteamPopupOpen}
        className={`sd-steam-nav-trigger ${styles.steamNavTrigger}`}
        data-current={isCurrentPage("/steam-cleaning") || isSteamPopupOpen}
        onClick={onSteamPopupToggle}
        type="button"
      >
        Steam Cleaning <span>New</span>
      </button>
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
  const [isSteamPopupOpen, setIsSteamPopupOpen] = useState(false);
  const steamPopupId = useId();

  function isCurrentPage(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  useEffect(() => {
    if (!isSteamPopupOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsSteamPopupOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isSteamPopupOpen]);

  const navigationProps = {
    isCurrentPage,
    isSteamPopupOpen,
    onSteamPopupToggle: () => setIsSteamPopupOpen((isOpen) => !isOpen),
    popupId: steamPopupId,
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
      {isSteamPopupOpen && (
        <div
          className="sd-steam-popup-layer"
          onMouseDown={() => setIsSteamPopupOpen(false)}
          role="presentation"
        >
          <section
            aria-labelledby={`${steamPopupId}-heading`}
            className="sd-steam-popup"
            id={steamPopupId}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close Steam Cleaning popup"
              className="sd-steam-popup-close"
              onClick={() => setIsSteamPopupOpen(false)}
              type="button"
            >
              ×
            </button>
            <p className="sd-steam-popup-kicker">NEW AT SHOE DOCTOR</p>
            <h2 id={`${steamPopupId}-heading`}>
              {steamCleaningContent.serviceName}
            </h2>
            <span className="sd-steam-popup-title">
              {steamCleaningContent.serviceTitle}
            </span>
            <p className="sd-steam-popup-copy">
              {steamCleaningContent.serviceIntro}
            </p>
            <div className="sd-steam-popup-actions">
              <a href="/steam-cleaning" onClick={() => setIsSteamPopupOpen(false)}>
                Explore steam cleaning <ArrowUpRight />
              </a>
              <a
                href={`/?service=${STEAM_ASSISTED_DEEP_CLEAN_ID}#book`}
                onClick={() => setIsSteamPopupOpen(false)}
              >
                Book a steam clean <ArrowUpRight />
              </a>
            </div>
          </section>
        </div>
      )}
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
