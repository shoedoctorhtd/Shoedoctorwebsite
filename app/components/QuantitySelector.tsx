"use client";

import styles from "./ProductShop.module.css";

export default function QuantitySelector({
  quantity,
  maximum,
  onChange,
  label,
}: {
  quantity: number;
  maximum: number;
  onChange: (nextQuantity: number) => void;
  label: string;
}) {
  const hasAvailableStock = Number.isSafeInteger(maximum) && maximum > 0;
  const safeMaximum = hasAvailableStock ? Math.max(1, Math.min(100, maximum)) : 1;
  const safeQuantity = Math.max(1, Math.min(100, Number.isSafeInteger(quantity) ? quantity : 1));
  return (
    <div className={styles.quantityControl} aria-label={label}>
      <button
        aria-label={`Decrease ${label}`}
        disabled={!hasAvailableStock || safeQuantity <= 1}
        onClick={() => onChange(Math.max(1, safeQuantity - 1))}
        type="button"
      >
        −
      </button>
      <span aria-live="polite">{safeQuantity}</span>
      <button
        aria-label={`Increase ${label}`}
        disabled={!hasAvailableStock || safeQuantity >= safeMaximum}
        onClick={() => onChange(Math.min(safeMaximum, safeQuantity + 1))}
        type="button"
      >
        +
      </button>
    </div>
  );
}
