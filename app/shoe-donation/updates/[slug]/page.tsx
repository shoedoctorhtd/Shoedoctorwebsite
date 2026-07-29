/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteMotion from "@/app/components/SiteMotion";
import { ArrowUpRight, SiteFooter, SiteHeader } from "@/app/components/SiteChrome";
import {
  getPublicCommunityUpdateBySlug,
  getPublicDonationDriveBySlug,
} from "@/lib/csr-data";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

function publicMediaUrl(id: string | null) {
  return id ? `/api/csr-media/${encodeURIComponent(id)}` : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NP", { dateStyle: "long" }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-NP").format(value);
}

async function getUpdate(slug: string) {
  const drive = await getPublicDonationDriveBySlug(slug);
  if (drive) return { kind: "drive" as const, item: drive };
  const update = await getPublicCommunityUpdateBySlug(slug);
  return update ? { kind: "community" as const, item: update } : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const update = await getUpdate(slug).catch(() => null);
  if (!update) return { title: "Donation Update" };
  const description = update.kind === "drive"
    ? update.item.shortDescription
    : update.item.story.slice(0, 160);
  return { title: update.item.title, description };
}

export default async function DonationUpdateDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const update = await getUpdate(slug).catch(() => null);
  if (!update) notFound();

  if (update.kind === "drive") {
    const drive = update.item;
    const image = publicMediaUrl(drive.coverImageId);
    return (
      <main className="public-site inner-site donation-site donation-detail-site">
        <SiteMotion showLoader={false} />
        <SiteHeader />
        <article className="donation-detail">
          <Link className="donation-detail__back" href="/shoe-donation">← Back to Shoe Donation</Link>
          <div className="donation-detail__intro" data-reveal>
            <p className="donation-kicker">Donation drive update</p>
            <div className="donation-update-meta"><span>{formatDate(drive.driveDate)}</span><span>{drive.location}</span>{drive.partnerOrganization && <span>{drive.partnerOrganization}</span>}</div>
            <h1>{drive.title}</h1>
            <p>{drive.shortDescription}</p>
          </div>
          {image && <div className="donation-detail__hero" data-reveal><img src={image} alt={`${drive.title} donation drive in ${drive.location}`} decoding="async" /></div>}
          <div className="donation-detail__body" data-reveal>
            <div className="donation-detail__story">
              {drive.fullStory.split("\n").filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
            <aside className="donation-detail__impact">
              <span>Drive impact</span>
              <dl>
                <div><dt>Goal</dt><dd>{formatNumber(drive.goalPairs)}</dd></div>
                <div><dt>Collected</dt><dd>{formatNumber(drive.pairsCollected)}</dd></div>
                <div><dt>Restored</dt><dd>{formatNumber(drive.pairsRestored)}</dd></div>
                <div><dt>Donated</dt><dd>{formatNumber(drive.pairsDonated)}</dd></div>
              </dl>
              {drive.ctaLink && <a className="donation-button donation-button--secondary" href={drive.ctaLink}>{drive.ctaText || "Find out more"} <ArrowUpRight /></a>}
            </aside>
          </div>
        </article>
        <SiteFooter />
      </main>
    );
  }

  const community = update.item;
  const gallery = [community.coverImageId, ...community.galleryImageIds]
    .filter((id): id is string => Boolean(id))
    .map(publicMediaUrl)
    .filter((url): url is string => Boolean(url));
  return (
    <main className="public-site inner-site donation-site donation-detail-site">
      <SiteMotion showLoader={false} />
      <SiteHeader />
      <article className="donation-detail">
        <Link className="donation-detail__back" href="/shoe-donation">← Back to Shoe Donation</Link>
        <div className="donation-detail__intro" data-reveal>
          <p className="donation-kicker">Community update</p>
          <div className="donation-update-meta"><span>{formatDate(community.updateDate)}</span><span>{community.location}</span></div>
          <h1>{community.title}</h1>
          <p>{community.recipientOrganization} · {formatNumber(community.shoesDonated)} pairs donated</p>
        </div>
        {gallery.length > 0 && <div className="donation-detail__gallery" data-reveal>{gallery.map((image, index) => <img src={image} alt={`Image ${index + 1} from ${community.title} at ${community.recipientOrganization}`} loading="lazy" decoding="async" key={`${image}-${index}`} />)}</div>}
        <div className="donation-detail__body donation-detail__body--single" data-reveal>
          <div className="donation-detail__story">
            {community.story.split("\n").filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
