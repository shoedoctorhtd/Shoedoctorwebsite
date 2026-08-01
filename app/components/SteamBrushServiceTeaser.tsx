import { steamCleaningContent } from "@/lib/steam-cleaning";
import { ArrowUpRight } from "./SiteChrome";
import styles from "./SteamBrushServiceTeaser.module.css";

export default function SteamBrushServiceTeaser() {
  return (
    <section
      className={styles.teaser}
      id="steam-brush-cleaning"
      data-reveal
      aria-labelledby="steam-service-teaser-heading"
    >
      <div className={styles.heading} data-teaser-item="heading">
        <span className="sd-steam-badge">
          {steamCleaningContent.serviceBadge}
        </span>
        <p className="sd-kicker">NEW AT SHOE DOCTOR</p>
        <h2 id="steam-service-teaser-heading">
          STEAM-ASSISTED
          <br />
          <span>DEEP CLEAN.</span>
        </h2>
      </div>

      <div className={styles.copy}>
        <p data-teaser-item="intro">{steamCleaningContent.serviceIntro}</p>
        <p className={styles.note} data-teaser-item="note">
          <strong>MATERIAL CHECKED FIRST</strong>
          Steam is used only on areas that are suitable for the shoe&apos;s
          material, adhesive and overall condition.
        </p>
        <div className={styles.actions} data-teaser-item="action">
          <a className="sd-primary-button" href="/steam-cleaning">
            KNOW MORE ABOUT STEAM CLEANING <ArrowUpRight />
          </a>
        </div>
      </div>
    </section>
  );
}
