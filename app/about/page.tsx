/* eslint-disable @next/next/no-html-link-for-pages */
import Image from "next/image";
import BeforeAfterComparison from "../components/BeforeAfterComparison";
import SiteMotion from "../components/SiteMotion";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "../components/SiteChrome";

export const dynamic = "force-dynamic";

type AboutIconName =
  | "observe"
  | "risk"
  | "opportunity"
  | "clean"
  | "materials"
  | "repair"
  | "steam"
  | "express"
  | "delivery";

const problemTimeline = [
  {
    number: "01",
    label: "What we noticed",
    title: "People Valued Their Shoes, but Proper Care Was Missing.",
    description:
      "People invest in shoes they love, yet professional footwear care is still difficult to access outside major cities.",
    icon: "observe",
  },
  {
    number: "02",
    label: "What was going wrong",
    title: "The Wrong Treatment Can Ruin a Good Pair.",
    description:
      "Incorrect products and one-method-fits-all cleaning can damage colour, glue, shape and delicate materials.",
    icon: "risk",
  },
  {
    number: "03",
    label: "The opportunity",
    title: "Hetauda Needed Better Shoe Care.",
    description:
      "There was space for a service that understood different footwear materials and could clean, repair and restore every pair professionally.",
    icon: "opportunity",
  },
] as const;

const services = [
  {
    title: "Professional Cleaning",
    description: "A considered reset for dirt, stains and everyday wear.",
    icon: "clean",
  },
  {
    title: "Deep and Material-Specific Care",
    description: "Tools and products selected for the pair in front of us.",
    icon: "materials",
  },
  {
    title: "Repair and Restoration",
    description: "Thoughtful repairs that respect the character of the shoe.",
    icon: "repair",
  },
  {
    title: "Steam-Assisted Cleaning",
    description: "Targeted steam care for stubborn surface grime.",
    icon: "steam",
  },
  {
    title: "Express Wash and Dry",
    description: "A faster refresh when the next journey cannot wait.",
    icon: "express",
  },
  {
    title: "Pickup and Return Delivery",
    description: "Convenient handover from collection through return.",
    icon: "delivery",
  },
] as const;

const standards = [
  {
    number: "01",
    title: "Diagnosis First",
    description:
      "We inspect the material, condition and damage before deciding how the pair should be treated.",
  },
  {
    number: "02",
    title: "Honest Expectations",
    description:
      "We explain what can improve, what may remain and what the service will cost before beginning the work.",
  },
  {
    number: "03",
    title: "Material-Specific Care",
    description:
      "Leather, suede, mesh, canvas and synthetic materials require different products, tools and techniques.",
  },
  {
    number: "04",
    title: "Wear More, Waste Less",
    description:
      "Cleaning and restoring a worthy pair can extend its life and reduce unnecessary replacement.",
  },
] as const;

const journeyAhead = [
  {
    number: "01",
    title: "The Beginning",
    description:
      "Returned to Hetauda with the decision to build a meaningful local business.",
  },
  {
    number: "02",
    title: "The Foundation",
    description:
      "Created a professional shoe-cleaning, repair and restoration service.",
  },
  {
    number: "03",
    title: "The Growth",
    description:
      "Expand pickup, delivery, restoration and shoe-donation services.",
  },
  {
    number: "04",
    title: "The Vision",
    description:
      "Make reliable professional footwear care accessible across Nepal.",
  },
] as const;

function AboutIcon({ name }: { name: AboutIconName }) {
  if (name === "observe") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M3.5 12s3.1-5.2 8.5-5.2 8.5 5.2 8.5 5.2-3.1 5.2-8.5 5.2S3.5 12 3.5 12Z" />
        <circle cx="12" cy="12" r="2.1" />
      </svg>
    );
  }

  if (name === "risk") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="m12 3.5 8.8 15.3H3.2L12 3.5Z" />
        <path d="M12 9v4.5M12 16.5v.1" />
      </svg>
    );
  }

  if (name === "opportunity") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="m12 3.5 1.5 4.9 4.9 1.5-4.9 1.5-1.5 4.9-1.5-4.9-4.9-1.5 4.9-1.5L12 3.5Z" />
        <path d="m18.1 15 .7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7.7-2.2Z" />
      </svg>
    );
  }

  if (name === "clean") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M7.5 4.5c2.2 2.7 3.3 4.7 3.3 6.1A3.3 3.3 0 0 1 7.5 14a3.3 3.3 0 0 1-3.3-3.4c0-1.4 1.1-3.4 3.3-6.1Z" />
        <path d="M16.8 9.2c2 2.4 3 4.2 3 5.5a3 3 0 1 1-6 0c0-1.3 1-3.1 3-5.5ZM4 19.5h16" />
      </svg>
    );
  }

  if (name === "materials") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="m12 3.5 8 4.2-8 4.2-8-4.2 8-4.2Z" />
        <path d="m4 12 8 4.2 8-4.2M4 16.2l8 4.3 8-4.3" />
      </svg>
    );
  }

  if (name === "repair") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="m5 18 13-13M8.2 6.2 9.8 7.8M11.2 9.2l1.6 1.6M14.2 12.2l1.6 1.6M17.2 15.2l1.6 1.6" />
        <path d="M4 20h6M14 4h6" />
      </svg>
    );
  }

  if (name === "steam") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M6.5 19.5h11M8 16c0-1.9 2.2-2.1 2.2-4.2S8 9.5 8 7.5M13 16c0-1.9 2.2-2.1 2.2-4.2S13 9.5 13 7.5M18 16c0-1.9 2.2-2.1 2.2-4.2S18 9.5 18 7.5" />
      </svg>
    );
  }

  if (name === "express") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M4 12h14M13 7l5 5-5 5M4 6h5M4 18h7" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M3.5 7.5h11v8h-11v-8ZM14.5 10h3.1l2.9 3v2.5h-6V10Z" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </svg>
  );
}

function ShoeLineArt() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 340 150">
      <path d="M36 93c31-3 55-16 76-38l24-26c14 20 34 38 61 45l49 12c18 5 34 18 40 37H40c-12 0-18-10-14-20 2-5 5-9 10-10Z" />
      <path d="M75 92h132" />
      <path d="m151 52-24 22M172 60l-24 22M194 67l-24 22" />
      <path d="M80 112c58 4 132-1 200-13" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <main className="public-site inner-site about-page">
      <SiteMotion />
      <SiteHeader />

      <section className="about-page-hero" aria-labelledby="about-page-title">
        <div className="about-page-hero-copy" data-reveal>
          <p className="about-page-hero-label">Master degree graduated</p>
          <h1 id="about-page-title">
            <span className="about-page-hero-engineer">Computer Engineer.</span>
            <span className="about-page-hero-job">Safe 9-to-5 Job</span>
            <span className="about-page-hero-question">
              Why left everything for <em>Shoes?</em>
            </span>
          </h1>
          <p className="about-page-hero-summary">
            A secure career, years of education and one difficult decision&mdash;to
            return to Hetauda and build something of my own.
          </p>
          <a className="about-page-scroll-cue" href="#founder-story">
            <span aria-hidden="true" />
            Meet the founder
          </a>
        </div>

        <div className="about-page-hero-visual" data-reveal aria-hidden="true">
          <span className="about-page-hero-stamp">Hetauda, Nepal</span>
          <span className="about-page-hero-orbit about-page-hero-orbit--one" />
          <span className="about-page-hero-orbit about-page-hero-orbit--two" />
          <div className="about-page-hero-shoe">
            <Image
              alt=""
              height={854}
              priority
              sizes="(max-width: 1024px) 86vw, 46vw"
              src="/sneaker-cleaning-clean.webp"
              width={1280}
            />
          </div>
          <div className="about-page-hero-line-art">
            <ShoeLineArt />
          </div>
          <p>Built with care, not guesswork.</p>
        </div>
      </section>

      <section
        className="about-founder about-page-section"
        id="founder-story"
        aria-labelledby="founder-story-title"
      >
        <div className="about-founder-copy" data-reveal>
          <p className="sd-kicker">The founder story</p>
          <h2 id="founder-story-title">
            I Chose the <span>Other Direction.</span>
          </h2>
          <p>
            While many people were leaving Hetauda for Kathmandu or abroad, I
            chose to come home. After completing my Master&apos;s degree in
            Computer Engineering and spending around two years in a corporate
            9-to-5 job, life felt secure&mdash;but I knew I wanted to build
            something of my own.
          </p>
          <p>
            One question kept returning: should I take the risk now, or spend
            the future wondering what might have happened? I returned to
            Hetauda, invested my savings, accepted the uncertainty and began
            building Shoe Doctor.
          </p>
          <blockquote>
            <span aria-hidden="true">&ldquo;</span>
            <p>
              I did not leave a secure career because it was easy. I left
              because building something meaningful in my hometown mattered
              more.<span aria-hidden="true">&rdquo;</span>
            </p>
          </blockquote>
        </div>

        <aside
          className="about-founder-visual"
          data-reveal
          aria-label="The move from engineering to building Shoe Doctor"
        >
          <div className="about-founder-visual-top">
            <span>One direction</span>
            <strong>Hetauda</strong>
          </div>
          <ol className="about-founder-direction">
            <li>
              <span>01</span>
              <div>
                <strong>Learn</strong>
                <p>Computer engineering.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Work</strong>
                <p>A secure corporate role.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Return</strong>
                <p>Home with a question.</p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <strong>Build</strong>
                <p>A new kind of shoe care.</p>
              </div>
            </li>
          </ol>
          <div className="about-founder-line-art" aria-hidden="true">
            <ShoeLineArt />
          </div>
        </aside>
      </section>

      <section className="about-problem about-page-section" aria-labelledby="problem-title">
        <header className="about-section-heading" data-reveal>
          <p className="sd-kicker">Why Shoe Doctor?</p>
          <h2 id="problem-title">
            The Idea Started <span>With a Problem.</span>
          </h2>
          <p>
            A growing love for good footwear revealed a care gap that deserved
            better than one-size-fits-all cleaning.
          </p>
        </header>

        <ol className="about-problem-timeline" data-reveal>
          {problemTimeline.map((step) => (
            <li className="about-problem-step" data-reveal key={step.number}>
              <span className="about-problem-marker" aria-hidden="true">
                {step.number}
                <i>
                  <AboutIcon name={step.icon} />
                </i>
              </span>
              <div>
                <p>
                  <span>{step.number}</span> &mdash; {step.label}
                </p>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-solution about-page-section" aria-labelledby="solution-title">
        <header className="about-section-heading" data-reveal>
          <p className="sd-kicker">The solution</p>
          <h2 id="solution-title">
            So We Built <span>Shoe Doctor.</span>
          </h2>
          <p>
            Shoe Doctor is a professional footwear-care clinic created to
            diagnose, clean, repair and restore shoes according to their
            material, construction and condition.
          </p>
        </header>

        <div className="about-solution-layout">
          <figure className="about-solution-media" data-reveal>
            <BeforeAfterComparison
              afterSrc="/sneaker-cleaning-clean.webp"
              beforeSrc="/sneaker-cleaning-dirty.webp"
              title="a Shoe Doctor cleaning treatment"
            />
            <figcaption>
              Slide to see how considered care can change a pair&apos;s next
              chapter.
            </figcaption>
          </figure>

          <div className="about-service-list" aria-label="Shoe Doctor services">
            {services.map((service) => (
              <article data-reveal key={service.title}>
                <span className="about-service-icon" aria-hidden="true">
                  <AboutIcon name={service.icon} />
                </span>
                <div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
              </article>
            ))}
            <a className="about-inline-link" href="/services">
              Explore Our Services <ArrowUpRight />
            </a>
          </div>
        </div>
      </section>

      <section className="about-standard about-page-section" aria-labelledby="standard-title">
        <header className="about-section-heading" data-reveal>
          <p className="sd-kicker">How we work</p>
          <h2 id="standard-title">
            The Shoe Doctor <span>Standard.</span>
          </h2>
          <p>
            Professional care starts with a clear diagnosis, a transparent
            conversation and treatment that suits the material.
          </p>
        </header>

        <ol className="about-standard-grid">
          {standards.map((standard) => (
            <li data-reveal key={standard.number}>
              <span>{standard.number}</span>
              <h3>{standard.title}</h3>
              <p>{standard.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-roadmap about-page-section" aria-labelledby="journey-ahead-title">
        <header className="about-section-heading" data-reveal>
          <p className="sd-kicker">The journey ahead</p>
          <h2 id="journey-ahead-title">
            Hetauda First. <span>Nepal Next.</span>
          </h2>
          <p>
            A local beginning with a longer view of reliable care within reach
            of every worthy pair.
          </p>
        </header>

        <ol className="about-roadmap-list" data-reveal>
          {journeyAhead.map((milestone) => (
            <li key={milestone.number}>
              <span>{milestone.number}</span>
              <h3>{milestone.title}</h3>
              <p>{milestone.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-mission about-page-section" aria-labelledby="mission-title">
        <div className="about-mission-copy" data-reveal>
          <p className="sd-kicker">Our mission</p>
          <h2 id="mission-title">
            Professional Shoe Care, <span>Made Accessible.</span>
          </h2>
          <p>
            Starting from Hetauda, our mission is to make honest,
            material-specific shoe cleaning, repair and restoration accessible
            across Nepal.
          </p>
          <p className="about-mission-vision">
            We want to create a culture where good shoes are cared for,
            restored and worn longer instead of being unnecessarily discarded.
          </p>
        </div>
        <div className="about-mission-art" data-reveal aria-hidden="true">
          <ShoeLineArt />
          <span>Care / Restore / Repeat</span>
        </div>
      </section>

      <section className="about-closing about-page-section" aria-labelledby="closing-title">
        <div data-reveal>
          <p className="sd-kicker">For every pair</p>
          <h2 id="closing-title">Every Pair Deserves Another Journey.</h2>
        </div>
        <div data-reveal>
          <p>
            Your shoes carried your work, travel, celebrations and everyday
            memories. We help prepare them for what comes next.
          </p>
          <strong>We Diagnose. We Clean. We Restore.</strong>
        </div>
      </section>

      <section className="about-final-cta" aria-labelledby="about-final-cta-title">
        <div data-reveal>
          <p className="sd-kicker">Your pair is next</p>
          <h2 id="about-final-cta-title">
            Ready to Give Your Pair <span>Another Journey?</span>
          </h2>
          <div className="about-final-cta-actions">
            <a className="sd-primary-button" href="/#book">
              Book Your Pair <ArrowUpRight />
            </a>
            <a className="about-final-cta-secondary" href="/services">
              Explore Our Services <ArrowUpRight />
            </a>
          </div>
          <a className="about-whatsapp-link" href="https://wa.me/9779761716743">
            WhatsApp the Doctor <ArrowUpRight />
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
