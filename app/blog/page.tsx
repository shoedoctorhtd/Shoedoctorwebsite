/* eslint-disable @next/next/no-html-link-for-pages */
import SiteMotion from "../components/SiteMotion";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "../components/SiteChrome";

export const dynamic = "force-dynamic";

export default function BlogPage() {
  return (
    <main className="public-site inner-site">
      <SiteMotion />
      <SiteHeader />

      <section className="sd-page-hero blog-hero">
        <p className="sd-kicker">The Shoe Doctor journal</p>
        <h1>
          CARE FOR WHAT
          <br />
          <span>CARRIES YOU.</span>
        </h1>
        <div className="blog-hero-topics">
          <article className="blog-hero-topic blog-hero-topic-care">
            <p className="blog-hero-topic-label">01 &middot; The care promise</p>
            <p>
              Simple care habits, smarter protection and the right products can
              keep every pair cleaner, safer and wearable for longer.
            </p>
          </article>

          <article className="blog-hero-topic blog-hero-topic-voice">
            <p className="blog-hero-topic-label">02 &middot; Why it matters</p>
            <h2>YOUR SHOES SPEAK<br /><span>BEFORE YOU DO.</span></h2>
            <div className="blog-hero-story-copy">
              <p>
                Shoes protect movement, support posture and change how you feel
                when you enter a room. Work, celebrations, travel, first
                meetings and ordinary errands all leave memories in the pairs
                that carried you there.
              </p>
              <p>
                Caring for them is not only about appearance. It is about
                comfort, confidence and respecting an item you use more heavily
                than almost anything else you own.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="sd-blog-index sd-section">
        <article className="sd-feature-article" data-reveal>
          <div className="sd-article-meta">
            <span>01 &middot; Everyday care</span>
            <em>3 minute read</em>
          </div>
          <h2>DON&apos;T LET DIRT<br />SETTLE IN.</h2>
          <div className="sd-article-body">
            <p>
              Dust looks harmless, but repeated wear pushes it deeper into
              fabric, stitching and colour. Brush away loose dirt regularly
              and use a shoe wipe when a fresh mark appears.
            </p>
            <p>
              When your pair needs more than a quick wipe, reach for a proper
              sneaker-cleaning kit. Cleaning foam, two brushes and a microfiber
              towel give you the right tools for the upper, sole and finishing
              wipe&mdash;without soaking the shoe.
            </p>
            <ul>
              <li>Clean fresh marks immediately.</li>
              <li>Use separate brushes for uppers and soles.</li>
              <li>Test products on a hidden area first.</li>
              <li>Let every pair dry naturally in shade.</li>
            </ul>
            <p>Small cleanups keep big stains away.</p>
          </div>
        </article>

        <div className="sd-blog-cards">
          <article className="sd-blog-card navy" data-reveal>
            <div className="sd-article-meta">
              <span>02 &middot; Travel and storage</span>
              <em>3 minute read</em>
            </div>
            <h2>WHEREVER YOU GO,<br />PROTECT THE PAIR.</h2>
            <p>
              Rain does not send a warning. Neither do muddy roads, dusty
              luggage or crowded shoe racks.
            </p>
            <p>
              Keep foldable shoe covers nearby during rainy days and outdoor
              travel. When the journey ends, place clean and completely dry
              sneakers inside a shoe bag to protect their shape and separate
              them from clothes.
            </p>
            <p>
              A little preparation can save your favourite pair from
              unnecessary cleaning and damage.
            </p>
          </article>

          <article className="sd-blog-card coral" data-reveal>
            <div className="sd-article-meta">
              <span>03 &middot; Doctor&apos;s note</span>
              <em>2 minute read</em>
            </div>
            <h2>SUEDE HAS<br />DIFFERENT RULES.</h2>
            <p>
              Suede should not be treated like an ordinary sneaker. Water and
              aggressive scrubbing can leave marks, flatten its texture and
              affect its colour.
            </p>
            <p>
              For small, dry stains, gently use a suede eraser instead of
              washing the entire shoe. If the stain is deep, oily or spreading,
              stop experimenting and let a professional examine it.
            </p>
            <p>
              The right treatment protects the material. The wrong one may make
              the damage permanent.
            </p>
          </article>
        </div>

        <article className="sd-feature-article" data-reveal>
          <div className="sd-article-meta">
            <span>04 &middot; At-home routine</span>
            <em>5 minute read</em>
          </div>
          <h2>
            BUILD A SIMPLE
            <br />
            AT-HOME SNEAKER-
            <br />
            CLEANING ROUTINE.
          </h2>
          <div className="sd-article-body">
            <p>
              You do not need a shelf full of random cleaning products. A
              practical sneaker-cleaning kit containing cleaning foam, two
              suitable brushes and a microfiber towel is enough for most
              regular cleaning.
            </p>
            <p>Follow these steps:</p>
            <ul>
              <li>01. Remove the shoelaces and insoles, if removable.</li>
              <li>02. Use a dry brush to remove loose dust and mud.</li>
              <li>03. Test the cleaning foam on a small, less-visible area.</li>
              <li>
                04. Apply a small amount of foam to the brush instead of
                pouring cleaner directly onto the shoe.
              </li>
              <li>05. Use the softer brush on the upper material.</li>
              <li>
                06. Use the second brush for the midsole and other stronger
                surfaces.
              </li>
              <li>
                07. Wipe away loosened dirt and excess foam with a clean
                microfiber towel.
              </li>
              <li>
                08. Leave the sneakers to dry naturally in a shaded,
                ventilated area.
              </li>
            </ul>
            <p>
              A complete sneaker-cleaning kit makes this process easier because
              each tool has a purpose. The brushes loosen dirt, the foam cleans
              without requiring the shoe to be soaked, and the microfiber towel
              lifts away moisture without scratching the surface.
            </p>
            <p>
              <strong>Important:</strong> Avoid using the same brush on the
              dirty outsole and the upper part of the sneaker.
            </p>
          </div>
        </article>
      </section>

      <section className="sd-care-checklist" data-reveal>
        <p className="sd-kicker">Save this checklist</p>
        <h2>SMALL HABITS.<br />LONGER LIFE.</h2>
        <ol>
          <li><span>01</span>Wipe dirt while it is still fresh.</li>
          <li><span>02</span>Match every product to the material.</li>
          <li><span>03</span>Keep suede away from unnecessary water.</li>
          <li><span>04</span>Carry shoe covers and travel with shoe bags.</li>
          <li><span>05</span>Ask for professional care before damage spreads.</li>
        </ol>
      </section>

      <section className="sd-page-cta">
        <p>
          Everything your sneakers need between professional visits&mdash;shoe
          wipes, suede erasers, protective shoe covers, shoe bags and complete
          cleaning kits.
        </p>
        <h2>CLEAN WITH CARE.<br />WEAR WITH CONFIDENCE.</h2>
        <a className="sd-primary-button" href="/#book">
          Book your pair <ArrowUpRight />
        </a>
      </section>

      <SiteFooter />
    </main>
  );
}
