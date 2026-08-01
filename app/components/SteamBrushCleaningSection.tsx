import {
  STEAM_ASSISTED_DEEP_CLEAN_ID,
  steamCleaningComparison,
  steamCleaningContent,
  steamCleaningProcess,
} from "@/lib/steam-cleaning";
import { ArrowUpRight } from "./SiteChrome";

const bestUsedFor = [
  "Textured rubber outsoles",
  "Deep outsole grooves",
  "Midsole edges",
  "Stitching lines",
  "Welt areas between the upper and sole",
  "Eyelet and tongue corners",
  "Durable mesh and selected synthetic surfaces",
  "Hard-to-reach detailed areas",
  "Stubborn and greasy surface buildup",
];

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
          <p className="sd-kicker">ADVANCED SHOE CLEANING TECHNOLOGY</p>
          <h2>{steamCleaningContent.serviceTitle}</h2>
          <p className="sd-steam-service-subheading">
            Not just washed. Steam-assisted.
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
          <p className="sd-kicker">BEST USED FOR</p>
          <ul>
            {bestUsedFor.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="sd-steam-service-bottom">
        <div className="sd-steam-comparison">
          <p className="sd-kicker">THE DIFFERENCE</p>
          <h3>
            REGULAR CLEANING.
            <br />
            DETAILED FURTHER.
          </h3>
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
        </div>

        <div className="sd-steam-information">
          <aside className="sd-steam-callout">
            <strong>STEAM HELPS LOOSEN THE DIRT</strong>
            <p>
              Steam does not make dirt disappear. It helps soften stubborn
              buildup so the detailing brush and microfiber towel can remove
              it more effectively.
            </p>
          </aside>
          <aside className="sd-steam-safety">
            <strong>MATERIAL-SAFE TREATMENT</strong>
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
