import Image from "next/image";

type SteamAdvantageIconName = "steam" | "detail" | "gentle" | "expert";

const steamAdvantageSteps: Array<{
  title: string;
  description: string;
  icon: SteamAdvantageIconName;
  imageAlt: string;
  imageClass: string;
  imageSrc: string;
  tone: "coral" | "indigo" | "sky" | "lime";
}> = [
  {
    title: "LOOSENS GRIME",
    description:
      "Steam helps soften dried dirt, surface grime and stubborn buildup.",
    icon: "steam",
    imageAlt: "Steam cleaning treatment lifting grime from a shoe surface",
    imageClass: "is-grime",
    imageSrc: "/images/steam-brush-loosens-grime.png",
    tone: "coral",
  },
  {
    title: "REACHES DETAILS",
    description:
      "Targets grooves, stitching, sole edges and difficult corners.",
    icon: "detail",
    imageAlt: "Steam brush cleaning detailed shoe grooves and edges",
    imageClass: "is-details",
    imageSrc: "/images/steam-brush-reaches-details.png",
    tone: "indigo",
  },
  {
    title: "GENTLER CLEANING",
    description:
      "Reduces the need for excessive brushing and aggressive scrubbing.",
    icon: "gentle",
    imageAlt: "A shoe being treated with controlled, gentle steam cleaning",
    imageClass: "is-gentle",
    imageSrc: "/images/steam-brush-gentler-cleaning.png",
    tone: "sky",
  },
  {
    title: "EXPERT CONTROLLED",
    description:
      "Carefully applied by trained Shoe Doctor technicians according to the shoe material.",
    icon: "expert",
    imageAlt: "Shoe Doctor steam-cleaning equipment used after material inspection",
    imageClass: "is-expert",
    imageSrc: "/images/steam-brush-expert-controlled.png",
    tone: "lime",
  },
];

function SteamAdvantageIcon({ name }: { name: SteamAdvantageIconName }) {
  if (name === "steam") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M12 31h21a7 7 0 0 0 .3-14A10 10 0 0 0 14 20a5.5 5.5 0 0 0-2 11Z" />
        <path d="M17 37c1.5 2 3.6 3 6.2 3M25 37c1.3 1.7 3 2.6 5.3 2.6" />
        <path d="M18 13c-2 2-2 4.4 0 6.4M27 9c-2 2.4-2 5 0 7.3" />
      </svg>
    );
  }

  if (name === "detail") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M7 29c5.7-.2 10.3-3.3 14.1-9.2l4.7 3.3c2.4 1.7 5.2 2.7 8.1 2.9l3.4.3v6.2H7Z" />
        <path d="M11 35h27M18 19l4.3 2.8" />
        <circle cx="34" cy="16" r="5.5" />
        <path d="m38 20 4 4" />
      </svg>
    );
  }

  if (name === "gentle") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 6 38 12v9c0 8.9-5.5 15.9-14 20-8.5-4.1-14-11.1-14-20v-9Z" />
        <path d="m17 24 4.6 4.6L31.5 19" />
        <path d="M11 34c-2.5 1-3.6 2.8-3.5 5.2M37 34c2.5 1 3.6 2.8 3.5 5.2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="20" r="11" />
      <path d="m19.2 20.1 3.2 3.2 6.7-7" />
      <path d="m18 30-3.5 10 9.5-4 9.5 4L30 30" />
    </svg>
  );
}

type SteamBrushAdvantageProps = {
  showHeader?: boolean;
};

export default function SteamBrushAdvantage({
  showHeader = true,
}: SteamBrushAdvantageProps) {
  return (
    <section
      className={`sd-steam-advantage${showHeader ? "" : " sd-steam-advantage--compact"}`}
      aria-label={showHeader ? undefined : "Steam-cleaning process"}
      aria-labelledby={showHeader ? "steam-advantage-heading" : undefined}
      data-reveal
    >
      <span className="sd-steam-advantage__mist" aria-hidden="true" />
      {showHeader && (
        <header className="sd-steam-advantage__header">
          <p className="sd-kicker">THE STEAM CLEANING ADVANTAGE</p>
          <h3 id="steam-advantage-heading">CLEANER. SAFER. BETTER.</h3>
          <p>
            Our steam-cleaning process is designed to care for your shoes from
            the surface to the finest details.
          </p>
        </header>
      )}

      <div className="sd-steam-advantage__timeline">
        <svg
          className="sd-steam-advantage__wave"
          viewBox="0 0 1200 126"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 63C90 10 210 10 300 63s210 53 300 0 210-53 300 0 210 53 300 0" />
        </svg>
        <ol className="sd-steam-advantage__steps">
          {steamAdvantageSteps.map((step, index) => (
            <li
              className={`sd-steam-advantage__step sd-steam-advantage__step--${step.tone}`}
              data-reveal
              key={step.title}
            >
              <span className="sd-steam-advantage__number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="sd-steam-advantage__icon">
                <SteamAdvantageIcon name={step.icon} />
              </div>
              <span className="sd-steam-advantage__marker" aria-hidden="true" />
              {index < steamAdvantageSteps.length - 1 && (
                <span className="sd-steam-advantage__arrow" aria-hidden="true">
                  &rarr;
                </span>
              )}
              <div className="sd-steam-advantage__copy">
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </div>
              <figure className="sd-steam-advantage__image-frame">
                <Image
                  className={`sd-steam-advantage__image ${step.imageClass}`}
                  src={step.imageSrc}
                  alt={step.imageAlt}
                  fill
                  sizes="(max-width: 640px) calc(100vw - 72px), (max-width: 980px) calc(50vw - 48px), 22vw"
                  unoptimized
                />
              </figure>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
