import type { Product } from "@/lib/product-types";
import styles from "./ProductShop.module.css";

type CareList = {
  title: string;
  items: string[];
  tone?: "warning";
};

function ListSection({ title, items, tone }: CareList) {
  if (!items.length) return null;
  return (
    <section className={`${styles.careList} ${tone === "warning" ? styles.careListWarning : ""}`}>
      <h2>{title}</h2>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}

export default function ProductCareGuide({ product }: { product: Product }) {
  const { details } = product;
  const hasDetails = [
    details.keyBenefits,
    details.bestFor,
    details.suitableMaterials,
    details.materialsToAvoid,
    details.howToUse,
    details.warnings,
    details.careInstructions,
  ].some((items) => items.length > 0) || Boolean(details.packSize || details.brand || product.sku);
  if (!hasDetails) return null;

  return (
    <section className={styles.careGuide} aria-labelledby="product-care-guide-title">
      <div className={styles.careGuideHeading}>
        <p className="sd-kicker">Product information</p>
        <h2 id="product-care-guide-title">THE CARE GUIDE.</h2>
      </div>
      <div className={styles.careGuideGrid}>
        <ListSection title="Key benefits" items={details.keyBenefits} />
        <ListSection title="Best for" items={details.bestFor} />
        <ListSection title="Suitable materials" items={details.suitableMaterials} />
        <ListSection title="Avoid on" items={details.materialsToAvoid} tone="warning" />
        <ListSection title="How to use" items={details.howToUse} />
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
  );
}
