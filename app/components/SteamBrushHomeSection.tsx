import SteamBrushVisual from "./SteamBrushVisual";

export default function SteamBrushHomeSection({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <section
      aria-labelledby="steam-home-heading"
      className={`sd-steam-home sd-section${compact ? " sd-steam-home--compact" : ""}`}
      data-reveal
    >
      <div className="sd-steam-home-copy">
        <span className="sd-steam-badge">
          FIRST IN NEPAL
        </span>
        <h2 id="steam-home-heading">
          Steam-Assisted <span>Shoe Cleaning.</span>
        </h2>
        <p className="sd-steam-home-description">
          We scrub, rinse and revive with controlled steam that helps loosen
          stubborn grime before careful brushing and drying. We inspect every
          pair first and use steam only where the material, adhesive and
          condition allow, typically on durable mesh, selected synthetics and
          rubber details.
        </p>
        <div className="sd-steam-home-actions">
          <a className="sd-steam-explore" href="/steam-cleaning">
            Explore Steam Cleaning →
          </a>
        </div>
      </div>

      <SteamBrushVisual />
    </section>
  );
}
