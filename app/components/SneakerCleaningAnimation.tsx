"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./SneakerCleaningAnimation.module.css";

export const SNEAKER_CLEANING_TIMELINE = {
  cycleMs: 18_000,
  phases: [
    { number: "01", label: "FOAM", detail: "Treatment foam softens surface dirt." },
    { number: "02", label: "BRUSH", detail: "Material-safe brushing lifts grime." },
    { number: "03", label: "WIPE", detail: "A microfibre towel clears residue." },
    { number: "04", label: "RESTORE", detail: "A fresh finish brings the pair back." },
  ],
} as const;

const foamDots = Array.from({ length: 11 }, (_, index) => index);
const brushBristles = Array.from({ length: 10 }, (_, index) => index);

export default function SneakerCleaningAnimation() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.28 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className={`${styles.section} ${isVisible ? styles.isActive : ""}`}
      ref={sectionRef}
      aria-labelledby="sneaker-cleaning-title"
    >
      <div className={styles.copy}>
        <p className={styles.kicker}>THE SHOE DOCTOR METHOD</p>
        <h2 id="sneaker-cleaning-title">Watch Your Sneakers Come Back to Life.</h2>
        <p className={styles.intro}>Foam. Brush. Wipe. Restore.</p>
        <p className={styles.description}>
          A careful four-step refresh designed to lift dirt, protect materials,
          and bring every detail back into its best condition.
        </p>
        <Link className={styles.cta} href="/#book">
          Book a Cleaning <span aria-hidden="true">↗</span>
        </Link>

        <ol className={styles.processList}>
          {SNEAKER_CLEANING_TIMELINE.phases.map((phase) => (
            <li key={phase.number}>
              <span>{phase.number}</span>
              <strong>{phase.label}</strong>
              <p>{phase.detail}</p>
            </li>
          ))}
        </ol>
      </div>

      <div
        className={styles.stage}
        role="img"
        aria-label="A blue basketball sneaker is cleaned in four steps: foam, brush, wipe, and restore."
      >
        <div className={`${styles.route} ${styles.animatable}`} aria-hidden="true" />
        <div className={styles.phaseBadge} aria-hidden="true">
          <span className={`${styles.phaseFoam} ${styles.animatable}`}>01 · FOAM</span>
          <span className={`${styles.phaseBrush} ${styles.animatable}`}>02 · BRUSH</span>
          <span className={`${styles.phaseWipe} ${styles.animatable}`}>03 · WIPE</span>
          <span className={`${styles.phaseRestore} ${styles.animatable}`}>04 · RESTORE</span>
        </div>
        <div className={styles.staticLabels} aria-hidden="true">
          {SNEAKER_CLEANING_TIMELINE.phases.map((phase) => (
            <span key={phase.number}>{phase.number} · {phase.label}</span>
          ))}
        </div>

        <div className={styles.scene}>
          <Image
            className={`${styles.sneaker} ${styles.cleanSneaker} ${styles.animatable}`}
            src="/loader-basketball-sneaker.png"
            alt="A restored blue basketball sneaker"
            width={1536}
            height={1024}
            loading="lazy"
            unoptimized
            sizes="(max-width: 760px) 94vw, (max-width: 1120px) 70vw, 620px"
          />
          <Image
            className={`${styles.sneaker} ${styles.dirtySneaker} ${styles.animatable}`}
            src="/loader-basketball-sneaker.png"
            alt=""
            aria-hidden="true"
            width={1536}
            height={1024}
            loading="lazy"
            unoptimized
            sizes="(max-width: 760px) 94vw, (max-width: 1120px) 70vw, 620px"
          />

          <div className={`${styles.foamLayer} ${styles.animatable}`} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className={`${styles.shine} ${styles.animatable}`} aria-hidden="true" />

          <div className={`${styles.foamBottle} ${styles.animatable}`} aria-hidden="true">
            <span className={styles.bottlePump} />
            <span className={styles.bottleNeck} />
            <span className={styles.bottleBody}>
              <i>SD</i>
              <b>FOAM</b>
            </span>
          </div>

          <div className={`${styles.brush} ${styles.animatable}`} aria-hidden="true">
            <span className={styles.brushBlock}>
              {brushBristles.map((bristle) => (
                <i key={bristle} />
              ))}
            </span>
          </div>

          <div className={`${styles.towel} ${styles.animatable}`} aria-hidden="true">
            <span />
          </div>

          <div className={styles.particles} aria-hidden="true">
            {foamDots.map((dot) => (
              <i className={styles.animatable} key={dot} />
            ))}
          </div>
        </div>

        <p className={`${styles.restoreCaption} ${styles.animatable}`} aria-hidden="true">
          Restored. Refreshed. Ready to Wear.
        </p>
      </div>
    </section>
  );
}
