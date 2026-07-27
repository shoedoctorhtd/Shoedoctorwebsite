/* eslint-disable @next/next/no-html-link-for-pages */
import {
  SERVICE_CATEGORIES,
  type Service,
  type ServiceCategory,
} from "@/lib/data";
import { ArrowUpRight } from "./SiteChrome";

const categoryCopy: Record<
  ServiceCategory,
  { label: string; title: string; intro: string }
> = {
  Cleaning: {
    label: "01 · Cleaning",
    title: "CLEAN. FRESH. READY.",
    intro:
      "From a quick exterior reset to complete restoration, every treatment begins with a material-safe diagnosis.",
  },
  Repairs: {
    label: "02 · Repairs",
    title: "FIX THE DAMAGE.",
    intro:
      "Stitching, bonding and colour work carried out according to the pair’s construction, material and condition.",
  },
  "Add-ons": {
    label: "03 · Add-ons",
    title: "CARE, YOUR WAY.",
    intro:
      "Priority handling and specialist material care can be added after we confirm availability and suitability.",
  },
};

function groupServices(services: Service[], category: ServiceCategory) {
  return services.filter((service) => service.category === category);
}

export default function ServiceMenu({ services }: { services: Service[] }) {
  return (
    <>
      <div className="services-overview" aria-label="Everything we do">
        <article>
          <span>Clean</span>
          <strong>Exterior to deep interior care</strong>
          <p>
            Basic refresh, full inside-and-out cleaning, stain treatment,
            deodorizing, lace and sole detailing.
          </p>
        </article>
        <article>
          <span>Repair</span>
          <strong>Stitch, bond and rebuild</strong>
          <p>
            Minor or full stitching, half or full re-gluing, reinforcement and
            careful structural repair.
          </p>
        </article>
        <article>
          <span>Restore</span>
          <strong>Colour, shape and finish</strong>
          <p>
            Sole whitening, un-yellowing, crease reduction, partial or full
            repainting and protective finishing.
          </p>
        </article>
        <article>
          <span>Convenience</span>
          <strong>Express and doorstep options</strong>
          <p>
            Express wash and dry, priority repair, delicate-material care,
            self drop-off or pickup and delivery.
          </p>
        </article>
      </div>

      <div className="wear-local-banner">
        <div>
          <span>Made in Nepal deserves local care</span>
          <strong>WEAR LOCAL. SAVE LOCAL.</strong>
        </div>
        <p>
          Save Rs 50 on Basic Clean, Deep Clean and Premium Care for verified
          Nepali-brand footwear.
        </p>
        <a href="/#book">Claim the Nepali-brand price ↗</a>
      </div>

      {SERVICE_CATEGORIES.map((category) => {
        const categoryServices = groupServices(services, category);
        if (!categoryServices.length) return null;
        const copy = categoryCopy[category];
        return (
          <div className="menu-group" key={category} data-reveal>
            <header className="menu-group-heading">
              <p>{copy.label}</p>
              <h2>{copy.title}</h2>
              <span>{copy.intro}</span>
            </header>

            <div
              className={`menu-grid ${
                category === "Add-ons" ? "compact" : ""
              }`}
            >
              {categoryServices.map((service, index) => (
                <article
                  className={`menu-card ${service.tone}`}
                  key={service.id}
                >
                  <div className="menu-card-top">
                    <span className="menu-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="menu-icon">{service.icon}</span>
                  </div>
                  {service.badge && (
                    <span className="menu-badge">{service.badge}</span>
                  )}
                  <p className="menu-turnaround">{service.turnaround}</p>
                  <h3>{service.name}</h3>
                  <p className="menu-description">{service.description}</p>
                  <ul>
                    {service.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <div className="menu-price">
                    <div>
                      <span>Service price</span>
                      <strong>{service.priceLabel}</strong>
                      {service.specialPriceLabel && (
                        <em>{service.specialPriceLabel}</em>
                      )}
                    </div>
                    <a
                      href={`/?service=${encodeURIComponent(
                        service.id,
                      )}#book`}
                      aria-label={`Book ${service.name}`}
                    >
                      Book <ArrowUpRight />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}

      <div className="pricing-note">
        <strong>Before we begin</strong>
        <p>
          Cleaning charges may apply separately unless included. Final price
          depends on material, damage and shoe condition.
        </p>
      </div>
    </>
  );
}
