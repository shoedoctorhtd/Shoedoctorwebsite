/* eslint-disable @next/next/no-html-link-for-pages */
import SiteMotion from "../components/SiteMotion";
import Image from "next/image";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "../components/SiteChrome";

export const dynamic = "force-dynamic";

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
            <div className="sd-origin-visual" data-reveal data-tilt>
              <div className="sd-origin-visual-card">
                <div className="sd-origin-brand">
                  <span>SD</span>
                  <p>Shoe Doctor</p>
                </div>
                <p className="sd-origin-visual-message">
                  Your shoes carry your work, travel, memories, and everyday
                  life.
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

          <ol className="sd-origin-story-list">
            <li className="sd-origin-story-card" data-reveal>
              <span>01</span>
              <div>
                <h3>The Observation</h3>
                <p>
                  People spend thousands on shoes they love, yet professional
                  footwear care is still difficult to access&mdash;especially
                  outside major cities.
                </p>
              </div>
            </li>
            <li className="sd-origin-story-card" data-reveal>
              <span>02</span>
              <div>
                <h3>The Problem</h3>
                <p>
                  Most people either clean shoes at home with unsuitable
                  products or depend on services that do not understand
                  different materials. This can cause fading, glue damage, bad
                  odour, and shorter shoe life.
                </p>
              </div>
            </li>
            <li className="sd-origin-story-card" data-reveal>
              <span>03</span>
              <div>
                <h3>The Gap</h3>
                <p>
                  That gap inspired Shoe Doctor&mdash;a specialised footwear-care
                  clinic focused on cleaning, repairing, and restoring shoes
                  professionally.
                </p>
              </div>
            </li>
            <li className="sd-origin-story-card" data-reveal>
              <span>04</span>
              <div>
                <h3>What We Believe</h3>
                <p>
                  We believe shoes are more than something people wear. They
                  carry us through work, celebrations, sports, travel, and
                  everyday life. A good pair should not be discarded just
                  because it became dirty or damaged.
                </p>
              </div>
            </li>
            <li className="sd-origin-story-card" data-reveal>
              <span>05</span>
              <div>
                <h3>Our Mission</h3>
                <p>
                  At Shoe Doctor, every pair is treated according to its
                  material and condition. Starting from Hetauda, our goal is to
                  make reliable shoe care accessible across Nepal through
                  professional service, pickup, and return delivery.
                </p>
              </div>
            </li>
          </ol>
        </div>

        <div className="sd-origin-cta" data-reveal>
          <div>
            <p className="sd-kicker">The journey continues</p>
            <h3>EVERY PAIR DESERVES<br />ANOTHER JOURNEY.</h3>
            <p>We diagnose. We clean. We restore.</p>
          </div>
          <div className="sd-origin-cta-actions">
            <a className="sd-primary-button" href="/services">
              Explore Our Services <ArrowUpRight />
            </a>
            <a className="sd-origin-secondary-button" href="/#book">
              Book Pickup <ArrowUpRight />
            </a>
          </div>
        </div>
      </section>

      <section className="sd-journey" data-reveal>
        <article>
          <span>01</span>
          <p>Kathmandu</p>
          <h3>Study</h3>
          <strong>Master’s in Computer Engineering</strong>
        </article>
        <article>
          <span>02</span>
          <p>Corporate life</p>
          <h3>Work</h3>
          <strong>Around two years in a 9-to-5 role</strong>
        </article>
        <article>
          <span>03</span>
          <p>Homecoming</p>
          <h3>Risk</h3>
          <strong>Savings, courage and a new beginning</strong>
        </article>
        <article>
          <span>04</span>
          <p>Shoe Doctor</p>
          <h3>Build</h3>
          <strong>Professional care for every worthy pair</strong>
        </article>
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
