/* eslint-disable @next/next/no-html-link-for-pages */
import { publicPageMetadata } from "@/lib/seo";
import SiteMotion from "../components/SiteMotion";
import { ArrowUpRight, SiteFooter, SiteHeader } from "../components/SiteChrome";
import BlogGuideContent from "../components/BlogGuideContent";
import { getPublishedBlogPost, recommendedBlogProduct } from "@/lib/blog-data";
import { listPublicProducts } from "@/lib/product-data";
import type { ProductCard } from "@/lib/product-types";
import JournalImage from "./JournalImage";
import styles from "./Journal.module.css";

export const dynamic = "force-dynamic";

export const metadata = publicPageMetadata({
  path: "/blog",
  title: "Shoe Care Guides & Sneaker Cleaning Tips | Shoe Doctor",
  description: "Read practical shoe-care guides from Shoe Doctor in Hetauda, Nepal, covering sneaker cleaning, suede care, storage and when to seek professional treatment.",
});

const articles = [
  {
    slug: "everyday-shoe-cleaning",
    image: "everyday-shoe-care",
    alt: "A white sneaker gently brushed with cleaning foam, with a microfiber cloth nearby.",
    heading: <>DON&apos;T LET DIRT<br />SETTLE IN.</>,
  },
  {
    slug: "shoe-travel-and-storage",
    image: "travel-shoe-care",
    alt: "Clean white sneakers and a drawstring shoe bag beside an open, neatly packed suitcase.",
    heading: <>WHEREVER YOU GO,<br />PROTECT THE PAIR.</>,
  },
  {
    slug: "suede-shoe-care",
    image: "suede-shoe-care",
    alt: "A tan suede sneaker carefully treated with a suede eraser, with a soft brush beside it.",
    heading: <>SUEDE HAS<br />DIFFERENT RULES.</>,
  },
  {
    slug: "at-home-sneaker-cleaning",
    image: "home-shoe-cleaning-kit",
    alt: "An at-home shoe-care kit with foam cleaner, two brushes, a microfiber cloth, spare laces and sneakers.",
    heading: <>BUILD A SIMPLE AT-HOME SNEAKER-CLEANING ROUTINE.</>,
  },
];

export default async function BlogPage() {
  let products: ProductCard[] = [];
  try {
    products = await listPublicProducts();
  } catch {
    // Blog education remains available if the optional catalogue query cannot load.
  }

  return (
    <main id="main-content" className={`public-site inner-site ${styles.journal}`}>
      <SiteMotion revealOnScroll />
      <SiteHeader />

      <section className={`sd-page-hero blog-hero ${styles.hero}`}>
        <div className={styles.heroMain}>
          <div>
            <p className="sd-kicker">The Shoe Doctor journal</p>
            <h1>CARE FOR WHAT<br /><span>CARRIES YOU.</span></h1>
            <div className={styles.promise}>
              <p className={styles.label}>01 &middot; The care promise</p>
              <p>
                Simple care habits, smarter protection and the right products can
                keep every pair cleaner, safer and wearable for longer.
              </p>
            </div>
          </div>
          <JournalImage name="blog-hero-shoe-cleaning" hero alt="A shoe-care specialist gently cleaning a white sneaker with foam and a soft brush at a sunlit workbench." />
        </div>
        <div className={styles.story}>
          <div>
            <p className={styles.label}>02 &middot; Why it matters</p>
            <h2>YOUR SHOES SPEAK<br /><span>BEFORE YOU DO.</span></h2>
          </div>
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
      </section>

      <section className={`sd-blog-index sd-section ${styles.index}`} aria-label="Shoe-care guides">
        <div className={styles.articles}>
          {articles.map((article, index) => {
            const post = getPublishedBlogPost(article.slug);
            if (!post) return null;
            return (
              <article className={styles.article} key={post.slug} aria-labelledby={`${post.slug}-title`}>
                <div className={styles.media} data-reveal>
                  <JournalImage name={article.image} alt={article.alt} />
                </div>
                <div className={styles.copy}>
                  <div className={styles.meta} data-reveal>
                    <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                    <span>{post.category}</span>
                    <span className={styles.readTime}>{post.readTime}</span>
                  </div>
                  <h2 id={`${post.slug}-title`} data-reveal><a href={`/blog/${post.slug}`}>{article.heading}</a></h2>
                  <div className={styles.body}>
                    <BlogGuideContent slug={post.slug} product={recommendedBlogProduct(post, products)} editorial />
                  </div>
                  <a className={styles.readLink} href={`/blog/${post.slug}`} aria-label={`Read ${post.title}`}>
                    Read the guide <ArrowUpRight />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={`sd-care-checklist ${styles.checklist}`}>
        <div className={styles.checklistInner}>
          <div data-reveal>
            <p className={styles.label}>Save this checklist</p>
            <h2>SMALL HABITS.<br />LONGER LIFE.</h2>
          </div>
          <ol>
            <li><span>01</span>Wipe dirt while it is still fresh.</li>
            <li><span>02</span>Match every product to the material.</li>
            <li><span>03</span>Keep suede away from unnecessary water.</li>
            <li><span>04</span>Carry shoe covers and travel with shoe bags.</li>
            <li><span>05</span>Ask for professional care before damage spreads.</li>
          </ol>
        </div>
      </section>

      <section className={`sd-page-cta ${styles.cta}`}>
        <div className={styles.ctaInner}>
          <div>
            <p className={styles.label}>Need help with your pair?</p>
            <h2>CLEAN WITH CARE.<br />WEAR WITH CONFIDENCE.</h2>
          </div>
          <div className={styles.ctaCopy}>
            <p>
              Explore the Shoe Doctor care essentials that are currently ready to
              order, or book professional help for a difficult pair.
            </p>
            <div className={styles.actions}>
              <a className="sd-primary-button" href="/#book">Book professional care <ArrowUpRight /></a>
              <a className={styles.readLink} href="/products">Explore products <ArrowUpRight /></a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
