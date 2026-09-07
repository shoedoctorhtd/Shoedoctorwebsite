/* eslint-disable @next/next/no-html-link-for-pages */

import type { Metadata } from "next";
import BookingForm from "./components/BookingForm";
import HomeCareEssentials from "./components/HomeCareEssentials";
import bookingStyles from "./components/BookingExperience.module.css";
import { ArrowUpRight, SiteFooter, SiteHeader } from "./components/SiteChrome";
import styles from "./HomePage.module.css";
import { listPublicServices, type Service } from "@/lib/data";
import { listHomepageProducts } from "@/lib/product-data";
import { STEAM_ASSISTED_DEEP_CLEAN_ID } from "@/lib/steam-cleaning";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Shoe Doctor Nepal | Steam Brush Shoe Cleaning, Repair & Restoration",
  },
  description:
    "Professional shoe cleaning in Hetauda by Shoe Doctor Nepal. Discover steam shoe cleaning in Nepal and steam-assisted sneaker cleaning alongside expert repair and restoration.",
  alternates: { canonical: "/" },
};

const HOME_SERVICE_IDS = [
  "basic-clean",
  "deep-clean",
  STEAM_ASSISTED_DEEP_CLEAN_ID,
  "full-restoration",
];

function selectHomepageServices(services: Service[]) {
  const selected = HOME_SERVICE_IDS
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service));
  const selectedIds = new Set(selected.map((service) => service.id));

  for (const service of services) {
    if (selected.length >= 4) break;
    if (!selectedIds.has(service.id)) {
      selected.push(service);
      selectedIds.add(service.id);
    }
  }

  return selected;
}

function localBrandOffers(services: Service[]) {
  return services
    .filter(
      (service) =>
        service.specialPriceLabel
        && /made[- ]in[- ]nepal|nepali|local/iu.test(service.specialPriceLabel),
    )
    .slice(0, 3)
    .map((service) => `${service.name}: ${service.specialPriceLabel}`);
}

function serviceAction(service: Service) {
  if (service.id === STEAM_ASSISTED_DEEP_CLEAN_ID) {
    return { href: "/steam-cleaning", label: "Explore Steam Cleaning" };
  }
  return {
    href: `/?service=${encodeURIComponent(service.id)}#book`,
    label: "Book this service",
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const [services, params, homepageProducts] = await Promise.all([
    listPublicServices(),
    searchParams,
    listHomepageProducts().catch(() => []),
  ]);
  const requestedService = services.some(
    (service) => service.id === params.service,
  )
    ? params.service
    : services[0]?.id;
  const featuredServices = selectHomepageServices(services);
  const offers = localBrandOffers(services);
  const publicWhatsAppUrl = "https://wa.me/9779761716743";

  return (
    <main id="main-content" className="public-site">
      <SiteHeader />

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <h1>
            YOUR PAIR,
            <span>BACK TO <em>LIFE.</em></span>
          </h1>
          <p>
            Thoughtful cleaning, repair and restoration for the shoes that carry
            your story.
          </p>
          <div className={styles.heroActions}>
            <a className="sd-primary-button" href="/#book">
              Book your pair <ArrowUpRight />
            </a>
            <a className={styles.secondaryAction} href="#services-overview">
              Explore services <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <picture>
            <source
              sizes="(max-width: 760px) 100vw, (max-width: 1024px) 48vw, 640px"
              srcSet="/hero-cleaning-sneaker-640.avif 640w, /hero-cleaning-sneaker-1024.avif 1024w, /hero-cleaning-sneaker-1536.avif 1536w"
              type="image/avif"
            />
            <source
              sizes="(max-width: 760px) 100vw, (max-width: 1024px) 48vw, 640px"
              srcSet="/hero-cleaning-sneaker-640.webp 640w, /hero-cleaning-sneaker-1024.webp 1024w, /hero-cleaning-sneaker-1536.webp 1536w"
              type="image/webp"
            />
            <img
              alt="A clean, restored white and navy high-top sneaker"
              className={styles.heroShoe}
              decoding="async"
              fetchPriority="high"
              height="1024"
              loading="eager"
              sizes="(max-width: 760px) 100vw, (max-width: 1024px) 48vw, 640px"
              src="/hero-cleaning-sneaker-1536.webp"
              srcSet="/hero-cleaning-sneaker-640.webp 640w, /hero-cleaning-sneaker-1024.webp 1024w, /hero-cleaning-sneaker-1536.webp 1536w"
              width="1536"
            />
          </picture>
        </div>
      </section>

      <HomeCareEssentials products={homepageProducts} />

      <section
        aria-labelledby="services-overview-heading"
        className={styles.services}
        id="services-overview"
      >
        <header className={styles.sectionHeading}>
          <div>
            <p>Services</p>
            <h2 id="services-overview-heading">Care that fits the pair.</h2>
          </div>
          <a href="/services">
            View all services <ArrowUpRight />
          </a>
        </header>

        {featuredServices.length ? (
          <div className={styles.serviceGrid}>
            {featuredServices.map((service) => {
              const action = serviceAction(service);
              const isSteam = service.id === STEAM_ASSISTED_DEEP_CLEAN_ID;
              return (
                <article className={styles.serviceCard} key={service.id}>
                  <div className={styles.serviceMeta}>
                    <span>{service.category}</span>
                    {isSteam ? <span className={styles.newBadge}>New</span> : null}
                  </div>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                  {isSteam ? (
                    <p className={styles.steamNote}>
                      Steam is used only after material, adhesive and construction
                      are checked.
                    </p>
                  ) : null}
                  <div className={styles.serviceFooter}>
                    <div>
                      <strong>{service.priceLabel}</strong>
                      {service.specialPriceLabel ? (
                        <span>{service.specialPriceLabel}</span>
                      ) : null}
                    </div>
                    <a href={action.href}>
                      {action.label} <ArrowUpRight />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {offers.length ? (
        <section aria-labelledby="local-offer-heading" className={styles.localOffer}>
          <div>
            <p>Local-brand offer</p>
            <h2 id="local-offer-heading">WEAR LOCAL. SAVE LOCAL.</h2>
          </div>
          <p>
            For verified Nepali-brand footwear: {offers.join(" · ")}. We confirm
            eligibility before work begins.
          </p>
          <a href="/#book">
            Ask about eligibility <ArrowUpRight />
          </a>
        </section>
      ) : null}

      <section aria-labelledby="booking-process-heading" className={styles.process}>
        <p>How it works</p>
        <div>
          <h2 id="booking-process-heading">
            Book <span aria-hidden="true">→</span> We confirm and care{" "}
            <span aria-hidden="true">→</span> Collect or receive
          </h2>
          <p>
            We check the pair, confirm the suitable treatment and keep you updated
            before any work begins.
          </p>
        </div>
        <a href="/#book">Book your pair <ArrowUpRight /></a>
      </section>

      <section
        aria-labelledby="booking-intro-heading"
        className={bookingStyles.bookingSection}
      >
        <aside className={bookingStyles.infoPanel}>
          <p className={bookingStyles.introKicker}>Booking your pair</p>
          <h2 className={bookingStyles.infoTitle} id="booking-intro-heading">
            BOOK YOUR
            <br />
            <span className={bookingStyles.infoAccent}>PAIR.</span>
          </h2>
          <p className={bookingStyles.introCopy}>
            No payment is required to send a service booking request. We confirm
            the treatment and final price with you before work begins.
          </p>
          <div className={bookingStyles.helpBlock}>
            <p>Unsure what your shoes need? Send us a photo on WhatsApp.</p>
            <a
              className={bookingStyles.whatsappLink}
              href={publicWhatsAppUrl}
              rel="noreferrer"
              target="_blank"
            >
              WhatsApp the Doctor <ArrowUpRight />
            </a>
          </div>
        </aside>
        <BookingForm
          key={requestedService}
          services={services}
          initialServiceId={requestedService}
          whatsappUrl={publicWhatsAppUrl}
        />
      </section>

      <SiteFooter />
    </main>
  );
}
