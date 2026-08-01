/* eslint-disable @next/next/no-html-link-for-pages */
import {
  steamCleaningContent,
  steamCleaningProcess,
} from "@/lib/steam-cleaning";
import { ArrowUpRight } from "./SiteChrome";
import SteamBrushVisual from "./SteamBrushVisual";

export default function SteamBrushHomeSection() {
  return (
    <section className="sd-steam-home sd-section" data-reveal>
      <div className="sd-steam-home-copy">
        <span className="sd-steam-badge">{steamCleaningContent.badge}</span>
        <p className="sd-kicker">{steamCleaningContent.technologyLabel}</p>
        <h2>
          STEAM. BRUSH.
          <br />
          <span>DETAIL.</span>
        </h2>
        <h3>{steamCleaningContent.marketingClaim}</h3>
        <p className="sd-steam-home-description">
          Shoe Doctor introduces Steam Gun Brush Cleaning—a precision
          detailing process that combines controlled hot steam with a
          specialised brush. Steam helps soften stubborn dirt and greasy
          buildup while the brush lifts it from sole grooves, stitching lines,
          edges, seams and other difficult-to-reach areas.
        </p>
        <p className="sd-steam-clarification">
          Steam does not replace our regular cleaning process. Every suitable
          pair is first inspected, cleaned and brushed before controlled steam
          detailing is used where required.
        </p>
        <div className="sd-steam-home-actions">
          <a className="sd-steam-explore" href="/services#steam-brush-cleaning">
            Explore Steam Cleaning <ArrowUpRight />
          </a>
          <a className="sd-primary-button" href="/?service=deep-clean#book">
            Book Deep Clean <ArrowUpRight />
          </a>
        </div>
      </div>

      <SteamBrushVisual />

      <div
        className="sd-steam-benefits"
        aria-label="Steam brush cleaning benefits"
      >
        <article>
          <span>01</span>
          <h3>DEEPER DETAILING</h3>
          <p>Targets sole grooves, seams, edges and difficult corners.</p>
        </article>
        <article>
          <span>02</span>
          <h3>STEAM-ASSISTED CLEANING</h3>
          <p>
            Controlled steam helps soften embedded dirt and stubborn buildup.
          </p>
        </article>
        <article>
          <span>03</span>
          <h3>BRUSH AGITATION</h3>
          <p>
            The specialised brush physically lifts loosened dirt from textured
            areas.
          </p>
        </article>
        <article>
          <span>04</span>
          <h3>MATERIAL INSPECTION</h3>
          <p>Steam is used only on materials and areas considered suitable.</p>
        </article>
      </div>

      <div className="sd-steam-home-detail">
        <div>
          <p className="sd-kicker">DETAILING PROCESS</p>
          <h3>INSPECT. CLEAN.<br />DETAIL. DRY.</h3>
          <p>
            Steam brush detailing is included only within eligible Deep Clean
            or Premium Care treatments after diagnosis. Each pair is assessed
            before heat or moisture is used.
          </p>
        </div>
        <ol>
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
    </section>
  );
}
