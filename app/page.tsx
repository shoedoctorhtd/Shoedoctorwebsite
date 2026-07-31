/* eslint-disable @next/next/no-html-link-for-pages */
import BookingForm from "./components/BookingForm";
import Image from "next/image";
import SiteMotion from "./components/SiteMotion";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "./components/SiteChrome";
import { listPublicServices } from "@/lib/data";

export const dynamic = "force-dynamic";

const steps = [
  ["Choose care", "Pick the cleaning, repair or restoration your pair needs."],
  ["Send details", "Tell us the material, condition and preferred date."],
  ["We diagnose", "We confirm the treatment, turnaround and final price."],
  ["Get it back", "Self collect or choose pickup and delivery where available."],
];

const serviceHighlights = [
  {
    number: "01",
    name: "Clean",
    copy: "Exterior refresh, deep interior care, stain treatment, deodorizing, laces and sole detailing.",
    color: "blush",
  },
  {
    number: "02",
    name: "Repair",
    copy: "Minor or full stitching, half or full re-gluing, sole reinforcement and structural care.",
    color: "blue",
  },
  {
    number: "03",
    name: "Restore",
    copy: "Sole whitening, crease reduction, repainting, recolouring and a protective final finish.",
    color: "coral",
  },
];

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

      <section className="sd-home-services sd-section" data-reveal>
        <div className="sd-section-heading">
          <p className="sd-kicker">What we treat</p>
          <h2>
            EVERY PAIR GETS
            <br />
            A <span>PROPER PLAN.</span>
          </h2>
          <div>
            <p>
              We inspect the material and condition before recommending
              treatment. That means honest expectations and the right care
              instead of a one-method-fits-all wash.
            </p>
            <a href="/services">
              View the full service menu <ArrowUpRight />
            </a>
          </div>
        </div>

        <div className="sd-highlight-grid">
          {serviceHighlights.map((item) => (
            <a
              className={`sd-highlight-card ${item.color}`}
              href="/services"
              key={item.name}
            >
              <span>{item.number}</span>
              <h3>{item.name}</h3>
              <p>{item.copy}</p>
              <i>
                <ArrowUpRight />
              </i>
            </a>
          ))}
        </div>
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
          <div className="wash-stage-label">
            <span>Material-safe care</span>
            <strong>ACTIVE CLEAN</strong>
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

      <section className="booking-section sd-booking" id="book" data-reveal>
        <div className="booking-copy">
          <p className="sd-kicker">Book online</p>
          <h2>
            START THE
            <br />
            <span>COMEBACK.</span>
          </h2>
          <p>
            No payment now. Send your request and we’ll call or message after
            reviewing the service and footwear condition.
          </p>
          <div className="booking-trust">
            <span>✓ Final quote before work</span>
            <span>✓ All footwear welcome</span>
            <span>✓ Booking reference instantly</span>
            <span>✓ Self drop-off or pickup & delivery</span>
          </div>
        </div>
        <BookingForm
          key={requestedService}
          services={services}
          initialServiceId={requestedService}
        />
      </section>

      <section className="sd-home-cta" data-reveal>
        <p>Not sure what your pair needs?</p>
        <h2>LET THE DOCTOR<br />DIAGNOSE IT.</h2>
        <div>
          <a className="sd-primary-button" href="/contact">
            Contact us <ArrowUpRight />
          </a>
          <a href="https://wa.me/9779761716743">WhatsApp: 9761716743 ↗</a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
