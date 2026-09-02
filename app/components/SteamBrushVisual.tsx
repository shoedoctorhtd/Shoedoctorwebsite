"use client";

import { useState } from "react";
import { steamCleaningContent } from "@/lib/steam-cleaning";

const processSteps = ["STEAM", "BRUSH", "WIPE", "RESTORE"];

export default function SteamBrushVisual() {
  const [imageAvailable, setImageAvailable] = useState(true);

  return (
    <div className="sd-steam-visual">
      <span className="sd-steam-plume plume-one" aria-hidden="true" />
      <span className="sd-steam-plume plume-two" aria-hidden="true" />
      <span className="sd-steam-plume plume-three" aria-hidden="true" />

      <span
        className="sd-steam-visual-label sd-steam-visual-label--control"
        aria-hidden="true"
      >
        Controlled Steam
      </span>
      <span
        className="sd-steam-visual-label sd-steam-visual-label--checked"
        aria-hidden="true"
      >
        Material Checked
      </span>

      <div className="sd-steam-image-frame">
        {imageAvailable ? (
          <picture className="sd-steam-image-picture">
            <source
              media="(max-width: 640px)"
              srcSet="/images/steam-brush-cleaning-mobile.webp"
              type="image/webp"
            />
            <img
              alt={steamCleaningContent.image.alt}
              decoding="async"
              height="1024"
              loading="lazy"
              onError={() => setImageAvailable(false)}
              src={steamCleaningContent.image.src}
              width="1536"
            />
          </picture>
        ) : (
          <div className="sd-steam-image-placeholder" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <ol className="sd-steam-process" aria-label="Steam cleaning process">
        {processSteps.map((step, index) => (
          <li key={step}>
            <span>{step}</span>
            {index < processSteps.length - 1 && <i aria-hidden="true">→</i>}
          </li>
        ))}
      </ol>
    </div>
  );
}
