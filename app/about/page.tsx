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

      <section
        className="sd-why-started sd-section"
        data-reveal
        aria-labelledby="why-started-title"
      >
        <div className="sd-why-started-intro">
          <p className="sd-kicker">Why We Started Shoe Doctor</p>
          <h2 id="why-started-title">
            CARE FOR WHAT
            <br />
            <span>CARRIES YOU.</span>
          </h2>
          <div className="sd-why-started-seal" aria-hidden="true">
            <span>Diagnose</span>
            <i>+</i>
            <span>Clean</span>
            <i>+</i>
            <span>Restore</span>
          </div>
        </div>

        <div className="sd-why-started-copy">
          <p className="sd-why-started-lead">
            Shoe Doctor began with a simple observation: people spend thousands
            of rupees on shoes they love, yet professional footwear care is
            still difficult to access&mdash;especially outside major cities.
          </p>
          <p>
            I noticed that most people either cleaned their shoes at home using
            unsuitable products or depended on services that were not designed
            for different shoe materials. This often resulted in faded colours,
            weakened glue, damaged suede, unpleasant odour or shoes being
            thrown away before their time.
          </p>
          <p>
            That gap inspired the creation of Shoe Doctor&mdash;a specialised
            footwear-care clinic focused on cleaning, repairing and restoring
            shoes professionally.
          </p>
          <p>
            We believe shoes are more than something people wear. They carry us
            through work, celebrations, travel, sports and everyday life. A
            good pair should not be discarded simply because it has become
            dirty, damaged or old.
          </p>
          <p>
            At Shoe Doctor, every pair is inspected and treated according to
            its material and condition. Through professional cleaning,
            steam-assisted care, controlled drying, repair and restoration, our
            goal is to help customers protect their favourite footwear and
            extend its life.
          </p>
          <p>
            Starting from Hetauda, we aim to make reliable and convenient shoe
            care accessible across Nepal through pickup and return delivery.
          </p>
          <p className="sd-why-started-closing">
            We Diagnose. We Clean. We Restore.
          </p>
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
