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

      <section className="sd-founder-story sd-section" aria-labelledby="founder-story-title">
        <aside className="sd-founder-panel-wrap">
          <div className="sd-founder-panel" data-reveal data-tilt>
            <div className="sd-founder-panel-copy">
              <p className="sd-kicker">Why I Started Shoe Doctor</p>
              <h2 id="founder-story-title">
                I CHOSE THE
                <br />
                <span>OTHER DIRECTION.</span>
              </h2>
              <p>
                When many were leaving hometown for bigger cities, I came back
                to Hetauda to build something meaningful.
              </p>
            </div>

            <div className="sd-founder-journey-art" aria-hidden="true">
              <svg viewBox="0 0 420 160" fill="none">
                <path d="M13 127C74 127 71 28 151 28c69 0 75 100 148 100 51 0 60-45 105-81" />
                <circle cx="13" cy="127" r="6" />
                <circle cx="151" cy="28" r="6" />
                <circle cx="299" cy="128" r="6" />
                <path d="m395 47 10-1-4 9" />
              </svg>
              <span>Hetauda</span>
              <i />
            </div>

            <ul className="sd-founder-milestones">
              <li>Master&apos;s in Computer Engineering</li>
              <li>2 Years Corporate Experience</li>
              <li>Returned to Hetauda</li>
              <li>Built Shoe Doctor</li>
            </ul>
          </div>
        </aside>

        <div className="sd-founder-story-content">
          <ol className="sd-founder-timeline" data-reveal>
            <li data-reveal>
              <span>01</span>
              <article>
                <h3>The Safe Path</h3>
                <p>
                  I spent years in Kathmandu for study, completed my Master&apos;s
                  in Computer Engineering, and worked for around two years in a
                  corporate 9-to-5 job. From the outside, life looked safe and
                  settled.
                </p>
              </article>
            </li>
            <li data-reveal>
              <span>02</span>
              <article>
                <h3>Something Felt Missing</h3>
                <p>
                  I had a salary, a routine, and stability&mdash;but deep inside,
                  something felt incomplete.
                </p>
              </article>
            </li>
            <li data-reveal>
              <span>03</span>
              <article>
                <h3>The Question That Stayed</h3>
                <p>
                  One question kept returning: would I reach 45 and regret not
                  trying when I was 25? Or should I take the risk while I still
                  had the time and courage to build?
                </p>
              </article>
            </li>
            <li data-reveal>
              <span>04</span>
              <article>
                <h3>Coming Back With Purpose</h3>
                <p>
                  I had lived away from Hetauda for years and mostly came home
                  during festivals. This time, I returned with a different
                  purpose.
                </p>
              </article>
            </li>
            <li data-reveal>
              <span>05</span>
              <article>
                <h3>Why Shoe Doctor</h3>
                <p>
                  I used my savings, accepted the financial risk, and started
                  building a professional shoe cleaning, repair, and
                  restoration service for my hometown.
                </p>
              </article>
            </li>
          </ol>

          <blockquote className="sd-founder-quote" data-reveal>
            <span aria-hidden="true">“</span>
            <p>
              Better to try at 25 than spend 45 wondering what might have
              happened.
            </p>
            <cite>&mdash; Founder, Shoe Doctor</cite>
          </blockquote>

          <div className="sd-founder-cta" data-reveal>
            <div>
              <p className="sd-kicker">Built to return more</p>
              <h3>BUILT IN HETAUDA.<br />DESIGNED TO SERVE ACROSS NEPAL.</h3>
              <p>
                Shoe Doctor was created from a personal decision to return,
                build, and create something useful for the community.
              </p>
            </div>
            <div className="sd-founder-cta-actions">
              <a className="sd-primary-button" href="/services">
                Explore Our Services <ArrowUpRight />
              </a>
              <a className="sd-founder-secondary-button" href="/#book">
                Book Pickup <ArrowUpRight />
              </a>
            </div>
          </div>
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
