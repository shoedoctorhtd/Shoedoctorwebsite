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
        <div className="sd-page-hero-bottom">
          <p>
            Practical care advice, smarter repair decisions and a closer look
            at why the right pair matters more than people think.
          </p>
        </div>
      </section>

      <section className="sd-blog-index sd-section">
        <article className="sd-feature-article" data-reveal>
          <div className="sd-article-meta">
            <span>01 · Shoe care guide</span>
            <em>5 minute read</em>
          </div>
          <h2>HOW TO MAKE EVERY PAIR LAST LONGER.</h2>
          <div className="sd-article-body">
            <p>
              Good shoe care starts before a pair looks dirty. Surface dust,
              trapped moisture, heat and repeated daily wear slowly weaken
              material, stitching, colour and shape.
            </p>
            <p>
              Brush away loose dirt after every few wears. Let damp footwear
              dry naturally in shade instead of using intense heat. Loosen the
              laces before removing a shoe so the heel and upper are not forced
              out of shape.
            </p>
            <ul>
              <li>Use cleaning products made for the exact material.</li>
              <li>Rotate pairs instead of wearing the same shoe every day.</li>
              <li>Store shoes only when completely dry.</li>
              <li>Use paper or a shoe tree to support shape.</li>
              <li>Treat loose stitches and lifting soles early.</li>
            </ul>
          </div>
        </article>

        <div className="sd-blog-cards">
          <article className="sd-blog-card navy" data-reveal>
            <div className="sd-article-meta">
              <span>02 · Why shoes matter</span>
              <em>4 minute read</em>
            </div>
            <h2>YOUR SHOES SPEAK BEFORE YOU DO.</h2>
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
          </article>

          <article className="sd-blog-card coral" data-reveal>
            <div className="sd-article-meta">
              <span>03 · Doctor’s note</span>
              <em>3 minute read</em>
            </div>
            <h2>REPAIR EARLY. REPLACE LESS.</h2>
            <p>
              A loose stitch, lifting sole or fading colour is normally easier
              and more affordable to correct when treated early. Waiting lets
              movement, dust and water turn a small weakness into wider
              structural damage.
            </p>
            <p>
              Timely restoration saves favourite pairs, protects the original
              construction and reduces unnecessary waste.
            </p>
          </article>
        </div>
      </section>

      <section className="sd-care-checklist" data-reveal>
        <p className="sd-kicker">Save this checklist</p>
        <h2>FIVE HABITS.<br />BETTER SHOES.</h2>
        <ol>
          <li><span>01</span>Wipe fresh dirt before it settles.</li>
          <li><span>02</span>Clean smarter with the right tools.</li>
          <li><span>03</span>Treat suede with extra care.</li>
          <li><span>04</span>Protect clean sneakers before the rain.</li>
          <li><span>05</span>Store dry sneakers in a shoe bag.</li>
        </ol>
      </section>

      <section className="sd-page-cta">
        <p>Professional care when home care is not enough.</p>
        <h2>LET’S KEEP YOUR<br />BEST PAIRS MOVING.</h2>
        <a className="sd-primary-button" href="/#book">
          Book your pair <ArrowUpRight />
        </a>
      </section>

      <SiteFooter />
    </main>
  );
}
