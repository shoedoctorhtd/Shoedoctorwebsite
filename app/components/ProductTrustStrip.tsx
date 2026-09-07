import styles from "./ProductShop.module.css";

const trustItems = [
  "Cash on Delivery",
  "QR Payment",
  "Delivery where available",
  "Selected by Shoe Doctor",
];

export default function ProductTrustStrip() {
  return (
    <section className={styles.trustStrip} aria-label="Product ordering information">
      {trustItems.map((item) => <span key={item}>{item}</span>)}
    </section>
  );
}
