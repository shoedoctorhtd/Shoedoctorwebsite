import type { Metadata } from "next";
import { listPublicServices } from "@/lib/data";
import { formatNprPriceLabel } from "@/lib/money";
import { STEAM_ASSISTED_DEEP_CLEAN_ID, steamCleaningContent } from "@/lib/steam-cleaning";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import SiteMotion from "../components/SiteMotion";
import { bookingHref } from "../components/ServicesExperience";
import styles from "../components/ServicesExperience.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Steam Shoe Cleaning in Hetauda | Shoe Doctor" },
  description: "Professional steam-assisted shoe cleaning in Hetauda using controlled steam, brushing and material-specific care for sneakers, soles and everyday footwear.",
  alternates: { canonical: "/steam-cleaning" },
};
const steps = [
  ["Inspect", "We check the shoe material, stains, glue condition and existing damage."],
  ["Steam + Brush", "Controlled steam is applied using a professional steam gun while the surface is gently brushed."],
  ["Lift & Remove Dirt", "Loosened dirt is removed using microfiber and detailing techniques, with suitable cleaning solution where required."],
  ["Controlled Drying & Finish", "The shoe is carefully dried and given a final material-specific finish."],
];
const benefits = [
  ["Loosens Surface Dirt", "Heat, moisture and brushing help release stubborn surface grime."],
  ["Precision Cleaning", "Useful around seams, textured surfaces, midsoles and difficult areas."],
  ["Reduced Water Saturation", "Targets dirty areas without unnecessarily soaking the entire shoe."],
  ["Efficient Refresh", "Ideal for regular-to-moderately dirty shoes that do not require an intensive Deep Clean."],
];
const steamUses = ["Everyday sneaker dirt and light-to-moderate stains", "Dirty midsoles and rubber edges", "Textured soles, grooves and seams", "Mesh and many synthetic sneakers, after inspection", "A quick professional refresh with reduced water saturation"];
const deepUses = ["Heavy mud or deeply embedded dirt", "Significant inner-lining contamination", "Strong persistent odor", "Heavy staining requiring intensive stain treatment", "Multiple heavily contaminated areas", "Comprehensive inside-and-out cleaning"];
const faqs = [
  ["Does Steam Cleaning mean the shoe is placed inside a steam machine?", "No. We use controlled steam from a professional steam gun combined with brushing and detailing directly on appropriate areas of the shoe."],
  ["Will my entire shoe be soaked?", "Steam-assisted cleaning uses targeted moisture and normally reduces unnecessary water saturation compared with heavily wet cleaning methods."],
  ["Does Steam Cleaning use cleaning products?", "Cleaning solution may be used when stains or dirt require it. Steam works alongside brushing and wiping; the treatment is not automatically chemical-free."],
  ["Can you Steam Clean suede?", "Suede and nubuck require specialist assessment. They should not automatically receive the same steam treatment used on rubber or synthetic sneakers."],
  ["Can Steam Cleaning remove every stain?", "No cleaning method can guarantee removal of every stain. Deep or permanent staining may require Deep Cleaning or Restoration, and some marks may remain."],
  ["Does Steam Cleaning kill bacteria or fungus?", "This is a cleaning service. We do not guarantee sterilization, complete fungus removal or a specific bacteria kill percentage."],
  ["Which should I choose: Steam Cleaning or Deep Cleaning?", "Steam Cleaning suits regular-to-moderately dirty shoes and precision refreshing. Deep Cleaning is designed for heavily soiled shoes, stubborn stains, dirty interiors and more intensive treatment."],
];
function Items({ items }: { items: string[] }) { return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>; }

export default async function SteamCleaningPage() {
  const services = await listPublicServices();
  const steam = services.find((service) => service.id === STEAM_ASSISTED_DEEP_CLEAN_ID);
  const deep = services.find((service) => service.id === "deep-clean");
  return <main id="main-content" className="public-site inner-site">
    <SiteMotion /><SiteHeader />
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Material-specific shoe care <span className={styles.badge}>NEW</span></p>
          <h1>Steam Cleaning</h1>
          <p><strong>Precision steam + brush treatment for your shoes.</strong></p>
          <p>Controlled steam, brushing and material-specific cleaning help loosen dirt from hard-to-clean areas while reducing unnecessary water saturation.</p>
          {steam ? <>
            <div className={styles.price}>{formatNprPriceLabel(steam.priceLabel)}</div>
            {steam.specialPriceLabel && <p>{steam.specialPriceLabel}</p>}
            {steam.turnaround && <p>Estimated turnaround: {steam.turnaround}</p>}
            <p>{steam.description}</p>
          </> : <p>Steam Cleaning is currently unavailable for booking. Our team can recommend another suitable treatment.</p>}
          <div className={styles.actions}>
            <a className={styles.button} href={steam ? bookingHref(steam.id) : "/#book"}>{steam ? "Book Steam Cleaning" : "Find a treatment"}</a>
            <a className={styles.link} href="#compare">Compare With Deep Clean</a>
          </div>
        </div>
        <picture><source media="(max-width: 760px)" srcSet="/images/steam-brush-cleaning-mobile.webp" /><img src={steamCleaningContent.image.src} alt={steamCleaningContent.image.alt} width="768" height="512" /></picture>
      </header>
      <section className={styles.section}>
        <h2>How it works</h2>
        <div className={styles.four}>{steps.map(([title, copy], index) => <article key={title}><span className={styles.step}>{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>
      <section className={styles.section}>
        <h2>Why Steam-Assisted Cleaning?</h2>
        <p className={styles.muted}>Steam supports the cleaning process. Professional brushing, wiping and appropriate cleaning products may also be used where necessary.</p>
        <div className={styles.four}>{benefits.map(([title, copy]) => <article className={styles.card} key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>
      <section id="compare" className={styles.section}>
        <h2>Steam Cleaning vs Deep Clean</h2>
        <p>Neither service is universally better — the right treatment depends on the condition of the shoe.</p>
        <div className={styles.grid}>
          <article className={styles.card}><h3>Steam Cleaning: best for</h3><Items items={steamUses} />{steam && <a className={styles.link} href={bookingHref(steam.id)}>Book Steam Cleaning →</a>}</article>
          <article className={`${styles.card} ${styles.note}`}><h3>When should I choose Deep Cleaning instead?</h3><p>Choose comprehensive intensive cleaning when your shoes have:</p><Items items={deepUses} />{deep && <a className={styles.link} href={`/services#${deep.id}`}>View Deep Cleaning →</a>}</article>
        </div>
      </section>
      <section className={styles.section}>
        <h2>Is Steam Cleaning suitable for every shoe?</h2>
        <p>Not every shoe should receive the same treatment. Before cleaning, our team inspects the material, age, construction and condition of the shoe and adjusts the cleaning method accordingly.</p>
        <div className={styles.grid}>
          <article className={styles.card}><h3>Common candidates, after inspection</h3><Items items={["Rubber", "Many synthetic materials", "Mesh and canvas", "Many smooth-leather sneakers"]} /></article>
          <article className={styles.card}><h3>Requires specialist assessment</h3><Items items={["Suede and nubuck", "Vintage sneakers", "Repainted or customized shoes", "Shoes with existing glue separation", "Delicate coatings and materials"]} /></article>
        </div>
        <p className={styles.muted}>These are general guides, not a universal material guarantee.</p>
        <aside className={styles.note}><strong>Controlled application matters.</strong><p>Our team does not hold concentrated steam continuously on one area. Steam exposure, brush type and cleaning technique are adjusted according to the shoe material and condition.</p></aside>
      </section>
      <section className={`${styles.section} ${styles.faq}`}><h2>Steam Cleaning questions</h2>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    </div>
    <SiteFooter />
  </main>;
}
