import {
  STEAM_ASSISTED_DEEP_CLEAN_ID,
  steamCleaningBenefits,
  steamCleaningContent,
} from "@/lib/steam-cleaning";
import { ArrowUpRight } from "./SiteChrome";
import SteamBrushVisual from "./SteamBrushVisual";

const [homeHeadingLineOne, homeHeadingLineTwo, ...homeHeadingTail] =
  steamCleaningContent.homeHeading.split(" ");
const homeHeadingSecondLine = homeHeadingTail.slice(0, 2).join(" ");
const homeHeadingOutline = homeHeadingTail.slice(2).join(" ");

export default function SteamBrushHomeSection() {
  return (
    <section className="sd-steam-home sd-section" data-reveal>
      <div className="sd-steam-home-copy">
        <span className="sd-steam-badge">
          {steamCleaningContent.homeBadge}
        </span>
        <h2>
          {homeHeadingLineOne} {homeHeadingLineTwo}
          <br />
          {homeHeadingSecondLine} <span>{homeHeadingOutline}</span>
        </h2>
        <p className="sd-steam-home-description">
          {steamCleaningContent.homeDescription}
        </p>
        <p className="sd-steam-clarification">
          {steamCleaningContent.homeSupporting}
        </p>
        <div className="sd-steam-home-actions">
          <a
            className="sd-primary-button"
            href={`/?service=${STEAM_ASSISTED_DEEP_CLEAN_ID}#book`}
          >
            BOOK A STEAM CLEAN <ArrowUpRight />
          </a>
          <a className="sd-steam-explore" href="/services#steam-brush-cleaning">
            LEARN HOW IT WORKS <ArrowUpRight />
          </a>
        </div>
      </div>

      <SteamBrushVisual />

      <div
        className="sd-steam-benefits"
        aria-label="Steam-assisted deep clean benefits"
      >
        {steamCleaningBenefits.map((benefit, index) => (
          <article key={benefit}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{benefit}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}
