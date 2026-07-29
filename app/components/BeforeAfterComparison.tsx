"use client";

/* eslint-disable @next/next/no-img-element */

import { useId, useState, type CSSProperties } from "react";

type BeforeAfterComparisonProps = {
  beforeSrc: string;
  afterSrc: string;
  title: string;
};

export default function BeforeAfterComparison({
  beforeSrc,
  afterSrc,
  title,
}: BeforeAfterComparisonProps) {
  const [position, setPosition] = useState(50);
  const labelId = useId();

  return (
    <div className="before-after" style={{ "--comparison-position": `${position}%` } as CSSProperties}>
      <span className="sr-only" id={labelId}>
        Before and after comparison for {title}
      </span>
      <img
        className="before-after__image"
        src={afterSrc}
        alt={`${title} after restoration`}
        loading="lazy"
        decoding="async"
      />
      <div
        className="before-after__before"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        aria-hidden="true"
      >
        <img
          className="before-after__image"
          src={beforeSrc}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
      <span className="before-after__label before-after__label--before">Before</span>
      <span className="before-after__label before-after__label--after">After</span>
      <span className="before-after__divider" aria-hidden="true">
        <i />
      </span>
      <input
        aria-labelledby={labelId}
        className="before-after__range"
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
      />
    </div>
  );
}
