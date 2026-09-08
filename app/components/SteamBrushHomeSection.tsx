import {
  steamCleaningContent,
} from "@/lib/steam-cleaning";
import { ArrowUpRight } from "./SiteChrome";
import SteamBrushVisual from "./SteamBrushVisual";

export default function SteamBrushHomeSection({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <section
      aria-labelledby="steam-home-heading"
      className={`sd-steam-home sd-section${compact ? " sd-steam-home--compact" : ""}`}
      data-reveal
    >
      <div className="sd-steam-home-copy">
        <span className="sd-steam-badge">
          {steamCleaningContent.homeBadge}
        </span>
        <h2 id="steam-home-heading">
          STEAM <span>CLEANING.</span>
        </h2>
        <p className="sd-steam-home-description">
          {steamCleaningContent.serviceIntro}
        </p>
        <div className="sd-steam-home-actions">
          <a className="sd-steam-explore" href="/steam-cleaning">
            EXPLORE STEAM CLEANING <ArrowUpRight />
          </a>
        </div>
      </div>

      <SteamBrushVisual />
    </section>
  );
}
