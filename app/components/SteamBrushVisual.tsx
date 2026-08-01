"use client";

import Image from "next/image";
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

      <div className="sd-steam-image-frame">
        {imageAvailable ? (
          <Image
            src={steamCleaningContent.image.src}
            alt={steamCleaningContent.image.alt}
            fill
            sizes="(max-width: 980px) 100vw, 52vw"
            unoptimized
            onError={() => setImageAvailable(false)}
          />
        ) : (
          <div className="sd-steam-image-placeholder" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <ol className="sd-steam-process" aria-label="Steam brush cleaning process">
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
