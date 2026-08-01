import type { Metadata } from "next";
import SteamBrushAdvantage from "../components/SteamBrushAdvantage";
import SteamBrushCleaningSection from "../components/SteamBrushCleaningSection";
import SteamBrushVisual from "../components/SteamBrushVisual";
import SiteMotion from "../components/SiteMotion";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "../components/SiteChrome";
import {
  STEAM_ASSISTED_DEEP_CLEAN_ID,
  steamCleaningContent,
  steamCleaningFaqs,
} from "@/lib/steam-cleaning";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Steam Gun Brush Shoe Cleaning Services | Shoe Doctor Nepal",
  },
  description:
    "Explore Shoe Doctor's Steam Gun Brush Cleaning process, combining controlled steam and specialised brushing for sole grooves, seams, edges and difficult-to-reach areas.",
};

export default function SteamCleaningPage() {
  return (
    <main className="public-site inner-site">
      <SiteMotion />
      <SiteHeader />

      <section className="sd-page-hero services-hero" data-reveal>
        <span className="sd-steam-badge">
          {steamCleaningContent.serviceBadge}
        </span>
        <p className="sd-kicker">NEW AT SHOE DOCTOR</p>
        <h1>
          NEPAL&apos;S FIRST
          <br />
          <span>STEAM BRUSH CLEANING.</span>
        </h1>
        <div className="sd-page-hero-bottom">
          <p>
            A professional steam-assisted shoe-cleaning experience that pairs
            controlled steam with specialised brushing to detail suitable
            grooves, seams, edges and difficult corners.
          </p>
          <a
            className="sd-primary-button"
            href={`/?service=${STEAM_ASSISTED_DEEP_CLEAN_ID}#book`}
          >
            BOOK A STEAM CLEAN <ArrowUpRight />
          </a>
        </div>
      </section>

      <section className="sd-section sd-steam-page-visual" data-reveal>
        <SteamBrushVisual />
      </section>

      <SteamBrushAdvantage />

      <section className="sd-section">
        <SteamBrushCleaningSection />
      </section>

      <section className="sd-faq sd-section" data-reveal>
        <div>
          <p className="sd-kicker">Steam cleaning questions</p>
          <h2>
            GOOD QUESTIONS.
            <br />
            CLEAR ANSWERS.
          </h2>
        </div>
        <div className="sd-faq-list">
          {steamCleaningFaqs.map((faq, index) => (
            <details key={faq.question}>
              <summary>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{faq.question}</strong>
                <i>+</i>
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
