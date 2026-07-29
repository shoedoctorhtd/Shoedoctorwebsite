import type { Metadata } from "next";
import Image from "next/image";
import DonationForm from "../components/DonationForm";
import DonationImpactStats from "../components/DonationImpactStats";
import SiteMotion from "../components/SiteMotion";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "../components/SiteChrome";

export const metadata: Metadata = {
  title: { absolute: "Shoe Donation Program | Shoe Doctor Hetauda" },
  description:
    "Donate wearable shoes through Shoe Doctor. We clean, restore and help pass footwear forward in Hetauda, Nepal.",
};

const journeySteps = [
  {
    number: "01",
    title: "Donate",
    description:
      "Drop off clean, wearable shoes at Shoe Doctor or contact us for collection support.",
  },
  {
    number: "02",
    title: "Diagnose & Restore",
    description:
      "Our team checks every pair, then cleans, repairs, sanitizes, and restores what we can.",
  },
  {
    number: "03",
    title: "Share",
    description:
      "Restored shoes move through verified community partners, schools, charities, and local initiatives.",
  },
  {
    number: "04",
    title: "Impact",
    description:
      "We will share transparent updates about collections, restoration work, and donation drives.",
  },
];

function ShoeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 38"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 27.5c7.8 0 13.4-4.2 18-13.7l4.1-8.3c.7-1.5 2.5-2.1 4-1.4l7.4 3.5c1.7.8 2.4 2.8 1.5 4.4l-2.4 4.8c4.4 3 9.6 5.1 15.7 6.1 3.4.6 5.7 3.8 5.1 7.2l-.2 1.3H5v-3.9Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 30.7h32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m29 12 6.6 3.2M26.3 17.4l6.6 3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ShoeDonationPage() {
  return (
    <main className="public-site inner-site donation-site">
      <SiteMotion showLoader={false} />
      <SiteHeader />

      <section className="donation-hero" aria-labelledby="donation-hero-title">
        <div className="donation-hero__media" aria-hidden="true">
          <Image
            src="/shoe-donation-hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            unoptimized
          />
        </div>
        <div className="donation-hero__wash" aria-hidden="true" />
        <ShoeIcon className="donation-floating-shoe donation-floating-shoe--one" />
        <ShoeIcon className="donation-floating-shoe donation-floating-shoe--two" />
        <div className="donation-hero__content">
          <p className="donation-kicker">Shoe Doctor Donation Program</p>
          <h1 id="donation-hero-title">
            Every Pair Deserves <span>Another Journey.</span>
          </h1>
          <p className="donation-hero__intro">
            Your old shoes can become a fresh start. We clean, restore, and
            pass wearable footwear forward with care in Hetauda.
          </p>
          <div className="donation-hero__actions">
            <a className="donation-button donation-button--primary" href="#donation-form">
              Donate Shoes <ArrowUpRight />
            </a>
            <a className="donation-button donation-button--secondary" href="#partner-with-us">
              Partner With Us <ArrowUpRight />
            </a>
          </div>
          <p className="donation-trust-line">
            <span aria-hidden="true">&#10022;</span>
            Donate wearable shoes. We clean, restore, and pass them forward
            with dignity.
          </p>
        </div>
      </section>

      <section className="donation-manifesto donation-section" data-reveal>
        <p className="donation-kicker">A second journey starts here</p>
        <div>
          <h2>Your old shoes can be someone&apos;s new beginning.</h2>
          <p>
            What may no longer have a place in your wardrobe could become a
            valuable pair for someone else. Donate wearable shoes to Shoe
            Doctor—we&apos;ll clean, restore, and help them reach people who can
            truly use them.
          </p>
        </div>
      </section>

      <section className="donation-process donation-section" aria-labelledby="how-it-works-title">
        <div className="donation-section-heading" data-reveal>
          <div>
            <p className="donation-kicker">How it works</p>
            <h2 id="how-it-works-title">Your old shoes can carry a new story.</h2>
          </div>
          <p>
            From your hands to our workshop to the community, each pair follows
            a thoughtful route.
          </p>
        </div>

        <div className="donation-journey">
          <svg className="donation-journey__route" viewBox="0 0 1200 110" preserveAspectRatio="none" aria-hidden="true">
            <path d="M18 58C158 7 273 104 403 54s251-49 382 1 238 48 397-12" />
          </svg>
          <ol>
            {journeySteps.map((step) => (
              <li data-reveal key={step.number}>
                <span className="donation-journey__number">{step.number}</span>
                <ShoeIcon className="donation-journey__shoe" />
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="donation-acceptance donation-section" aria-labelledby="acceptance-title">
        <div className="donation-section-heading" data-reveal>
          <div>
            <p className="donation-kicker">What shoes can be donated?</p>
            <h2 id="acceptance-title">A little care makes a lot possible.</h2>
          </div>
          <p>
            We welcome footwear that is safe to handle and has another useful
            journey ahead.
          </p>
        </div>
        <div className="donation-acceptance__grid">
          <article className="donation-acceptance-card donation-acceptance-card--yes" data-reveal>
            <span className="donation-card-icon" aria-hidden="true">&#10003;</span>
            <p className="donation-kicker">What we can accept</p>
            <h3>Wearable pairs with life left in them.</h3>
            <ul>
              <li>Sneakers, school shoes, sandals, slippers, boots, and sports shoes</li>
              <li>Children&apos;s, women&apos;s, and men&apos;s footwear</li>
              <li>Pairs with minor damage Shoe Doctor can restore</li>
              <li>Clean and dry footwear with usable soles</li>
            </ul>
          </article>
          <article className="donation-acceptance-card donation-acceptance-card--no" data-reveal>
            <span className="donation-card-icon" aria-hidden="true">!</span>
            <p className="donation-kicker">Please do not donate</p>
            <h3>Safety and dignity come first.</h3>
            <p>
              Please do not donate shoes with severe fungus, strong odor,
              broken soles beyond repair, sharp objects, or unsafe material.
            </p>
            <p className="donation-card-note">
              If you&apos;re unsure, message us first—we&apos;ll help you decide.
            </p>
          </article>
        </div>
      </section>

      <section className="donation-impact donation-section" aria-labelledby="impact-title">
        <div className="donation-impact__copy" data-reveal>
          <p className="donation-kicker">Impact section</p>
          <h2 id="impact-title">A small pair can make a big difference.</h2>
          <p>
            Instead of throwing away footwear that still has life left, help us
            give it a second purpose. A donated pair can support a student on
            the way to school, a worker travelling every day, or a family
            rebuilding after hardship.
          </p>
          <span className="donation-impact__promise">
            We&apos;ll share genuine figures after our first donation drive.
          </span>
        </div>
        <DonationImpactStats />
      </section>

      <section className="donation-form-section donation-section" id="donation-form" aria-labelledby="donation-form-title">
        <div className="donation-form-section__aside" data-reveal>
          <p className="donation-kicker">Give a pair its next chapter</p>
          <h2 id="donation-form-title">Donate shoes with dignity.</h2>
          <p>
            Tell us about your footwear. We&apos;ll guide you to a simple drop-off
            or confirm whether pickup support is available in your area.
          </p>
          <div className="donation-form-section__steps" aria-label="Donation request steps">
            <span>1. Tell us about the pair</span>
            <span>2. Choose drop-off or pickup</span>
            <span>3. We&apos;ll contact you soon</span>
          </div>
        </div>
        <div data-reveal>
          <DonationForm />
        </div>
      </section>

      <section className="donation-partners donation-section" id="partner-with-us" aria-labelledby="partner-title">
        <div className="donation-partners__art" aria-hidden="true">
          <div className="donation-partners__circle donation-partners__circle--one" />
          <div className="donation-partners__circle donation-partners__circle--two" />
          <ShoeIcon className="donation-partners__shoe" />
        </div>
        <div data-reveal>
          <p className="donation-kicker">Partner / NGO section</p>
          <h2 id="partner-title">Let&apos;s create impact together.</h2>
          <p>
            Are you a school, NGO, community group, youth club, or social
            organization working with people who need footwear? Partner with
            Shoe Doctor to organize a Shoe Donation Drive.
          </p>
          <a
            className="donation-button donation-button--secondary"
            href="mailto:shoedoctorhtd@gmail.com?subject=Community%20Partner%20Inquiry"
          >
            Become a Community Partner <ArrowUpRight />
          </a>
        </div>
      </section>

      <section className="donation-final-cta" aria-labelledby="donation-final-title">
        <p className="donation-kicker">Pass it forward</p>
        <h2 id="donation-final-title">Don&apos;t throw away a good pair. Pass it forward.</h2>
        <p>One pair may be old to you, but it can be a fresh start for someone else.</p>
        <a className="donation-button donation-button--primary" href="#donation-form">
          Donate Shoes Today <ArrowUpRight />
        </a>
      </section>

      <SiteFooter />
    </main>
  );
}
