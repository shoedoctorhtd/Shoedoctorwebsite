"use client";

import { useEffect, useRef, useState } from "react";

const impactStats = [
  "Pairs Collected",
  "Pairs Restored",
  "Pairs Donated",
  "Communities Reached",
];

/**
 * The counter deliberately starts at zero until Shoe Doctor completes its
 * first donation drive. Replace `target` with verified programme data when a
 * reporting source is connected.
 */
export default function DonationImpactStats() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="donation-impact-stats"
      data-counted={hasEntered ? "true" : "false"}
      ref={sectionRef}
    >
      {impactStats.map((label) => (
        <article className="donation-impact-card" key={label}>
          <strong aria-label={`${label}: zero or more`}>0+</strong>
          <span>{label}</span>
          <small>Coming soon</small>
        </article>
      ))}
    </div>
  );
}
