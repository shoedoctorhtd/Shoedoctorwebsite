import type { Metadata } from "next";
import { listPublicServices } from "@/lib/data";
import ServicesExperience from "../components/ServicesExperience";
import styles from "../components/ServicesExperience.module.css";
import SiteMotion from "../components/SiteMotion";
import {
  SiteFooter,
  SiteHeader,
} from "../components/SiteChrome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Shoe Cleaning, Repair & Restoration Services | Shoe Doctor Nepal",
  },
  description:
    "Explore Shoe Doctor Nepal's professional shoe cleaning in Hetauda, repair and restoration services. Compare routine cleaning, precision Steam Cleaning, intensive Deep Cleaning and specialist care with current prices.",
  alternates: { canonical: "/services" },
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
      "Yes. Express Wash & Dry and Repair Priority are available only when the treatment and capacity allow it. The current service card shows the applicable add-on amount before you book.",
  },
];

export default async function ServicesPage() {
  const services = await listPublicServices();

  return (
    <main id="main-content" className="public-site inner-site">
      <SiteMotion />
      <SiteHeader />

      <div className={styles.wrap}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>The treatment menu</p>
          <h1>Shoe Care for Every Condition</h1>
          <p>From everyday cleaning to deep treatment, steam-assisted care and full restoration — choose the level of care your shoes actually need.</p>
        </header>
        <ServicesExperience services={services} />
      </div>

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

      <SiteFooter />
    </main>
  );
}
