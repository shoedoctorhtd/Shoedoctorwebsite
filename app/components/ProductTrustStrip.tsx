import styles from "./ProductShop.module.css";

const trustItems = [
  "QR Payment",
  "Cash on Delivery",
  "Delivery where available",
  "Chosen by Shoe Doctor",
];

export default function ProductTrustStrip() {
  return (
    <section className={styles.trustStrip} aria-label="Product ordering information">
      {trustItems.map((item) => <span key={item}>{item}</span>)}
    </section>
  );
}
