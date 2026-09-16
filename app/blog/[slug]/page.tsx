import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/app/components/SiteChrome";
import SiteMotion from "@/app/components/SiteMotion";
import BlogGuideContent from "@/app/components/BlogGuideContent";
import StructuredData from "@/app/components/StructuredData";
import { getPublishedBlogPost, listPublishedBlogPosts, recommendedBlogProduct } from "@/lib/blog-data";
import { listPublicProducts } from "@/lib/product-data";
import { BUSINESS_ID, DEFAULT_SOCIAL_IMAGE, SITE_URL, canonicalUrl, publicImageUrl, publicPageMetadata, reliableModifiedDate } from "@/lib/seo";

type PageProps = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = getPublishedBlogPost((await params).slug);
  if (!post) return { title: "Guide not found", robots: { index: false, follow: false } };
  return publicPageMetadata({
    path: `/blog/${post.slug}`,
    title: `${post.title} | Shoe Doctor`,
    description: post.description,
    images: post.image ? [post.image] : [],
    article: { publishedTime: reliableModifiedDate(post.publishedAt), modifiedTime: reliableModifiedDate(post.updatedAt) },
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const post = getPublishedBlogPost((await params).slug);
  if (!post) notFound();
  const products = await listPublicProducts().catch(() => []);
  const url = canonicalUrl(`/blog/${post.slug}`);
  const publishedAt = reliableModifiedDate(post.publishedAt);
  const updatedAt = reliableModifiedDate(post.updatedAt);
  const publisher = { "@type": "Organization", "@id": BUSINESS_ID, name: "Shoe Doctor", url: `${SITE_URL}/`, logo: { "@type": "ImageObject", url: DEFAULT_SOCIAL_IMAGE } };
  const relatedPost = listPublishedBlogPosts().find((item) => item.slug !== post.slug && item.slug === (post.slug === "at-home-sneaker-cleaning" ? "everyday-shoe-cleaning" : "at-home-sneaker-cleaning"));
  return (
    <main id="main-content" className="public-site inner-site">
      <SiteMotion />
      <SiteHeader />
      <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        headline: post.title,
        description: post.description,
        inLanguage: "en",
        articleSection: post.category,
        author: { "@type": "Organization", "@id": BUSINESS_ID, name: "Shoe Doctor", url: `${SITE_URL}/` },
        publisher,
        datePublished: publishedAt,
        dateModified: updatedAt,
        ...(post.image ? { image: publicImageUrl(post.image.url) } : {}),
      }} />
      <section className="sd-page-hero blog-hero">
        <p className="sd-kicker"><Link href="/blog">The Shoe Doctor journal</Link> · {post.category}</p>
        <h1>{post.title}</h1>
      </section>
      <section className="sd-blog-index sd-section">
        <article className="sd-feature-article">
          <div className="sd-article-meta">
            <span>By <Link href="/about">Shoe Doctor</Link></span>
            <em>{post.readTime}</em>
          </div>
          <div className="sd-article-body">
            {publishedAt ? <p>Published <time dateTime={publishedAt}>{publishedAt.slice(0, 10)}</time></p> : null}
            {updatedAt ? <p>Updated <time dateTime={updatedAt}>{updatedAt.slice(0, 10)}</time></p> : null}
            <BlogGuideContent slug={post.slug} product={recommendedBlogProduct(post, products)} />
            <p>For difficult stains or damage, explore our <Link href="/services">shoe cleaning, repair and restoration services in Hetauda</Link> or learn about <Link href="/steam-cleaning">steam cleaning and material suitability</Link>.</p>
            {relatedPost ? <p>Related guide: <Link href={`/blog/${relatedPost.slug}`}>{relatedPost.title}</Link>.</p> : null}
          </div>
        </article>
      </section>
      <SiteFooter />
    </main>
  );
}
