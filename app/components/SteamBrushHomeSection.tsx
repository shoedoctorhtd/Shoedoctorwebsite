import {
  STEAM_ASSISTED_DEEP_CLEAN_ID,
  steamCleaningContent,
} from "@/lib/steam-cleaning";
import { ArrowUpRight } from "./SiteChrome";
import SteamBrushAdvantage from "./SteamBrushAdvantage";
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
          <a className="sd-steam-explore" href="/steam-cleaning">
            LEARN HOW IT WORKS <ArrowUpRight />
          </a>
        </div>
      </div>

      <SteamBrushVisual />
      <SteamBrushAdvantage />
    </section>
  );
}
