"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PublicImpactStatistics = {
  totalPairsCollected: number;
  totalPairsRestored: number;
  totalPairsDonated: number;
  donationDrivesCompleted: number;
  partnerOrganizations: number;
  communitiesReached: number;
};

type DonationImpactStatsProps = {
  stats: PublicImpactStatistics | null;
  loadError?: boolean;
};

export default function DonationImpactStats({
  stats,
  loadError = false,
}: DonationImpactStatsProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const targets = useMemo(
    () =>
      stats
        ? [
            { label: "Pairs Collected", value: stats.totalPairsCollected },
            { label: "Pairs Restored", value: stats.totalPairsRestored },
            { label: "Pairs Donated", value: stats.totalPairsDonated },
            { label: "Donation Drives Completed", value: stats.donationDrivesCompleted },
            { label: "Partner Organizations", value: stats.partnerOrganizations },
            { label: "Communities Reached", value: stats.communitiesReached },
          ]
        : [],
    [stats],
  );
  const [counts, setCounts] = useState<number[]>([]);

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

  useEffect(() => {
    if (!hasEntered || targets.length === 0) return;

    let frame = 0;
    const start = performance.now();
    const duration = 900;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setCounts(targets.map((target) => Math.round(target.value * eased)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hasEntered, targets]);

  if (!stats) {
    return (
      <div className={`donation-impact-empty${loadError ? " donation-content-error" : ""}`} ref={sectionRef}>
        <span aria-hidden="true">{loadError ? "!" : "✦"}</span>
        <strong>{loadError ? "Impact statistics are temporarily unavailable." : "Impact updates coming soon."}</strong>
        <p>{loadError ? "Please check back shortly for the verified programme totals." : "Verified programme figures will appear here after they are published."}</p>
      </div>
    );
  }

  return (
    <div
      className="donation-impact-stats"
      data-counted={hasEntered ? "true" : "false"}
      ref={sectionRef}
    >
      {targets.map((target, index) => (
        <article className="donation-impact-card" key={target.label}>
          <strong aria-label={`${target.label}: ${target.value}`}>
            {new Intl.NumberFormat("en-NP").format(
              hasEntered ? (counts[index] ?? 0) : 0,
            )}
          </strong>
          <span>{target.label}</span>
          <small>Verified programme total</small>
        </article>
      ))}
    </div>
  );
}
