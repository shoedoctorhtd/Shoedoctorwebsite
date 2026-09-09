import type { Metadata } from "next";
import styles from "./SteamCleaningPage.module.css";
import { listPublicServices } from "@/lib/data";
import { formatNprPriceLabel } from "@/lib/money";
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
    absolute: "Steam Cleaning: Precision Steam + Brush | Shoe Doctor Nepal",
  },
  description:
    "Discover controlled steam gun and brush cleaning for everyday grime, soles and seams. Compare Steam and Deep Cleaning, material suitability and care at Shoe Doctor.",
  alternates: { canonical: "/steam-cleaning" },
};

export default async function SteamCleaningPage() {
  const services = await listPublicServices();
  const steamService = services.find(
    (service) => service.id === STEAM_ASSISTED_DEEP_CLEAN_ID,
  );
  const delicateService = services.find(
    (service) => service.id === "delicate-materials",
  );

  return (
    <main id="main-content" className={`public-site inner-site ${styles.page}`}>
      <SiteMotion />
      <SiteHeader />

      <section className="sd-page-hero services-hero" data-reveal>
        <span className="sd-steam-badge">
          {steamCleaningContent.serviceBadge}
        </span>
        <p className="sd-kicker">Precision Steam + Brush Treatment</p>
        <h1>
          STEAM
          <br />
          <span>CLEANING.</span>
        </h1>
        <div className="sd-page-hero-bottom">
          <p>
            Controlled steam-assisted cleaning designed to loosen dirt from
            shoes while reducing unnecessary water saturation.
            {steamService && (
              <>
                {" "}
                <strong>{formatNprPriceLabel(steamService.priceLabel)}</strong>
              </>
            )}
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

      <section className={`sd-section ${styles.details}`}>
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
              <p>
                {faq.answer}
                {delicateService &&
                  faq.question === "Can suede or nubuck be Steam Cleaned?" && (
                    <>
                      {" "}
                      <a href={`/?service=${delicateService.id}#book`}>
                        Explore suede and nubuck care.
                      </a>
                    </>
                  )}
              </p>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
