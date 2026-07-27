/* eslint-disable @next/next/no-html-link-for-pages */
import { listPublicServices } from "@/lib/data";
import ServiceMenu from "../components/ServiceMenu";
import SiteMotion from "../components/SiteMotion";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "../components/SiteChrome";

export const dynamic = "force-dynamic";

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
        <ServiceMenu services={services} />
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
