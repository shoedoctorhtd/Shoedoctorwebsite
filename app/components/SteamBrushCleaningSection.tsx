import { steamCleaningContent } from "@/lib/steam-cleaning";

const processSteps = [
  {
    title: "DIAGNOSE",
    copy: "We inspect the shoe’s material, construction, paint, glue and overall condition before deciding where steam can be used.",
  },
  {
    title: "CLEAN",
    copy: "Material-appropriate cleaning solution and brushes remove general dirt from the upper, interior and sole.",
  },
  {
    title: "STEAM DETAIL",
    copy: "Controlled steam and the specialised brush help loosen and lift stubborn dirt from suitable detailed areas.",
  },
  {
    title: "WIPE & DRY",
    copy: "The loosened dirt is removed using a clean microfiber towel before controlled drying and final inspection.",
  },
];

const bestUsedFor = [
  "Textured rubber outsoles",
  "Deep outsole grooves",
  "Midsole edges",
  "Stitching lines",
  "Welt areas between the upper and sole",
  "Eyelet and tongue corners",
  "Durable mesh and selected synthetic surfaces",
  "Hard-to-reach detailed areas",
  "Stubborn and greasy surface buildup",
];

const comparisonColumns = [
  {
    title: "REGULAR CLEANING",
    items: [
      "Cleans the main upper and sole",
      "Uses material-appropriate solution",
      "Removes general surface dirt",
      "Includes brushing and wiping",
      "Suitable for routine shoe care",
    ],
  },
  {
    title: "STEAM BRUSH DETAILING",
    items: [
      "Targets difficult detailed areas",
      "Helps soften embedded buildup",
      "Combines steam and brush agitation",
      "Works around grooves, seams and edges",
      "Used only after material inspection",
    ],
  },
];

export default function SteamBrushCleaningSection() {
  return (
    <section
      className="sd-steam-service"
      id="steam-brush-cleaning"
      data-reveal
    >
      <header className="sd-steam-service-header">
        <div>
          <span className="sd-steam-badge">{steamCleaningContent.badge}</span>
          <p className="sd-kicker">ADVANCED SHOE CLEANING TECHNOLOGY</p>
          <h2>STEAM GUN BRUSH CLEANING</h2>
          <p className="sd-steam-service-subheading">
            Not just washed. Steam-detailed.
          </p>
        </div>
        <div className="sd-steam-service-copy">
          <p className="sd-steam-service-intro">
            Our Steam Gun Brush Cleaning treatment combines controlled hot
            steam with a specialised detailing brush. The steam helps soften
            stubborn dirt and greasy buildup while the bristles work around
            textured soles, stitching lines, seams, edges and difficult
            corners. The loosened dirt is then brushed and wiped away before
            the shoe is carefully dried.
          </p>
          <p className="sd-steam-service-inclusion">
            Included within eligible Deep Clean or Premium Care treatments
            after diagnosis; it is not a separate-priced service.
          </p>
        </div>
      </header>

      <div className="sd-steam-service-main">
        <div>
          <div className="sd-steam-section-title">
            <p className="sd-kicker">HOW IT WORKS</p>
            <h3>DETAIL WITH A PLAN.</h3>
          </div>
          <ol className="sd-steam-steps">
            {processSteps.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="sd-steam-best-used">
          <p className="sd-kicker">BEST USED FOR</p>
          <ul>
            {bestUsedFor.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="sd-steam-service-bottom">
        <div className="sd-steam-comparison">
          <p className="sd-kicker">THE DIFFERENCE</p>
          <h3>REGULAR CLEANING.<br />DETAILED FURTHER.</h3>
          <div>
            {comparisonColumns.map((column) => (
              <article key={column.title}>
                <strong>{column.title}</strong>
                <ul>
                  {column.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div className="sd-steam-information">
          <aside className="sd-steam-callout">
            <strong>STEAM HELPS LOOSEN THE DIRT</strong>
            <p>
              Steam does not make dirt disappear. It helps soften stubborn
              buildup so the detailing brush and microfiber towel can remove
              it more effectively.
            </p>
          </aside>
          <aside className="sd-steam-safety">
            <strong>MATERIAL-SAFE TREATMENT</strong>
            <p>
              Steam is not automatically used on every shoe. Extra care or
              alternative treatment may be required for suede, nubuck,
              delicate leather, customised paint, vintage footwear, weak glue
              joints, glued decorations and heat-sensitive materials.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
