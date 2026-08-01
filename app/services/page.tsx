/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { listPublicServices } from "@/lib/data";
import ServiceMenu from "../components/ServiceMenu";
import SiteMotion from "../components/SiteMotion";
import SteamBrushCleaningSection from "../components/SteamBrushCleaningSection";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "../components/SiteChrome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Steam-Assisted Deep Clean & Shoe Cleaning Services | Shoe Doctor Nepal",
  },
  description:
    "Explore Shoe Doctor Nepal’s steam shoe cleaning in Nepal, with steam-assisted sneaker cleaning for detailed areas plus professional shoe cleaning in Hetauda, repair and restoration.",
};

const faqs = [
  {
    question: "What types of footwear do you treat?",
    answer:
      "Sneakers, running shoes, leather and formal shoes, boots, sandals, heels, kids’ shoes and more. We assess the material before recommending treatment.",
  },
  {
    question: "Are the website prices final?",
    answer:
      "The listed amount is the standard or starting price. Final pricing depends on material, stains, damage and condition, and is confirmed after diagnosis.",
  },
  {
    question: "Can every stain or damage be fixed?",
    answer:
      "We aim for the best possible result, but some stains, colour loss or structural damage may be permanent. We set clear expectations before starting.",
  },
  {
    question: "Can I request express service?",
    answer:
      "Yes. Express Wash & Dry is +Rs 199 and aims for 2–3 hours. Repair Priority is +Rs 150. Both depend on treatment and available capacity.",
  },
  {
    question: "What is Steam-Assisted Deep Clean?",
    answer:
      "It is a precision detailing process that combines controlled steam with a specialised brush. Steam helps loosen stubborn buildup while the brush lifts dirt from grooves, edges, seams and other difficult areas.",
  },
  {
    question: "Does steam replace regular shoe cleaning?",
    answer:
      "No. Steam-assisted detailing supports the normal cleaning process. Cleaning solution, brushing, wiping and controlled drying are still required.",
  },
  {
    question: "Is steam used on every shoe?",
    answer:
      "No. Every shoe is inspected first. Steam is used only on materials and areas considered suitable by the Shoe Doctor team.",
  },
  {
    question: "Can steam damage delicate shoes?",
    answer:
      "Too much heat or moisture can affect delicate materials, glue, paint and decorations. That is why we use controlled steam only after inspecting the shoe.",
  },
  {
    question: "Does steam completely sterilise shoes?",
    answer:
      "We offer steam-assisted cleaning and detailing, not medical sterilisation. The treatment focuses on loosening stubborn dirt and improving detailed cleaning.",
  },
];

export default async function ServicesPage() {
  const services = await listPublicServices();

  return (
    <main className="public-site inner-site">
      <SiteMotion />
      <SiteHeader />

      <section className="sd-page-hero services-hero">
        <p className="sd-kicker">The complete treatment menu</p>
        <h1>
          CLEAN. REPAIR.
          <br />
          <span>RESTORE. REPEAT.</span>
        </h1>
        <div className="sd-page-hero-bottom">
          <p>
            Every service is chosen after diagnosis, because suede, leather,
            mesh, canvas and synthetic footwear do not need the same care.
          </p>
          <a className="sd-primary-button" href="/#book">
            Book a treatment <ArrowUpRight />
          </a>
        </div>
      </section>

      <section className="sd-services-page sd-section">
        <ServiceMenu
          services={services}
          afterCategory={{ Cleaning: <SteamBrushCleaningSection /> }}
        />
      </section>

      <section className="sd-faq sd-section" data-reveal>
        <div>
          <p className="sd-kicker">Before treatment</p>
          <h2>GOOD QUESTIONS.<br />CLEAR ANSWERS.</h2>
        </div>
        <div className="sd-faq-list">
          {faqs.map((faq, index) => (
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

      <section className="sd-page-cta">
        <p>Choose the service now. We’ll confirm the exact treatment later.</p>
        <h2>YOUR NEXT FRESH<br />PAIR STARTS HERE.</h2>
        <a className="sd-primary-button" href="/#book">
          Book your pair <ArrowUpRight />
        </a>
      </section>

      <SiteFooter />
    </main>
  );
}
