/* eslint-disable @next/next/no-html-link-for-pages */
import type { Service } from "@/lib/data";
import { formatNprPriceLabel } from "@/lib/money";
import { STEAM_ASSISTED_DEEP_CLEAN_ID } from "@/lib/steam-cleaning";
import styles from "./ServicesExperience.module.css";

export const bookingHref = (id: string) => `/?service=${encodeURIComponent(id)}#book`;
const groups = [
  { title: "Everyday Care", copy: "Routine maintenance and precision refreshes.", matches: (s: Service) => ["basic-clean", STEAM_ASSISTED_DEEP_CLEAN_ID].includes(s.id) },
  { title: "Intensive Care", copy: "Comprehensive cleaning and higher-level care for pairs that need more attention.", matches: (s: Service) => ["deep-clean", "premium-care"].includes(s.id) },
  { title: "Specialist Care", copy: "Material-specific care, restoration, repairs and optional add-ons.", matches: (s: Service) => !["basic-clean", STEAM_ASSISTED_DEEP_CLEAN_ID, "deep-clean", "premium-care"].includes(s.id) },
];
const bestFor: Record<string, string> = {
  "basic-clean": "Regular everyday dirt and routine shoe maintenance",
  [STEAM_ASSISTED_DEEP_CLEAN_ID]: "Regular-to-moderately dirty sneakers and quick refreshes",
  "deep-clean": "Heavy dirt, embedded stains, dirty inner lining and significant odor; comprehensive inside-and-out cleaning",
  "premium-care": "High-value pairs needing intensive cleaning and correction work",
  "full-restoration": "Discoloration, worn areas and damage that cleaning alone cannot solve",
  "delicate-materials": "Suede, nubuck and materials requiring specialist assessment",
};

export default function ServicesExperience({ services }: { services: Service[] }) {
  const guide = [
    ["Regular everyday dirt", "basic-clean"],
    ["A low-water precision refresh", STEAM_ASSISTED_DEEP_CLEAN_ID],
    ["Heavy stains or deeply dirty interiors", "deep-clean"],
    ["Delicate suede or nubuck", "delicate-materials"],
    ["Damage, discoloration or worn areas", "full-restoration"],
  ];
  return <>
    {groups.map((group) => {
      const items = services.filter(group.matches);
      return items.length > 0 && <section className={styles.group} key={group.title}>
        <h2>{group.title}</h2><p>{group.copy}</p>
        <div className={styles.grid}>{items.map((service) => {
          const steam = service.id === STEAM_ASSISTED_DEEP_CLEAN_ID;
          return <article key={service.id} id={service.id} data-service-card data-service-id={service.id} className={`${styles.card} ${steam ? styles.steam : ""}`}>
            <div className={styles.cardHead}>
              <h3>{service.name}{steam && <span className={styles.badge}>NEW</span>}</h3>
              <strong className={styles.price}>{formatNprPriceLabel(service.priceLabel)}</strong>
            </div>
            {service.specialPriceLabel && <p>{service.specialPriceLabel}</p>}
            {steam && <p><strong>Precision Steam + Brush Treatment</strong></p>}
            <p className={styles.muted}>{service.description}</p>
            {service.turnaround && <p className={styles.muted}>Estimated turnaround: {service.turnaround}</p>}
            <ul>{service.features.slice(0, 4).map((feature) => <li key={feature}>{feature}</li>)}</ul>
            {service.features.length > 4 && <details><summary>More inclusions</summary><ul>{service.features.slice(4).map((feature) => <li key={feature}>{feature}</li>)}</ul></details>}
            <p className={styles.best}><strong>Best for:</strong> {bestFor[service.id] ?? (service.category === "Repairs" ? "Targeted correction of damaged or worn areas" : service.category === "Add-ons" ? "Additional care for eligible pairs, after inspection" : "Care matched to your shoe’s material and condition")}</p>
            <div className={styles.actions}><a className={styles.button} href={bookingHref(service.id)}>Book This Service</a>{steam && <a className={styles.link} href="/steam-cleaning">Learn About Steam Cleaning →</a>}</div>
          </article>;
        })}</div>
      </section>;
    })}
    <section className={`${styles.section} ${styles.note}`}>
      <h2>Not sure which service you need?</h2>
      <div className={styles.guide}>{guide.map(([condition, id]) => {
        const service = services.find((item) => item.id === id);
        return service && <a key={id} href={`#${id}`}><span>{condition}</span><strong>{service.name} →</strong></a>;
      })}</div>
      <p>Still unsure? Book your pair and our team can recommend the right treatment after inspection.</p>
      <a className={styles.button} href="/#book">Book your pair</a>
    </section>
    <p className={styles.muted}>Prices marked “From”, “After diagnosis” or with a + are starting prices, inspection-based quotes or optional add-ons. Final scope and any extra work are confirmed before treatment.</p>
  </>;
}
