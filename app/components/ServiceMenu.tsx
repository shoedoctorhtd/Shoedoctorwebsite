/* eslint-disable @next/next/no-html-link-for-pages */
import { Fragment, type ReactNode } from "react";
import { SERVICE_CATEGORIES, type Service, type ServiceCategory } from "@/lib/data";
import { formatNprPriceLabel } from "@/lib/money";
import { STEAM_ASSISTED_DEEP_CLEAN_ID } from "@/lib/steam-cleaning";
import { ArrowUpRight } from "./SiteChrome";
import BeforeAfterComparison from "./BeforeAfterComparison";

const categoryCopy: Record<ServiceCategory, { label: string; title: string; intro: string }> = {
  Cleaning: { label: "01 · Cleaning", title: "CLEAN. FRESH. READY.", intro: "From everyday maintenance to intensive care. Every pair starts with a material check." },
  Repairs: { label: "02 · Repairs", title: "FIX THE DAMAGE.", intro: "Stitch, bond or repaint. Explore the details, then book the work your pair needs." },
  "Add-ons": { label: "03 · Add-ons", title: "CARE, YOUR WAY.", intro: "Specialist materials and priority care, matched to your treatment after inspection." },
};
const primaryIds = ["basic-clean", "deep-clean", STEAM_ASSISTED_DEEP_CLEAN_ID, "premium-care"];
const positioning: Record<string, string> = {
  "basic-clean": "Everyday maintenance",
  [STEAM_ASSISTED_DEEP_CLEAN_ID]: "Precision Steam + Brush Treatment",
  "deep-clean": "Intensive inside-and-out cleaning",
  "premium-care": "Deep care + corrective finishing",
};
function bookingHref(service: Service) { return `/?service=${encodeURIComponent(service.id)}#book`; }
function displayName(service: Service) {
  return service.id === STEAM_ASSISTED_DEEP_CLEAN_ID && service.name === "Steam-Assisted Deep Clean" ? "Steam Cleaning" : service.name;
}
function publicServiceBadge(badge: string | null) {
  if (!badge) return null;
  return /\b(?:nepal['’]s first|first(?:\s+time)?\s+in\s+nepal)\b/iu.test(badge) ? "New at Shoe Doctor" : badge;
}
function priceContext(priceLabel: string) {
  const normalized = priceLabel.trim().toLowerCase();
  if (normalized.startsWith("+")) return "Optional add-on";
  if (/\bafter\s+(?:diagnosis|inspection)\b/iu.test(normalized)) return "Quoted after diagnosis";
  if (normalized.startsWith("from ")) return "Starting price";
  return "Standard service price";
}
function ServicePrice({ service }: { service: Service }) {
  return <div className="service-price-copy">
    <span>{priceContext(service.priceLabel)}</span>
    <strong>{formatNprPriceLabel(service.priceLabel)}</strong>
    {service.specialPriceLabel && <em>{service.specialPriceLabel}</em>}
  </div>;
}
function BookLink({ service }: { service: Service }) {
  return <a className="service-book-link" href={bookingHref(service)} aria-label={`Book ${displayName(service)}`}>Book now <ArrowUpRight /></a>;
}
function ServiceRow({ service }: { service: Service }) {
  return <div className="service-row" id={service.id} data-service-id={service.id}>
    <details>
      <summary><span className="service-row-name">{displayName(service)}</span><strong>{formatNprPriceLabel(service.priceLabel)}</strong><span className="service-row-toggle" aria-hidden="true">+</span></summary>
      <div className="service-row-content">
        <p>{service.description}</p>
        {service.turnaround && <p className="menu-turnaround">Estimated turnaround: {service.turnaround}</p>}
        <ul>{service.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
        <p className="service-row-price-note">{priceContext(service.priceLabel)}{service.specialPriceLabel && <> · {service.specialPriceLabel}</>}</p>
      </div>
    </details>
    <BookLink service={service} />
  </div>;
}
function ServiceCard({ service, index }: { service: Service; index: number }) {
  const steam = service.id === STEAM_ASSISTED_DEEP_CLEAN_ID;
  const badge = steam ? "NEW" : publicServiceBadge(service.badge);
  return <article className={`menu-card ${service.tone}`} id={steam ? "steam-brush-cleaning" : service.id} data-service-card data-service-id={service.id} data-reveal>
    <div className="menu-card-top">
      <span className="menu-number">{String(index + 1).padStart(2, "0")} / Treatment</span>
      {badge && <span className="menu-badge">{badge}</span>}
      <span className="menu-icon" aria-hidden="true">{steam ? <svg viewBox="0 0 32 32"><path d="M8 24c-7-8 7-9 0-17M16 24c-7-8 7-9 0-17M24 24c-7-8 7-9 0-17" /></svg> : service.icon}</span>
    </div>
    <div className="service-card-heading"><h3>{displayName(service)}</h3><ServicePrice service={service} /></div>
    <p className="service-positioning">{positioning[service.id]}</p>
    <p className="menu-description">{service.description}</p>
    <ul>{service.features.slice(0, 3).map((feature) => <li key={feature}>{feature}</li>)}</ul>
    {service.features.length > 3 && <details className="service-more"><summary>All inclusions</summary><ul>{service.features.slice(3).map((feature) => <li key={feature}>{feature}</li>)}</ul></details>}
    <div className="service-card-bottom">
      {service.turnaround && <p className="menu-turnaround">{service.turnaround}</p>}
      <div className="service-card-actions">{steam && <a className="service-learn-link" href="/steam-cleaning">Learn More →</a>}<BookLink service={service} /></div>
    </div>
  </article>;
}
function RestorationFeature({ service }: { service: Service }) {
  return <section className="service-restoration" id={service.id} data-service-id={service.id} aria-labelledby="restoration-title">
    <div className="service-restoration-copy" data-reveal>
      <p className="sd-kicker">Beyond cleaning.</p>
      <h2 id="restoration-title">SOME PAIRS NEED<br /><span>MORE THAN A WASH.</span></h2>
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <p className="service-restoration-scope">Repainting. Re-gluing. Stitching. A treatment plan for damage, discoloration and worn areas.</p>
      <ServicePrice service={service} />
      {service.turnaround && <p className="menu-turnaround">{service.turnaround}</p>}
      <details className="service-more"><summary>Explore treatment inclusions</summary><ul>{service.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></details>
      <BookLink service={service} />
    </div>
    <figure data-reveal>
      <BeforeAfterComparison beforeSrc="/sneaker-cleaning-dirty.webp" afterSrc="/sneaker-cleaning-clean.webp" title="Shoe Doctor shoe care" />
      <figcaption>Drag to explore a shoe-care transformation. Treatment and results depend on the pair.</figcaption>
    </figure>
  </section>;
}

type ServiceMenuProps = { services: Service[]; afterCategory?: Partial<Record<ServiceCategory, ReactNode>> };
export default function ServiceMenu({ services, afterCategory }: ServiceMenuProps) {
  const restoration = services.find((service) => service.id === "full-restoration");
  const localPrices = services.filter((service) => service.specialPriceLabel);
  const guide = [["Regular dirt", "basic-clean"], ["Quick precision refresh", STEAM_ASSISTED_DEEP_CLEAN_ID], ["Heavy contamination", "deep-clean"], ["Damage / discoloration", "full-restoration"]];
  return <>
    {SERVICE_CATEGORIES.map((category) => {
      const categoryServices = services.filter((service) => service.category === category && service.id !== restoration?.id);
      if (!categoryServices.length && !(category === "Cleaning" && restoration)) return null;
      const primary = categoryServices.filter((service) => primaryIds.includes(service.id));
      const secondary = categoryServices.filter((service) => !primaryIds.includes(service.id));
      const copy = categoryCopy[category];
      return <Fragment key={category}>
        {categoryServices.length > 0 && <section className="menu-group" aria-label={category}>
          <header className="menu-group-heading" data-reveal><p>{copy.label}</p><h2>{copy.title}</h2><span>{copy.intro}</span></header>
          {primary.length > 0 && <div className="menu-grid">{primary.map((service, index) => <ServiceCard service={service} index={index} key={service.id} />)}</div>}
          {secondary.length > 0 && <div className="service-rows" data-reveal>{secondary.map((service) => <ServiceRow service={service} key={service.id} />)}</div>}
        </section>}
        {category === "Cleaning" && <>
          {localPrices.length > 0 && <aside className="wear-local-banner" data-reveal><div><span>Made in Nepal deserves local care</span><strong>WEAR LOCAL. SAVE LOCAL.</strong></div><p>Look for the local-brand price on eligible service cards. We confirm eligibility when we inspect your pair.</p><a href="/#book">Book local-brand care ↗</a></aside>}
          {restoration && <RestorationFeature service={restoration} />}
        </>}
        {afterCategory?.[category]}
      </Fragment>;
    })}
    <section className="service-guide" data-reveal aria-labelledby="service-guide-title">
      <div><p className="sd-kicker">A little direction</p><h2 id="service-guide-title">NOT SURE WHAT<br /><span>YOUR PAIR NEEDS?</span></h2></div>
      <div><ul>{guide.map(([condition, id]) => {
        const service = services.find((item) => item.id === id);
        return service && <li key={id}><span>{condition}</span><a href={`#${id === STEAM_ASSISTED_DEEP_CLEAN_ID ? "steam-brush-cleaning" : id}`}>{displayName(service)} <ArrowUpRight /></a></li>;
      })}</ul><p>We&apos;ll inspect your shoes and recommend the appropriate treatment.</p><a className="sd-primary-button" href="/#book">Book your pair <ArrowUpRight /></a></div>
    </section>
    <div className="pricing-note"><strong>Before we begin</strong><p>Prices marked “From”, “After diagnosis”, with a * or a + are not fixed all-in quotes. Treatment scope, optional add-ons and extra repair or restoration work are confirmed with you before we begin.</p></div>
  </>;
}
