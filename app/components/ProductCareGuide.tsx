import type { Product } from "@/lib/product-types";
import styles from "./ProductShop.module.css";

type CareList = {
  title: string;
  items: string[];
  tone?: "warning";
  variant?: "tags";
};

function ListSection({ title, items, tone, variant }: CareList) {
  if (!items.length) return null;
  return (
    <section className={`${styles.careList} ${tone === "warning" ? styles.careListWarning : ""}`}>
      <h3>{title}</h3>
      <ul className={variant === "tags" ? styles.materialTags : undefined}>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}

export default function ProductCareGuide({ product }: { product: Product }) {
  const { details } = product;
  const hasProductInformation = [
    details.keyBenefits,
    details.bestFor,
    details.suitableMaterials,
    details.materialsToAvoid,
    details.warnings,
    details.careInstructions,
  ].some((items) => items.length > 0) || Boolean(details.packSize || details.brand || product.sku);
  const hasHowToUse = details.howToUse.length > 0;
  const hasDoctorsAdvice = Boolean(details.doctorsAdvice);
  if (!hasProductInformation && !hasHowToUse && !hasDoctorsAdvice) return null;

  return (
    <>
      {hasProductInformation ? (
        <section className={styles.careGuide} aria-labelledby="product-information-title">
          <div className={styles.careGuideHeading}>
            <p className="sd-kicker">Product information</p>
            <h2 id="product-information-title">PRODUCT INFORMATION.</h2>
          </div>
          <div className={styles.careGuideGrid}>
            <ListSection title="Key benefits" items={details.keyBenefits} />
            <ListSection title="Best for" items={details.bestFor} variant="tags" />
            <ListSection title="Suitable materials" items={details.suitableMaterials} variant="tags" />
            <ListSection title="Avoid on" items={details.materialsToAvoid} tone="warning" variant="tags" />
            <ListSection title="Care instructions" items={details.careInstructions} />
            <ListSection title="Warnings" items={details.warnings} tone="warning" />
            {(details.packSize || details.brand || product.sku) ? (
              <dl className={styles.productFacts}>
                {details.packSize ? <><div><dt>Pack size</dt><dd>{details.packSize}</dd></div></> : null}
                {details.brand ? <><div><dt>Brand</dt><dd>{details.brand}</dd></div></> : null}
                {product.sku ? <><div><dt>SKU</dt><dd>{product.sku}</dd></div></> : null}
              </dl>
            ) : null}
          </div>
        </section>
      ) : null}
      {hasHowToUse ? (
        <section className={styles.careGuide} aria-labelledby="product-how-to-use-title">
          <div className={styles.careGuideHeading}>
            <h2 id="product-how-to-use-title">HOW TO USE.</h2>
          </div>
          <ol className={styles.howToUseSteps}>
            {details.howToUse.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>
      ) : null}
      {hasDoctorsAdvice ? (
        <section className={styles.careGuide} aria-labelledby="product-doctors-advice-title">
          <div className={styles.careGuideHeading}>
            <h2 id="product-doctors-advice-title">DOCTOR&apos;S ADVICE.</h2>
          </div>
          <p className={styles.doctorsAdvice}>{details.doctorsAdvice}</p>
        </section>
      ) : null}
    </>
  );
}
