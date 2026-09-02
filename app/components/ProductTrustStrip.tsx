import styles from "./ProductShop.module.css";

const trustItems = [
  "Selected by Shoe Doctor",
  "Material-conscious care",
  "QR payment",
  "Cash on Delivery",
  "Delivery where available",
];

export default function ProductTrustStrip() {
  return (
    <section className={styles.trustStrip} aria-label="Product ordering information">
      {trustItems.map((item) => <span key={item}>{item}</span>)}
    </section>
  );
}
