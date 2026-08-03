/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import BookingForm from "./components/BookingForm";
import Image from "next/image";
import bookingStyles from "./components/BookingExperience.module.css";
import SiteMotion from "./components/SiteMotion";
import SteamBrushHomeSection from "./components/SteamBrushHomeSection";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "./components/SiteChrome";
import { listPublicServices } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Shoe Doctor Nepal | Steam Brush Shoe Cleaning, Repair & Restoration",
  },
  description:
    "Professional shoe cleaning in Hetauda by Shoe Doctor Nepal. Discover steam shoe cleaning in Nepal and steam-assisted sneaker cleaning alongside expert repair and restoration.",
};

const steps = [
  ["Choose care", "Pick the cleaning, repair or restoration your pair needs."],
  ["Send details", "Tell us the material, condition and preferred date."],
  ["We diagnose", "We confirm the treatment, turnaround and final price."],
  ["Get it back", "Self collect or choose pickup and delivery where available."],
];

const publicWhatsAppUrl = "https://wa.me/9779761716743";

type TreatmentGraphic = "diagnose" | "clean" | "restore";

const treatmentPlans: Array<{
  number: string;
  name: string;
  copy: string;
  keywords: string[];
  tone: TreatmentGraphic;
  ariaLabel: string;
}> = [
  {
    number: "01",
    name: "Diagnose",
    copy: "We inspect the material, construction, stains and damage before deciding the safest treatment for your pair.",
    keywords: ["Material", "Condition", "Damage", "Treatment plan"],
    tone: "diagnose",
    ariaLabel: "Learn about Shoe Doctor diagnosis",
  },
  {
    number: "02",
    name: "Clean",
    copy: "Material-specific cleaning for the upper, sole, interior, laces, stains and odour—with steam-assisted care where suitable.",
    keywords: ["Surface", "Interior", "Stains", "Deodorizing"],
    tone: "clean",
    ariaLabel: "Learn about shoe cleaning",
  },
  {
    number: "03",
    name: "Restore",
    copy: "Repair, re-gluing, stitching, sole care, whitening, crease reduction and colour restoration to extend the life of your pair.",
    keywords: ["Repair", "Recolour", "Reshape", "Protect"],
    tone: "restore",
    ariaLabel: "Learn about shoe restoration",
  },
];

function TreatmentPlanGraphic({ type }: { type: TreatmentGraphic }) {
  if (type === "diagnose") {
    return (
      <svg
        aria-hidden="true"
        className="sd-treatment-plan__graphic sd-treatment-plan__graphic--diagnose"
        fill="none"
        focusable="false"
        viewBox="0 0 240 150"
      >
        <path
          className="sd-treatment-plan__graphic-shoe"
          d="M24 103c14-3 26-10 37-23l18-29 24 18c13 10 29 17 48 22l28 7c11 3 17 9 17 18H24v-13Z"
        />
        <path
          className="sd-treatment-plan__graphic-sole"
          d="M24 116h172c7 0 12 5 12 10H24v-10Z"
        />
        <path
          className="sd-treatment-plan__graphic-scan"
          d="M42 44h68M37 61h74M118 40v42"
        />
        <circle className="sd-treatment-plan__graphic-lens" cx="153" cy="55" r="23" />
        <path className="sd-treatment-plan__graphic-handle" d="m170 72 25 25" />
        <circle className="sd-treatment-plan__graphic-marker" cx="98" cy="91" r="4" />
      </svg>
    );
  }

  if (type === "clean") {
    return (
      <svg
        aria-hidden="true"
        className="sd-treatment-plan__graphic sd-treatment-plan__graphic--clean"
        fill="none"
        focusable="false"
        viewBox="0 0 240 150"
      >
        <path
          className="sd-treatment-plan__graphic-shoe"
          d="M24 103c14-3 26-10 37-23l18-29 24 18c13 10 29 17 48 22l28 7c11 3 17 9 17 18H24v-13Z"
        />
        <path
          className="sd-treatment-plan__graphic-sole"
          d="M24 116h172c7 0 12 5 12 10H24v-10Z"
        />
        <path className="sd-treatment-plan__graphic-sweep" d="M31 82c41-30 85-32 149-2" />
        <path className="sd-treatment-plan__graphic-steam" d="M53 39c-7 9-7 18 0 27M70 30c-7 10-7 20 0 31M88 37c-6 9-6 17 0 25" />
        <path className="sd-treatment-plan__graphic-brush" d="M160 46l23 26m-16-34 24 26m-7-34 22 25" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="sd-treatment-plan__graphic sd-treatment-plan__graphic--restore"
      fill="none"
      focusable="false"
      viewBox="0 0 240 150"
    >
      <path
        className="sd-treatment-plan__graphic-shoe"
        d="M24 103c14-3 26-10 37-23l18-29 24 18c13 10 29 17 48 22l28 7c11 3 17 9 17 18H24v-13Z"
      />
      <path
        className="sd-treatment-plan__graphic-sole"
        d="M24 116h172c7 0 12 5 12 10H24v-10Z"
      />
      <path className="sd-treatment-plan__graphic-split" d="M117 47v68" />
      <path className="sd-treatment-plan__graphic-stitch" d="M129 72c14 4 29 3 43-3" />
      <path className="sd-treatment-plan__graphic-repair" d="M148 96c18-3 29-10 39-22" />
      <path className="sd-treatment-plan__graphic-shine" d="m76 50 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" />
    </svg>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const [services, params] = await Promise.all([
    listPublicServices(),
    searchParams,
  ]);
  const requestedService = services.some(
    (service) => service.id === params.service,
  )
    ? params.service
    : services[0]?.id;

  return (
    <main className="public-site">
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
          <div className="sd-hero-shoe-wrap">
            <Image
              className="sd-hero-shoe"
              src="/hero-cleaning-sneaker.png"
              alt="A clean, restored white and navy high-top sneaker"
              width={1536}
              height={1024}
              priority
              unoptimized
              sizes="(max-width: 880px) 100vw, 55vw"
            />
            <Image
              className="sd-hero-dirty-shoe"
              src="/hero-cleaning-sneaker-dirty.png"
              alt=""
              aria-hidden="true"
              width={1536}
              height={1024}
              priority
              unoptimized
              sizes="(max-width: 880px) 100vw, 55vw"
            />
            <span className="sd-hero-dirt-overlay" aria-hidden="true" />
            <span className="sd-hero-foam-lather" aria-hidden="true" />
            <span className="sd-hero-clean-shine" aria-hidden="true" />
          </div>
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

      <section className="sd-marquee" aria-label="Featured prices">
        <div>
          <span>BASIC CLEAN · RS 299</span>
          <i>✦</i>
          <span>DEEP CLEAN · RS 399</span>
          <i>✦</i>
          <span>UV Sterilization · RS 149</span>
          <i>✦</i>
          <span>EXPRESS · RS 149</span>
          <i>✦</i>
          <span>NEPALI BRANDS SAVE RS 50</span>
          <i>✦</i>
          <span>RESTORATION · FROM RS 1,299</span>
          <i>✦</i>
          <span>BASIC CLEAN · RS 299</span>
          <i>✦</i>
          <span>DEEP CLEAN · RS 399</span>
          <i>✦</i>
          <span>UV Sterilization · RS 149</span>
          <i>✦</i>
          <span>EXPRESS · RS 149</span>
          <i>✦</i>
          <span>NEPALI BRANDS SAVE RS 50</span>
          <i>✦</i>
          <span>RESTORATION · FROM RS 1,299</span>
          <i>✦</i>
        </div>
      </section>

      <SteamBrushHomeSection />

      <section
        aria-labelledby="treatment-plan-heading"
        className="sd-home-services sd-section"
        data-reveal
        id="what-we-treat"
      >
        <div className="sd-treatment-plan__heading">
          <p className="sd-kicker sd-treatment-plan__kicker">What we treat</p>
          <h2 id="treatment-plan-heading">
            <span className="sd-treatment-plan__headline-strong">
              EVERY PAIR GETS
            </span>
            <span className="sd-treatment-plan__headline-accent">
              A PROPER PLAN.
            </span>
          </h2>
          <div className="sd-treatment-plan__supporting-copy">
            <p>
              We inspect the material, condition and damage before recommending
              treatment. That means honest expectations and the right care
              instead of a one-method-fits-all wash.
            </p>
            <a href="/services">
              View our services <ArrowUpRight />
            </a>
          </div>
        </div>

        <div className="sd-treatment-plan__process">
          <span className="sd-treatment-plan__process-line" aria-hidden="true" />
          <ol className="sd-treatment-plan__cards" aria-label="Treatment process">
            {treatmentPlans.map((item) => (
              <li key={item.name}>
                <a
                  aria-label={item.ariaLabel}
                  className={`sd-treatment-plan__card sd-treatment-plan__card--${item.tone}`}
                  href="/services"
                >
                  <span className="sd-treatment-plan__card-number">
                    {item.number}
                  </span>
                  <TreatmentPlanGraphic type={item.tone} />
                  <div className="sd-treatment-plan__card-copy">
                    <h3>{item.name}</h3>
                    <p>{item.copy}</p>
                  </div>
                  <ul aria-label={`${item.name} treatment focus`}>
                    {item.keywords.map((keyword) => (
                      <li key={keyword}>{keyword}</li>
                    ))}
                  </ul>
                  <span className="sd-treatment-plan__card-arrow" aria-hidden="true">
                    <ArrowUpRight />
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>

        <p className="sd-treatment-plan__promise">
          WE DIAGNOSE. WE CLEAN. WE RESTORE.
        </p>
      </section>

      <section className="sd-wash-lab sd-section" data-reveal>
        <div className="sd-wash-copy">
          <p className="sd-kicker">Inside the wash lab</p>
          <h2>
            SCRUB. RINSE.
            <br />
            <span>REVIVE.</span>
          </h2>
          <p>
            Deep care is more than soap and water. We use material-safe
            treatment, controlled brushing and careful drying to clean the pair
            without damaging its shape, colour or construction.
          </p>
          <a href="/services">
            See cleaning treatments <ArrowUpRight />
          </a>
        </div>

        <div
          className="sd-wash-stage"
          role="img"
          aria-label="Animated basketball sneaker being carefully scrubbed with foam"
        >
          <div className="wash-water-ring ring-one" />
          <div className="wash-water-ring ring-two" />
          <div className="wash-splash splash-one">✦</div>
          <div className="wash-splash splash-two">✦</div>
          <div className="wash-foam" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <Image
            className="wash-shoe"
            src="/loader-basketball-sneaker.png"
            alt=""
            width={1536}
            height={1024}
            unoptimized
            sizes="(max-width: 760px) 92vw, 52vw"
          />
          <div className="wash-brush" aria-hidden="true">
            <span className="brush-handle" />
            <span className="brush-head">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>

        </div>
      </section>

      <section className="sd-local-banner" data-reveal>
        <div>
          <span>Made-in-Nepal footwear gets special care</span>
          <h2>WEAR LOCAL.<br />SAVE LOCAL.</h2>
        </div>
        <p>
          Get Rs 50 off Basic Clean, Deep Clean and Premium Care for verified
          Nepali-brand footwear.
        </p>
        <a href="/#book">
          Claim your local-brand price <ArrowUpRight />
        </a>
      </section>

      <section className="sd-process sd-section" data-reveal>
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
        id="book"
      >
        <aside className={bookingStyles.infoPanel} data-reveal>
          <p className={bookingStyles.introKicker}>Booking your pair</p>
          <h2 className={bookingStyles.infoTitle} id="booking-intro-heading">
            START THE
            <br />
            <span className={bookingStyles.infoAccent}>COMEBACK.</span>
          </h2>
          <p className={bookingStyles.introCopy}>
            Book your shoe cleaning, repair or restoration in less than two
            minutes.
          </p>

          <ol className={bookingStyles.processList}>
            <li className={bookingStyles.processItem}>
              <span className={bookingStyles.processNumber}>01</span>
              <div className={bookingStyles.processContent}>
                <strong>Send Your Request</strong>
                <p>Tell us about your pair and choose the service you need.</p>
              </div>
            </li>
            <li className={bookingStyles.processItem}>
              <span className={bookingStyles.processNumber}>02</span>
              <div className={bookingStyles.processContent}>
                <strong>We Diagnose</strong>
                <p>We inspect the material, condition and required treatment.</p>
              </div>
            </li>
            <li className={bookingStyles.processItem}>
              <span className={bookingStyles.processNumber}>03</span>
              <div className={bookingStyles.processContent}>
                <strong>We Confirm</strong>
                <p>
                  You receive the final treatment, price and timing before work
                  begins.
                </p>
              </div>
            </li>
            <li className={bookingStyles.processItem}>
              <span className={bookingStyles.processNumber}>04</span>
              <div className={bookingStyles.processContent}>
                <strong>We Restore</strong>
                <p>
                  Your pair is cleaned, repaired or restored and returned as
                  selected.
                </p>
              </div>
            </li>
          </ol>

          <ul className={bookingStyles.trustList}>
            <li>No payment required now</li>
            <li>Final price confirmed before work</li>
            <li>All footwear types welcome</li>
            <li>Booking reference provided instantly</li>
          </ul>

          <div className={bookingStyles.helpBlock}>
            <span>Need help choosing a service?</span>
            <a
              className={bookingStyles.whatsappLink}
              href={publicWhatsAppUrl}
              rel="noreferrer"
              target="_blank"
            >
              WhatsApp the Doctor <span aria-hidden="true">↗</span>
            </a>
          </div>

          <svg
            aria-hidden="true"
            className={bookingStyles.shoeArt}
            fill="none"
            focusable="false"
            viewBox="0 0 360 210"
          >
            <path d="M38 151c29-7 54-25 76-55l30-42 38 31c21 17 48 29 82 35l40 8c14 3 25 13 25 28H38v-5Z" />
            <path d="M38 156h261c13 0 23 9 23 20H38v-20Z" />
            <path d="M110 92c25 5 47 17 64 35M137 77c27 7 49 20 67 40M202 116l34-43M220 126l43-31" />
            <path d="M76 177h225M102 188h173" />
          </svg>
        </aside>
        <BookingForm
          key={requestedService}
          services={services}
          initialServiceId={requestedService}
          whatsappUrl={publicWhatsAppUrl}
        />
      </section>

      <section className="sd-home-cta" data-reveal>
        <p>Not sure what your pair needs?</p>
        <h2>LET THE DOCTOR<br />DIAGNOSE IT.</h2>
        <div>
          <a className="sd-primary-button" href="/contact">
            Contact us <ArrowUpRight />
          </a>
          <a href={publicWhatsAppUrl}>WhatsApp: 9761716743 ↗</a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
