import {
  STEAM_ASSISTED_DEEP_CLEAN_ID,
  steamCleaningBestUsedFor,
  steamCleaningComparison,
  steamCleaningContent,
  steamCleaningProcess,
} from "@/lib/steam-cleaning";
import { ArrowUpRight } from "./SiteChrome";

export default function SteamBrushCleaningSection() {
  return (
    <section
      className="sd-steam-service"
      id="steam-brush-cleaning"
      data-reveal
    >
      <header className="sd-steam-service-header">
        <div>
          <span className="sd-steam-badge">
            {steamCleaningContent.serviceBadge}
          </span>
          <p className="sd-kicker">WHAT IS STEAM CLEANING?</p>
          <h2>{steamCleaningContent.serviceTitle}</h2>
          <p className="sd-steam-service-subheading">
            Precision care. Less soaking.
          </p>
        </div>
        <div className="sd-steam-service-copy">
          <p className="sd-steam-service-intro">
            {steamCleaningContent.serviceIntro}
          </p>
        </div>
      </header>

      <div className="sd-steam-service-main">
        <div>
          <div className="sd-steam-section-title">
            <p className="sd-kicker">HOW IT WORKS</p>
            <h3>DETAIL WITH A PLAN.</h3>
          </div>
          <ol className="sd-steam-steps">
            {steamCleaningProcess.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="sd-steam-best-used">
          <p className="sd-kicker">BEST FOR, AFTER INSPECTION</p>
          <ul>
            {steamCleaningBestUsedFor.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="sd-steam-service-bottom">
        <div className="sd-steam-comparison">
          <p className="sd-kicker">BASIC, STEAM OR DEEP?</p>
          <h3>
            CHOOSE THE
            <br />
            RIGHT CLEAN.
          </h3>
          <p>
            <strong>Basic Cleaning: routine maintenance.</strong> For lightly
            dirty shoes, everyday dust and regular upkeep.
          </p>
          <div>
            {steamCleaningComparison.map((column) => (
              <article key={column.title}>
                <strong>{column.title}</strong>
                <ul>
                  {column.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p>
            Steam Cleaning is not better than Deep Cleaning. They suit
            different levels and types of dirt: a targeted refresh or
            comprehensive inside-and-out care.
          </p>
        </div>

        <div className="sd-steam-information">
          <aside className="sd-steam-callout">
            <strong>LOW-WATER PRECISION CLEANING</strong>
            <p>
              Steam is still water. Targeting dirty areas uses less liquid
              water than heavily wetting or soaking the whole shoe. This makes
              it an efficient refresh for regular-to-moderate surface dirt.
            </p>
          </aside>
          <aside className="sd-steam-safety">
            <strong>CONTROLLED APPLICATION MATTERS</strong>
            <p>{steamCleaningContent.serviceSafety}</p>
          </aside>
        </div>
      </div>

      <div className="sd-steam-service-actions">
        <a
          className="sd-primary-button"
          href={`/?service=${STEAM_ASSISTED_DEEP_CLEAN_ID}#book`}
        >
          LET US DIAGNOSE YOUR PAIR <ArrowUpRight />
        </a>
      </div>
    </section>
  );
}
