import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BeforeAfterComparison from "@/app/components/BeforeAfterComparison";
import SiteMotion from "@/app/components/SiteMotion";
import { SiteFooter, SiteHeader } from "@/app/components/SiteChrome";
import { getPublicRestorationStoryBySlug } from "@/lib/csr-data";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

function publicMediaUrl(id: string | null) {
  return id ? `/api/csr-media/${encodeURIComponent(id)}` : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NP", { dateStyle: "long" }).format(new Date(value));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await getPublicRestorationStoryBySlug(slug).catch(() => null);
  return story
    ? { title: story.title, description: story.description }
    : { title: "Restoration Story" };
}

export default async function RestorationDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const story = await getPublicRestorationStoryBySlug(slug).catch(() => null);
  if (!story) notFound();

  const beforeSrc = publicMediaUrl(story.beforeImageId);
  const afterSrc = publicMediaUrl(story.afterImageId);

  return (
    <main className="public-site inner-site donation-site donation-detail-site">
      <SiteMotion showLoader={false} />
      <SiteHeader />
      <article className="donation-detail donation-restoration-detail">
        <Link className="donation-detail__back" href="/shoe-donation">← Back to Shoe Donation</Link>
        <div className="donation-detail__intro" data-reveal>
          <p className="donation-kicker">{story.category.replaceAll("_", " ")}</p>
          <div className="donation-update-meta"><span>{formatDate(story.storyDate)}</span></div>
          <h1>{story.title}</h1>
          <p>{story.description}</p>
        </div>
        {beforeSrc && afterSrc && (
          <div className="donation-detail__comparison" data-reveal>
            <BeforeAfterComparison beforeSrc={beforeSrc} afterSrc={afterSrc} title={story.title} />
          </div>
        )}
        <div className="donation-detail__body donation-detail__body--single" data-reveal>
          <div className="donation-detail__story">
            <h2>Restoration work performed</h2>
            {story.restorationWork.split("\n").filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
