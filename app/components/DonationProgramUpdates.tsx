/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import BeforeAfterComparison from "./BeforeAfterComparison";
import type {
  CommunityUpdate,
  DonationDrive,
  RestorationStory,
} from "@/lib/csr-data";

type DonationProgramUpdatesProps = {
  latestDrive: DonationDrive | null;
  donationDrives: DonationDrive[];
  restorationStories: RestorationStory[];
  communityUpdates: CommunityUpdate[];
  loadError?: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NP", { dateStyle: "long" }).format(
    new Date(value),
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-NP").format(value);
}

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

export default function DonationProgramUpdates({
  latestDrive,
  donationDrives,
  restorationStories,
  communityUpdates,
  loadError = false,
}: DonationProgramUpdatesProps) {
  const completedDrives = donationDrives.filter(
    (drive) => drive.status === "completed",
  );
  const latestDriveImage = latestDrive?.coverImageUrl ?? null;

  if (loadError) {
    return (
      <section
        className="donation-latest-drive donation-section"
        aria-labelledby="programme-error-title"
      >
        <div className="donation-content-empty donation-content-error" data-reveal>
          <span aria-hidden="true">!</span>
          <strong id="programme-error-title">
            Programme updates are temporarily unavailable.
          </strong>
          <p>
            The donation form remains available. Please check back shortly for
            verified drive, restoration, and community updates.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        className="donation-latest-drive donation-section"
        aria-labelledby="latest-drive-title"
      >
        <div className="donation-section-heading" data-reveal>
          <div>
            <p className="donation-kicker">Donation-drive update</p>
            <h2 id="latest-drive-title">What we&apos;re doing next.</h2>
          </div>
          <p>
            Follow the collection, restoration, and sharing work behind every
            Shoe Doctor donation drive.
          </p>
        </div>
        {latestDrive ? (
          <article
            className={`donation-featured-drive${latestDriveImage ? "" : " donation-featured-drive--text-only"}`}
            data-reveal
          >
            {latestDriveImage && (
              <div className="donation-featured-drive__media">
                <img
                  src={latestDriveImage}
                  alt={`${latestDrive.title} donation drive in ${latestDrive.location}`}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
            <div className="donation-featured-drive__copy">
              <div className="donation-update-meta">
                <span>{formatDate(latestDrive.driveDate)}</span>
                <span>{latestDrive.location}</span>
                {latestDrive.partnerOrganization && (
                  <span>{latestDrive.partnerOrganization}</span>
                )}
              </div>
              <h3>{latestDrive.title}</h3>
              <p>{latestDrive.shortDescription}</p>
              <div className="donation-featured-drive__numbers" aria-label="Drive impact">
                <span><strong>{formatNumber(latestDrive.pairsCollected)}</strong> collected</span>
                <span><strong>{formatNumber(latestDrive.pairsRestored)}</strong> restored</span>
                <span><strong>{formatNumber(latestDrive.pairsDonated)}</strong> donated</span>
              </div>
              <a
                className="donation-button donation-button--secondary"
                href={
                  latestDrive.ctaLink ||
                  `/shoe-donation/updates/${latestDrive.slug}`
                }
              >
                {latestDrive.ctaText || "Read update"} <Arrow />
              </a>
            </div>
          </article>
        ) : (
          <div className="donation-content-empty" data-reveal>
            <span aria-hidden="true">✦</span>
            <strong>Updates coming soon.</strong>
            <p>Our next donation-drive announcement will appear here.</p>
          </div>
        )}
      </section>

      {restorationStories.length > 0 && (
        <section
          className="donation-restoration-showcase donation-section"
          aria-labelledby="restoration-showcase-title"
        >
          <div className="donation-section-heading" data-reveal>
            <div>
              <p className="donation-kicker">Restoration stories</p>
              <h2 id="restoration-showcase-title">The care behind a second journey.</h2>
            </div>
            <p>
              Drag the slider to see the restoration work that helps each pair
              move forward with dignity.
            </p>
          </div>
          <div className="donation-restoration-grid">
            {restorationStories.map((story) => {
              const beforeSrc = story.beforeImageUrl;
              const afterSrc = story.afterImageUrl;
              const hasComparison = Boolean(beforeSrc && afterSrc);
              return (
                <article
                  className={`donation-restoration-card${hasComparison ? "" : " donation-restoration-card--text-only"}`}
                  data-reveal
                  key={story.id}
                >
                  {hasComparison && beforeSrc && afterSrc && (
                    <BeforeAfterComparison
                      beforeSrc={beforeSrc}
                      afterSrc={afterSrc}
                      title={story.title}
                    />
                  )}
                  <div className="donation-restoration-card__copy">
                    <div className="donation-update-meta">
                      <span>{story.category.replaceAll("_", " ")}</span>
                      <span>{formatDate(story.storyDate)}</span>
                    </div>
                    <h3>{story.title}</h3>
                    <p>{story.description}</p>
                    <p className="donation-restoration-card__work">
                      <strong>Restoration work:</strong> {story.restorationWork}
                    </p>
                    <Link href={`/shoe-donation/restorations/${story.slug}`}>
                      Read the restoration story <Arrow />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {communityUpdates.length > 0 && (
        <section
          className="donation-community-updates donation-section"
          aria-labelledby="community-updates-title"
        >
          <div className="donation-section-heading" data-reveal>
            <div>
              <p className="donation-kicker">Community updates</p>
              <h2 id="community-updates-title">Where the pairs go.</h2>
            </div>
            <p>
              These are the schools, organizations, and communities helping
              donated footwear find its next purpose.
            </p>
          </div>
          <div className="donation-community-grid">
            {communityUpdates.map((update) => {
              const image = update.coverImageUrl ?? update.galleryImageUrls[0] ?? null;
              return (
                <article className="donation-community-card" data-reveal key={update.id}>
                  {image && (
                    <div className="donation-community-card__media">
                      <img
                        src={image}
                        alt={`${update.title} donation update for ${update.recipientOrganization}`}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  <div className="donation-community-card__copy">
                    <div className="donation-update-meta">
                      <span>{formatDate(update.updateDate)}</span>
                      <span>{update.location}</span>
                    </div>
                    <h3>{update.title}</h3>
                    <p>{update.recipientOrganization}</p>
                    <strong>{formatNumber(update.shoesDonated)} pairs donated</strong>
                    <Link href={`/shoe-donation/updates/${update.slug}`}>
                      Read update <Arrow />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {completedDrives.length > 0 && (
        <section
          className="donation-drive-gallery donation-section"
          aria-labelledby="drive-gallery-title"
        >
          <div className="donation-section-heading" data-reveal>
            <div>
              <p className="donation-kicker">Donation-drive gallery</p>
              <h2 id="drive-gallery-title">Completed drives, shared impact.</h2>
            </div>
            <p>
              A transparent record of the pairs collected, restored, and
              donated through each completed drive.
            </p>
          </div>
          <div className="donation-drive-gallery__grid">
            {completedDrives.map((drive) => {
              const image = drive.coverImageUrl;
              return (
                <article
                  className={`donation-drive-gallery__card${image ? "" : " donation-drive-gallery__card--text-only"}`}
                  data-reveal
                  key={drive.id}
                >
                  {image && (
                    <div>
                      <img
                        src={image}
                        alt={`${drive.title} donation drive in ${drive.location}`}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  <p>{formatDate(drive.driveDate)} · {drive.location}</p>
                  <h3>{drive.title}</h3>
                  <dl>
                    <div><dt>Collected</dt><dd>{formatNumber(drive.pairsCollected)}</dd></div>
                    <div><dt>Restored</dt><dd>{formatNumber(drive.pairsRestored)}</dd></div>
                    <div><dt>Donated</dt><dd>{formatNumber(drive.pairsDonated)}</dd></div>
                  </dl>
                  <Link href={`/shoe-donation/updates/${drive.slug}`}>Read update <Arrow /></Link>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
