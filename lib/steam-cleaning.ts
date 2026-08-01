export const STEAM_ASSISTED_DEEP_CLEAN_ID = "steam-assisted-deep-clean";

export const steamCleaningContent = {
  homeBadge: "NEW AT SHOE DOCTOR · FIRST IN NEPAL",
  homeHeading: "STEAM-POWERED CARE FOR A DEEPER CLEAN.",
  homeDescription:
    "Shoe Doctor introduces Nepal’s first professional steam-assisted shoe-cleaning experience. Our controlled steam brush helps loosen stubborn surface grime and reach textured areas, stitching lines, sole grooves and difficult corners with less aggressive scrubbing.",
  homeSupporting:
    "Steam is used as part of our professional cleaning process—not as a one-method solution. Every pair is inspected first, and our technicians decide whether steam treatment is suitable for its material, adhesive and construction.",
  serviceBadge: "NEPAL’S FIRST",
  serviceName: "Steam-Assisted Deep Clean",
  serviceTitle: "STEAM-ASSISTED DEEP CLEAN",
  serviceIntro:
    "A targeted steam-assisted treatment designed to help loosen embedded surface grime before material-safe brushing, cleaning, drying and finishing.",
  serviceSafety:
    "Steam treatment is not suitable for every shoe. Application depends on material, adhesive, colour stability and condition. Our technicians inspect every pair before treatment.",
  priceLabel: "Price after inspection",
  turnaround: "After diagnosis",
  image: {
    src: "/images/steam-brush-cleaning.webp",
    alt: "Shoe Doctor professional steam cleaning gun",
  },
} as const;

export const steamCleaningBenefits = [
  "Helps loosen stubborn surface dirt and grime",
  "Reaches grooves, stitching and difficult corners",
  "Reduces the need for aggressive scrubbing",
  "Applied carefully by trained shoe-care technicians",
] as const;

export const steamCleaningProcess = [
  {
    title: "DIAGNOSE",
    copy: "We inspect the shoe’s material, stitching, adhesive, colour stability and overall condition before selecting a treatment.",
  },
  {
    title: "PREPARE",
    copy: "Loose dust and surface dirt are removed, and sensitive sections are identified and protected.",
  },
  {
    title: "STEAM ASSIST",
    copy: "Controlled steam and the precision brush are applied to suitable areas to help loosen grime around textured surfaces, seams, grooves and difficult corners.",
  },
  {
    title: "CLEAN AND FINISH",
    copy: "The pair is professionally cleaned, carefully dried, reshaped where necessary and finished according to its material.",
  },
] as const;

export const steamCleaningComparison = [
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
    title: "STEAM-ASSISTED DEEP CLEAN",
    items: [
      "Targets difficult detailed areas",
      "Helps soften embedded buildup",
      "Combines steam and brush agitation",
      "Works around grooves, seams and edges",
      "Used only after material inspection",
    ],
  },
] as const;
