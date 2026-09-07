"use client";

import { useEffect, useState } from "react";

/**
 * The before-treatment frame is the first and only eager hero request. The
 * clean frame starts after the page has painted, then enables the decorative
 * cleaning sequence without delaying the primary booking CTA.
 */
export default function HeroCleaningVisual() {
  const [shouldLoadCleanFrame, setShouldLoadCleanFrame] = useState(false);
  const [cleanFrameReady, setCleanFrameReady] = useState(false);

  useEffect(() => {
    const loadCleanFrame = window.setTimeout(() => {
      setShouldLoadCleanFrame(true);
    }, 450);

    return () => window.clearTimeout(loadCleanFrame);
  }, []);

  return (
    <div
      className="sd-hero-shoe-wrap"
      data-clean-frame-ready={cleanFrameReady ? "true" : "false"}
    >
      {shouldLoadCleanFrame ? (
        <picture>
          <source
            media="(max-width: 640px)"
            srcSet="/hero-cleaning-sneaker-mobile.webp"
            type="image/webp"
          />
          <source
            media="(max-width: 1024px)"
            srcSet="/hero-cleaning-sneaker-tablet.webp"
            type="image/webp"
          />
          <img
            alt=""
            aria-hidden="true"
            className="sd-hero-shoe"
            decoding="async"
            height="1024"
            onError={() => setCleanFrameReady(false)}
            onLoad={() => setCleanFrameReady(true)}
            src="/hero-cleaning-sneaker.png"
            width="1536"
          />
        </picture>
      ) : null}
      <picture>
        <source
          media="(max-width: 640px)"
          srcSet="/hero-cleaning-sneaker-dirty-mobile.webp"
          type="image/webp"
        />
        <source
          media="(max-width: 1024px)"
          srcSet="/hero-cleaning-sneaker-dirty-tablet.webp"
          type="image/webp"
        />
        <img
          alt="A high-top sneaker before Shoe Doctor cleaning"
          className="sd-hero-dirty-shoe"
          decoding="async"
          fetchPriority="high"
          height="1024"
          loading="eager"
          src="/hero-cleaning-sneaker-dirty.png"
          width="1536"
        />
      </picture>
      <span className="sd-hero-dirt-overlay" aria-hidden="true" />
      <span className="sd-hero-foam-lather" aria-hidden="true" />
      <span className="sd-hero-clean-shine" aria-hidden="true" />
    </div>
  );
}
