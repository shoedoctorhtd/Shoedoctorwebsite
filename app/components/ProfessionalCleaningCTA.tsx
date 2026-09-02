import { ArrowUpRight } from "./SiteChrome";
import Link from "next/link";
import styles from "./ProductShop.module.css";

export default function ProfessionalCleaningCTA() {
  return (
    <section className={styles.professionalCta} aria-labelledby="professional-cleaning-title">
      <div>
        <p className="sd-kicker">Need a deeper clean?</p>
        <h2 id="professional-cleaning-title">LET THE DOCTOR TAKE A LOOK.</h2>
        <p>
          Home-care products support maintenance and minor cleanups. For deep
          stains, specialist materials, restoration or difficult cases, Shoe
          Doctor can inspect the pair and recommend professional treatment.
        </p>
      </div>
      <Link className="sd-primary-button" href="/#book">
        Book professional cleaning <ArrowUpRight />
      </Link>
    </section>
  );
}
