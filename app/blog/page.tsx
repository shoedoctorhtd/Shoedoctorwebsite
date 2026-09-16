/* eslint-disable @next/next/no-html-link-for-pages */
import { publicPageMetadata } from "@/lib/seo";
import SiteMotion from "../components/SiteMotion";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "../components/SiteChrome";
import BlogGuideContent from "../components/BlogGuideContent";
import { getPublishedBlogPost, recommendedBlogProduct } from "@/lib/blog-data";
import { listPublicProducts } from "@/lib/product-data";
import type { ProductCard } from "@/lib/product-types";

export const dynamic = "force-dynamic";

export const metadata = publicPageMetadata({
  path: "/blog",
  title: "Shoe Care Guides & Sneaker Cleaning Tips | Shoe Doctor",
  description: "Read practical shoe-care guides from Shoe Doctor in Hetauda, Nepal, covering sneaker cleaning, suede care, storage and when to seek professional treatment.",
});

export default async function BlogPage() {
  let products: ProductCard[] = [];
  try {
    products = await listPublicProducts();
  } catch {
    // Blog education remains available if the optional catalogue query cannot load.
  }
  const quickCleanRecommendation = recommendedBlogProduct(getPublishedBlogPost("everyday-shoe-cleaning"), products);
  const storageRecommendation = recommendedBlogProduct(getPublishedBlogPost("shoe-travel-and-storage"), products);
  const suedeRecommendation = recommendedBlogProduct(getPublishedBlogPost("suede-shoe-care"), products);
  const kitRecommendation = recommendedBlogProduct(getPublishedBlogPost("at-home-sneaker-cleaning"), products);
  return (
    <main id="main-content" className="public-site inner-site">
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
        {getPublishedBlogPost("everyday-shoe-cleaning") ? (
        <article className="sd-feature-article" data-reveal>
          <div className="sd-article-meta">
            <span>01 &middot; Everyday care</span>
            <em>3 minute read</em>
          </div>
          <h2><a href="/blog/everyday-shoe-cleaning">DON&apos;T LET DIRT<br />SETTLE IN.</a></h2>
          <BlogGuideContent slug="everyday-shoe-cleaning" product={quickCleanRecommendation} />
        </article>
        ) : null}

        <div className="sd-blog-cards">
          {getPublishedBlogPost("shoe-travel-and-storage") ? (
        <article className="sd-blog-card navy" data-reveal>
            <div className="sd-article-meta">
              <span>02 &middot; Travel and storage</span>
              <em>3 minute read</em>
            </div>
            <h2><a href="/blog/shoe-travel-and-storage">WHEREVER YOU GO,<br />PROTECT THE PAIR.</a></h2>
          <BlogGuideContent slug="shoe-travel-and-storage" product={storageRecommendation} />
        </article>
        ) : null}

          {getPublishedBlogPost("suede-shoe-care") ? (
        <article className="sd-blog-card coral" data-reveal>
            <div className="sd-article-meta">
              <span>03 &middot; Doctor&apos;s note</span>
              <em>2 minute read</em>
            </div>
            <h2><a href="/blog/suede-shoe-care">SUEDE HAS<br />DIFFERENT RULES.</a></h2>
          <BlogGuideContent slug="suede-shoe-care" product={suedeRecommendation} />
        </article>
        ) : null}
        </div>

        {getPublishedBlogPost("at-home-sneaker-cleaning") ? (
        <article className="sd-feature-article" data-reveal>
          <div className="sd-article-meta">
            <span>04 &middot; At-home routine</span>
            <em>5 minute read</em>
          </div>
          <h2><a href="/blog/at-home-sneaker-cleaning">
            BUILD A SIMPLE
            <br />
            AT-HOME SNEAKER-
            <br />
            CLEANING ROUTINE.
          </a></h2>
          <BlogGuideContent slug="at-home-sneaker-cleaning" product={kitRecommendation} />
        </article>
        ) : null}
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
          Explore the Shoe Doctor care essentials that are currently ready to
          order, or book professional help for a difficult pair.
        </p>
        <h2>CLEAN WITH CARE.<br />WEAR WITH CONFIDENCE.</h2>
        <div>
          <a className="sd-primary-button" href="/products">Shop care products <ArrowUpRight /></a>
          <a href="/#book">Book professional shoe care →</a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
