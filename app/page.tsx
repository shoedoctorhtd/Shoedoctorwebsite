/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import BookingForm from "./components/BookingForm";
import HomeCareEssentials from "./components/HomeCareEssentials";
import bookingStyles from "./components/BookingExperience.module.css";
import HeroCleaningVisual from "./components/HeroCleaningVisual";
import SiteMotion from "./components/SiteMotion";
import SteamBrushHomeSection from "./components/SteamBrushHomeSection";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "./components/SiteChrome";
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

const steps = [
  ["Choose care", "Pick the cleaning, repair or restoration your pair needs."],
  ["Send details", "Tell us the material, condition and preferred date."],
  ["We diagnose", "We confirm the treatment, turnaround and final price."],
  ["Get it back", "Self collect or choose pickup and delivery where available."],
];

type CompactServiceGroup = {
  id: "clean" | "repair" | "restore";
  title: string;
  copy: string;
  matches: (service: Service) => boolean;
};

const restorationServicePattern =
  /restor|repaint|recolour|recolor|whiten|colour|color/i;

const compactServiceGroups: CompactServiceGroup[] = [
  {
    id: "clean",
    title: "CLEAN",
    copy: "Routine refreshes, detailed cleaning and steam care when suitable.",
    matches: (service) =>
      service.category === "Cleaning" &&
      !restorationServicePattern.test(service.name),
  },
  {
    id: "repair",
    title: "REPAIR",
    copy: "Stitching, re-gluing and structural work for pairs that need support.",
    matches: (service) =>
      service.category === "Repairs" &&
      !restorationServicePattern.test(service.name),
  },
  {
    id: "restore",
    title: "RESTORE",
    copy: "Whitening, colour work and full restoration to bring a pair back.",
    matches: (service) => restorationServicePattern.test(service.name),
  },
];

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
  const serviceGroups = compactServiceGroups.map((group) => ({
    ...group,
    services: services
      .filter((service) => group.matches(service))
      .sort(
        (left, right) =>
          Number(right.id === STEAM_ASSISTED_DEEP_CLEAN_ID) -
          Number(left.id === STEAM_ASSISTED_DEEP_CLEAN_ID),
      )
      .slice(0, 4)
  }));
  const publicWhatsAppUrl = "https://wa.me/9779761716743";

  return (
    <main id="main-content" className="public-site">
      <SiteMotion showLoader />
      <SiteHeader />

      <section className="sd-hero" id="top">
        <div className="sd-hero-copy">
          <p className="sd-eyebrow">
            <span />
            Care for every step
          </p>
          <h1>
            YOUR PAIR,
            <span>
              BACK TO <em>LIFE.</em>
            </span>
          </h1>
          <p className="sd-hero-intro">
            Professional cleaning, repair and restoration for the shoes that
            carry your story.
          </p>
          <div className="sd-hero-actions">
            <a className="sd-primary-button" href="/#book">
              Book your pair <ArrowUpRight />
            </a>
            <a className="sd-play-link" href="/services">
              <i>→</i>
              Explore every service
            </a>
          </div>
        </div>

        <div className="sd-hero-visual" data-tilt>
          <div className="sd-hero-glow" />
          <div className="sd-orbit sd-orbit-one">
            <span className="sd-orbit-label orbit-label-diagnose">
              DIAGNOSE
            </span>
          </div>
          <div className="sd-orbit sd-orbit-two">
            <span className="sd-orbit-label orbit-label-clean">CLEAN</span>
          </div>
          <div className="sd-orbit sd-orbit-three">
            <span className="sd-orbit-label orbit-label-restore">RESTORE</span>
          </div>
          <HeroCleaningVisual />
          <div className="hero-cleaning-foam" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="hero-foam-cluster" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="hero-clean-sparkles" aria-hidden="true">
            <span>✦</span>
            <span>✦</span>
            <span>✦</span>
          </div>
          <div className="hero-cleaning-brush" aria-hidden="true">
            <span className="hero-brush-wood">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="hero-foam-bottle" aria-hidden="true">
            <span className="hero-foam-bottle__pump" />
            <span className="hero-foam-bottle__neck" />
            <span className="hero-foam-bottle__body" />
          </div>
          <div className="hero-foam-spray" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="hero-microfibre-towel" aria-hidden="true">
            <span />
          </div>
          <div className="sd-hero-stat">
            <strong>2–3 hrs</strong>
            <span>Express wash & dry</span>
          </div>
        </div>

        <div className="sd-hero-edge-copy" aria-hidden="true">
          WE DIAGNOSE · WE CLEAN · WE RESTORE ·
        </div>
      </section>

      <HomeCareEssentials products={homepageProducts} />

      <section
        aria-labelledby="treatment-plan-heading"
        className="sd-home-services sd-home-services--compact sd-section"
        data-reveal
        id="what-we-treat"
      >
        <div className="sd-treatment-plan__heading sd-treatment-plan__heading--compact">
          <p className="sd-kicker sd-treatment-plan__kicker">Care options</p>
          <h2 id="treatment-plan-heading">
            <span className="sd-treatment-plan__headline-strong">
              WHAT DOES YOUR
            </span>
            <span className="sd-treatment-plan__headline-accent">
              PAIR NEED?
            </span>
          </h2>
          <div className="sd-treatment-plan__supporting-copy">
            <p>
              Cleaning, repair and restoration matched to your pair after
              inspection.
            </p>
            <a href="/services">
              View all services <ArrowUpRight />
            </a>
          </div>
        </div>

        <ol className="sd-treatment-plan__cards" aria-label="Shoe Doctor services">
          {serviceGroups.map((group, index) => (
            <li key={group.id}>
              <a
                aria-label={`View ${group.title.toLowerCase()} services`}
                className={`sd-treatment-plan__card sd-treatment-plan__card--${group.id}`}
                href="/services"
              >
                <span className="sd-treatment-plan__card-number">
                  0{index + 1}
                </span>
                <div className="sd-treatment-plan__card-copy">
                  <h3>{group.title}</h3>
                  <p>{group.copy}</p>
                </div>
                {group.services.length ? (
                  <ul aria-label={`${group.title} services`}>
                    {group.services.map((service) => (
                      <li key={service.id}>
                        {service.name}
                        {service.id === STEAM_ASSISTED_DEEP_CLEAN_ID ? (
                          <span className="sd-service-new">NEW</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <span className="sd-treatment-plan__card-arrow" aria-hidden="true">
                  <ArrowUpRight />
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <SteamBrushHomeSection compact />

      <section className="sd-process sd-process--compact sd-section" data-reveal>
        <div className="sd-process-title">
          <p className="sd-kicker">Simple from start to finish</p>
          <h2>
            FOUR STEPS.
            <br />
            <span>ONE FRESH PAIR.</span>
          </h2>
        </div>
        <div className="sd-step-list">
          {steps.map(([name, description], index) => (
            <article key={name}>
              <span>0{index + 1}</span>
              <div>
                <h3>{name}</h3>
                <p>{description}</p>
              </div>
              <i>↘</i>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="booking-intro-heading"
        className={bookingStyles.bookingSection}
      >
        <aside className={bookingStyles.infoPanel} data-reveal>
          <p className={bookingStyles.introKicker}>Booking your pair</p>
          <h2 className={bookingStyles.infoTitle} id="booking-intro-heading">
            START THE
            <br />
            <span className={bookingStyles.infoAccent}>COMEBACK.</span>
          </h2>
          <p className={bookingStyles.introCopy}>
            No payment now. Send your request and we&apos;ll call or message after
            reviewing the service and footwear condition.
          </p>

          <ul className={bookingStyles.trustList}>
            <li>No payment required now</li>
            <li>Final price confirmed before work</li>
            <li>All footwear types welcome</li>
            <li>Booking reference provided instantly</li>
          </ul>
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
