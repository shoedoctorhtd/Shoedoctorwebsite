/* eslint-disable @next/next/no-html-link-for-pages */
import SiteMotion from "../components/SiteMotion";
import Image from "next/image";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "../components/SiteChrome";

export const dynamic = "force-dynamic";

type OriginTimelineIconName = "observation" | "problem" | "reason";

const originTimelineItems: Array<{
  step: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: OriginTimelineIconName;
}> = [
  {
    step: "01",
    eyebrow: "01 — The Observation",
    title: "What We Noticed",
    description:
      "People invest in shoes they love, but professional footwear care is still difficult to find outside major cities.",
    icon: "observation",
  },
  {
    step: "02",
    eyebrow: "02 — The Problem",
    title: "What Was Going Wrong",
    description:
      "Incorrect products and one-method-fits-all cleaning can damage colour, glue, shape and delicate materials.",
    icon: "problem",
  },
  {
    step: "03",
    eyebrow: "03 — The Reason",
    title: "Why Shoe Doctor Exists",
    description:
      "We brought material-specific cleaning, repair and restoration services to Hetauda—so every pair receives the care it actually needs.",
    icon: "reason",
  },
];

function OriginTimelineIcon({ icon }: { icon: OriginTimelineIconName }) {
  if (icon === "observation") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 12s3.2-5.4 8.5-5.4 8.5 5.4 8.5 5.4-3.2 5.4-8.5 5.4S3.5 12 3.5 12Z" />
        <circle cx="12" cy="12" r="2.1" />
      </svg>
    );
  }

  if (icon === "problem") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3.8 8.5 15H3.5l8.5-15Z" />
        <path d="M12 9v4.7M12 16.8v.1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3.6 1.3 4.1 4.1 1.3-4.1 1.3L12 14.4l-1.3-4.1L6.6 9l4.1-1.3L12 3.6Z" />
      <path d="m18.3 14.5.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" />
    </svg>
  );
}

const founderMilestones = [
  {
    step: "01",
    label: "Kathmandu",
    title: "Study",
    description: "Master’s in Computer Engineering",
    tone: "sky",
  },
  {
    step: "02",
    label: "Corporate life",
    title: "Work",
    description: "Around two years in a 9-to-5 role",
    tone: "berry",
  },
  {
    step: "03",
    label: "Homecoming",
    title: "Risk",
    description: "Savings, courage and a new beginning",
    tone: "coral",
  },
  {
    step: "04",
    label: "Shoe Doctor",
    title: "Build",
    description: "Professional care for every worthy pair",
    tone: "lime",
  },
] as const;

export default function AboutPage() {
  return (
    <main className="public-site inner-site">
      <SiteMotion />
      <SiteHeader />

      <section className="sd-page-hero about-hero">
        <p className="sd-kicker">The opening story</p>
        <h1>
          25 MA TRY.
          <br />
          <span>45 MA REGRET HOINA.</span>
        </h1>
        <div className="sd-page-hero-bottom">
          <p>
            A safe career in Kathmandu, one difficult question, and the choice
            to come home to Hetauda and build something real.
          </p>
          <div className="sd-story-mark">
            <Image
              src="/shoe-doctor-logo.png"
              alt="Shoe Doctor logo"
              width={180}
              height={180}
              priority
              unoptimized
            />
          </div>
        </div>
      </section>

      <section className="sd-story-section sd-section" data-reveal>
        <div className="sd-story-intro">
          <p className="sd-kicker">Why I started Shoe Doctor</p>
          <h2>
            I CHOSE THE
            <br />
            <span>OTHER DIRECTION.</span>
          </h2>
        </div>
        <div className="sd-story-copy">
          <p className="sd-story-lead">
            While many people were leaving their hometown for Kathmandu or
            abroad, I chose to return.
          </p>
          <p>
            I spent years in Kathmandu for study, completed my Master’s in
            Computer Engineering, and worked for around two years in a
            corporate 9-to-5 job. I had a salary, a routine and a life that
            looked safe from the outside. But even inside that safety,
            something felt missing.
          </p>
          <p>
            One question kept returning: would I reach 45 and regret that I
            never tried when I was 25? Or would I take the risk now, while I
            still had the time and courage to build?
          </p>
          <p>
            I had lived away from Hetauda for years and came home mostly during
            festivals. This time, I returned with a different purpose. I used
            my savings, accepted the financial risk, and started creating a
            professional shoe cleaning, repair and restoration service for my
            hometown.
          </p>
          <blockquote>
            “Better to try at 25 than spend 45 wondering what might have
            happened.”
          </blockquote>
        </div>
      </section>

      <section className="sd-origin-story sd-section" aria-labelledby="why-started-title">
        <div className="sd-origin-intro" data-reveal>
          <div>
            <p className="sd-kicker">Why We Started Shoe Doctor</p>
            <h2 id="why-started-title">
              CARE FOR WHAT
              <br />
              <span>CARRIES YOU.</span>
            </h2>
          </div>
          <p>
            We started Shoe Doctor because great shoes deserve expert care, not
            guesswork.
          </p>
          <span className="sd-origin-intro-accent" aria-hidden="true">
            <i />
            <b />
          </span>
        </div>

        <div className="sd-origin-layout">
          <aside className="sd-origin-visual-wrap">
            <div className="sd-origin-visual" data-reveal>
              <div className="sd-origin-visual-card">
                <div className="sd-origin-brand">
                  <span>SD</span>
                  <p>Shoe Doctor</p>
                </div>
                <p className="sd-origin-visual-message">
                  Your shoes carry
                  <br />
                  your work,
                  <br />
                  travel,
                  <br />
                  memories, and
                  <br />
                  everyday life.
                </p>
                <ul className="sd-origin-services" aria-label="Our care services">
                  <li>Professional Cleaning</li>
                  <li>Repair &amp; Restoration</li>
                  <li>Pickup &amp; Return Delivery</li>
                </ul>
                <div className="sd-origin-shoe-art" aria-hidden="true">
                  <svg viewBox="0 0 230 110" fill="none">
                    <path d="M29 70c18-1 36-8 50-21l19-18c9 13 22 26 41 31l36 9c13 3 23 13 25 25H28c-8 0-11-7-8-14 1-5 4-10 9-12Z" />
                    <path d="M59 70h86" />
                    <path d="M108 43 91 57M124 49l-17 14M140 55l-17 14" />
                  </svg>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </aside>

          <div className="sd-origin-story-flow">
            <ol className="sd-origin-timeline" data-reveal>
              {originTimelineItems.map((item) => (
                <li
                  className="sd-origin-timeline-step"
                  data-reveal
                  key={item.step}
                >
                  <span className="sd-origin-timeline-marker" aria-hidden="true">
                    <span>{item.step}</span>
                    <i>
                      <OriginTimelineIcon icon={item.icon} />
                    </i>
                  </span>
                  <div className="sd-origin-timeline-copy">
                    <p>{item.eyebrow}</p>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <blockquote className="sd-origin-quote" data-reveal>
              <span aria-hidden="true">&ldquo;</span>
              <p>
                Shoes carry more than our feet. They carry our work, memories
                and everyday journeys.<span aria-hidden="true">&rdquo;</span>
              </p>
            </blockquote>

            <section
              className="sd-origin-mission"
              data-reveal
              aria-labelledby="origin-mission-title"
            >
              <p className="sd-kicker">Our Mission</p>
              <h3 id="origin-mission-title">
                Professional Shoe Care,
                <br />
                <span>Made Accessible</span>
              </h3>
              <p>
                To provide honest, material-specific shoe cleaning, repair and
                restoration&mdash;starting from Hetauda and growing across Nepal.
              </p>
              <div className="sd-origin-mission-actions">
                <a className="sd-primary-button" href="/services">
                  Explore Our Services <ArrowUpRight />
                </a>
                <a className="sd-origin-mission-link" href="/#book">
                  Book Your Pair <ArrowUpRight />
                </a>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section
        className="sd-journey sd-section"
        data-reveal
        aria-labelledby="founder-journey-title"
      >
        <div className="sd-journey-intro">
          <div>
            <p className="sd-kicker">Founder journey</p>
            <h2 id="founder-journey-title">
              FROM STUDY
              <br />
              <span>TO STARTUP.</span>
            </h2>
          </div>
          <p>
            A four-step journey from Kathmandu to building Shoe Doctor in
            Hetauda.
          </p>
        </div>

        <ol className="sd-journey-track">
          {founderMilestones.map((milestone) => (
            <li
              className={`sd-journey-card sd-journey-card--${milestone.tone}`}
              key={milestone.step}
            >
              <div className="sd-journey-card-meta">
                <span>{milestone.step}</span>
                <p>{milestone.label}</p>
              </div>
              <h3>{milestone.title}</h3>
              <strong>{milestone.description}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="sd-about-purpose sd-section" data-reveal>
        <div>
          <p className="sd-kicker">What we believe</p>
          <h2>CARE SHOULD BE<br />HONEST AND PRECISE.</h2>
        </div>
        <div className="sd-purpose-grid">
          <article>
            <span>Diagnosis first</span>
            <p>
              We study the material, damage and condition before choosing the
              treatment.
            </p>
          </article>
          <article>
            <span>Expectations made clear</span>
            <p>
              We explain what can improve, what may remain, and what the final
              price will be before work begins.
            </p>
          </article>
          <article>
            <span>Wear more, waste less</span>
            <p>
              Cleaning and repairing a good pair extends its story and avoids
              unnecessary replacement.
            </p>
          </article>
        </div>
      </section>

      <section className="sd-page-cta">
        <p>The story continues with every restored pair.</p>
        <h2>READY TO START<br />YOUR PAIR’S COMEBACK?</h2>
        <a className="sd-primary-button" href="/#book">
          Book your pair <ArrowUpRight />
        </a>
      </section>

      <SiteFooter />
    </main>
  );
}
