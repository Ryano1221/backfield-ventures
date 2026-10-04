export type HandoffBrandId =
  | "omorpho"
  | "kreatures"
  | "foli"
  | "parch"
  | "lectra"
  | "unwind"
  | "puntr";

export type HandoffBrand = {
  id: HandoffBrandId;
  name: string;
  tag: string;
  meta: string;
  hook: string;
  teaser: string;
  siteUrl: string;
  layout: "featured" | "support" | "row";
  heroSrc: string;
  heroAlt: string;
  heroWidth: number;
  heroHeight: number;
  logoSrc: string;
  logoAlt: string;
  logoWidth: number;
  logoHeight: number;
  writeup: string[];
};

export const brands: HandoffBrand[] = [
  {
    id: "omorpho",
    name: "Omorpho",
    tag: "Sports · Training",
    meta: "US · Micro-weighted apparel · omorpho.com",
    hook: "What if the weight lived in the fabric?",
    teaser:
      "Micro-weighted training gear that adds load without a bulky vest silhouette. Built for runs, walks, and bodyweight work.",
    siteUrl: "https://omorpho.com/",
    layout: "featured",
    heroSrc: "/handoff/brands/omorpho.webp",
    heroAlt: "Omorpho micro-weighted training gear",
    heroWidth: 1600,
    heroHeight: 1200,
    logoSrc: "/handoff/logos/omorpho.webp",
    logoAlt: "Omorpho logo",
    logoWidth: 250,
    logoHeight: 33,
    writeup: [
      "Omorpho builds micro-weighted training apparel. G-Wear tops, shorts, and tights, plus the G-Vest line, use patented MicroLoad polymer spheres distributed through the garment so load sits in the fabric instead of a bulky vest silhouette.",
      "Site framing covers run, walk, and train use cases, and weighted items are listed as HSA/FSA eligible. The product photographs as athletic kit first and a training tool second, which is why it holds the featured slot on this mosaic.",
      "Public coverage has treated the weighted-apparel approach as a product story (including Men's Health review framing). No invented athlete counts or growth metrics here. Public materials: omorpho.com.",
    ],
  },
  {
    id: "kreatures",
    name: "Kreatures of Habit",
    tag: "Food · Oats",
    meta: "US · High-protein overnight oats · kreaturesofhabit.com",
    hook: "Breakfast that behaves like a system.",
    teaser:
      "Meal One high-protein overnight oats and The Daily Bar: plant-based fuel with no seed oils and no artificial sweeteners.",
    siteUrl: "https://kreaturesofhabit.com/",
    layout: "support",
    heroSrc: "/handoff/brands/kreatures.webp",
    heroAlt: "Kreatures of Habit Meal One oats",
    heroWidth: 1174,
    heroHeight: 1600,
    logoSrc: "/handoff/logos/kreatures.webp",
    logoAlt: "Kreatures of Habit logo",
    logoWidth: 236,
    logoHeight: 184,
    writeup: [
      "Kreatures of Habit makes clean, plant-based daily fuel. Meal One is high-protein overnight oats (site claims include 30g plant-based protein, probiotics, and Omega-3, with no added sugar). The Daily Bar is a plant-based protein bar with 3g creatine built in.",
      "Brand framing is blunt: no seed oils, no artificial sweeteners, nothing fake, ingredients you can pronounce. Founder Michael Chernow built the line after years as a chef and athlete looking for a breakfast that was clean, convenient, and worth repeating every day.",
      "This is the US food brand (kreaturesofhabit.com), not the India apparel label with a similar name. Facts only from the public site. No invented sell-through numbers. Public materials: kreaturesofhabit.com.",
    ],
  },
  {
    id: "foli",
    name: "FOLI",
    tag: "Pantry · Condiments",
    meta: "London · Interlocking glass · foliclub.com",
    hook: "The bottles that lock into one object.",
    teaser:
      "Olive oil, French dressing, chilli oil, and aged balsamic in a proprietary interlocking glass set meant to live on the counter.",
    siteUrl: "https://foliclub.com/",
    layout: "row",
    heroSrc: "/handoff/brands/foli.webp",
    heroAlt: "FOLI interlocking pantry bottles",
    heroWidth: 1600,
    heroHeight: 1600,
    logoSrc: "/handoff/logos/foli.webp",
    logoAlt: "FOLI logo",
    logoWidth: 1000,
    logoHeight: 526,
    writeup: [
      "FOLI is a London pantry brand built around sculptural glass bottles that interlock into one counter object. The system is the story: olive oil, dressings, and balsamic that look designed to stay out, not hide in a cupboard.",
      "SKUs visible on site include Extra Virgin Olive Oil, Classic French Salad Dressing, Chilli Infused Olive Oil, Mature Balsamic Vinegar, plus sets and hampers. Founder Nohra Currie has spoken publicly about the packaging architecture.",
      "Trade signals on the brand site include Harrods stocking and London Packaging Week / award finalist badges. No invented retail door counts. Public materials: foliclub.com.",
    ],
  },
  {
    id: "parch",
    name: "Parch",
    tag: "Drink · Non-alc",
    meta: "US · Agave cocktails · drinkparch.com",
    hook: "A margarita that never left the desert.",
    teaser:
      "Non-alcoholic sparkling agave cocktails built around Sonoran botanicals, adaptogens, and loud can design.",
    siteUrl: "https://drinkparch.com/",
    layout: "row",
    heroSrc: "/handoff/brands/parch.webp",
    heroAlt: "Parch Desert Margarita can",
    heroWidth: 1600,
    heroHeight: 1600,
    logoSrc: "/handoff/logos/parch.webp",
    logoAlt: "Parch logo",
    logoWidth: 300,
    logoHeight: 78,
    writeup: [
      'Parch makes non-alcoholic sparkling agave cocktails with a Sonoran desert visual system. Brand story pages lean on desert botanicals and the line "if it grows together, it goes together."',
      "Product names on the public site include Desert Margarita, Sedona Spritz, Prickly Paloma, and Spiced Piñarita (verify live SKUs at publish time). Packaging is the card stop: cream label, burnt-orange can, botanical seal.",
      "Quieter than the most famous NA aperitif names, which is the point for this mosaic. Do not invent sell-through or celebrity attachment claims. Public materials: drinkparch.com.",
    ],
  },
  {
    id: "lectra",
    name: "Lectra",
    tag: "Sports · Recovery tech",
    meta: "US · Conductive KT tape + stim · lectra.tech",
    hook: "Kinesiology tape that carries a current.",
    teaser:
      "CytoTape conductive kinesiology tape plus a snap-on Myto pod for wireless muscle stimulation controlled from your phone.",
    siteUrl: "https://lectra.tech/",
    layout: "row",
    heroSrc: "/handoff/brands/lectra.webp",
    heroAlt: "Lectra CytoTape and Myto stimulation pods",
    heroWidth: 1600,
    heroHeight: 896,
    logoSrc: "/handoff/logos/lectra.webp",
    logoAlt: "Lectra logo",
    logoWidth: 2041,
    logoHeight: 487,
    writeup: [
      "Lectra is a wearable recovery platform built from two parts: CytoTape, a conductive kinesiology tape with embedded electrode patterns, and Myto, a small rechargeable pod that snaps onto the tape and connects to a phone.",
      "It is wire-free muscle stimulation you can wear in daily life: apply the tape, snap the pod, control intensity and programs in the Lectra app. Site framing positions it for general wellness recovery, not as a medical device.",
      "Oregon Sports Angels has written about the company around conductive tape plus wireless stimulation. Public materials: lectra.tech. No invented clinical outcomes or sales figures.",
    ],
  },
  {
    id: "unwind",
    name: "Unwind",
    tag: "Drink · Functional",
    meta: "US · Sparkling calm · tryunwindco.com",
    hook: "Turn the noise down, in a can.",
    teaser:
      "Functional calm sparkling drink from Nowadays founders Justin Tidwell and Anthony Puterman. Approximately 1,000 Walmart stores, with TikTok Shop in mid-October.",
    siteUrl: "https://tryunwindco.com/",
    layout: "row",
    heroSrc: "/handoff/brands/unwind.webp",
    heroAlt: "Unwind sparkling cans in five flavors",
    heroWidth: 1600,
    heroHeight: 1200,
    logoSrc: "/handoff/logos/unwind.webp",
    logoAlt: "Unwind logo",
    logoWidth: 520,
    logoHeight: 240,
    writeup: [
      "Unwind is a functional sparkling drink for everyday calm, from Nowadays founders Justin Tidwell and Anthony Puterman. Each 12-ounce can pairs flavor with magnesium L-threonate (Magtein) and L-theanine, with zero caffeine, low sugar, and low calories. Five varieties: Berry, Cherry, Citrus, Tropical, and Spicy Lime. Suggested retail pricing begins at $2.79 a can and $10.99 a four-pack.",
      "The debut is a retail shelf story: approximately 1,000 Walmart stores nationwide, plus Walmart.com, with TikTok Shop to follow in mid-October for direct-to-consumer shipping. The Walmart launch is described as the first phase, with additional national retail rollouts scheduled for early 2027. The brand is based in Irvine, Calif. The public site lists 25 calories and frames the line as sparkling calm.",
      "Instagram and TikTok: @tryunwind. Public materials: tryunwindco.com. No invented follower counts or sell-through figures.",
    ],
  },
  {
    id: "puntr",
    name: "PUNTR",
    tag: "Sports · Pick'em",
    meta: "LA · Sports challenges · puntr.us",
    hook: "Ten picks. A free daily challenge.",
    teaser:
      "Los Angeles sports pick'em. Free daily challenges and cash prizes, plus paid solo challenges in eligible markets.",
    siteUrl: "https://www.puntr.us/",
    layout: "row",
    heroSrc: "/handoff/brands/puntr.webp",
    heroAlt: "PUNTR sports pick slip on a phone",
    heroWidth: 1600,
    heroHeight: 1200,
    logoSrc: "/handoff/logos/puntr.webp",
    logoAlt: "PUNTR mark",
    logoWidth: 511,
    logoHeight: 453,
    writeup: [
      'PUNTR is a Los Angeles sports pick\'em. The public site titles it "Sports Pick\'em - Free Daily Challenges & Cash Prizes." The live product is daily skill-based challenges linked to real sporting events: users make predictions across sports, build a performance record, and compete in repeatable formats. It is framed as participation rather than sports viewing, and as a companion to the wider sports experience rather than a replacement for live broadcasts.',
      "One current format is a free Daily Challenge of 10 picks across sport. Each pick carries a different difficulty, and rankings use both accuracy and difficulty. Paid solo challenges run in eligible markets, where users enter fixed challenges for prizes. The company says this is not a prediction-market exchange: no contract trading, and no need for another participant to take the opposite side.",
      'Longer-term direction, described as not yet available across the current product, includes more tailored challenges, relevant live moments, statistics, notifications, and suggestions on people to follow. Brad Hunt leads engineering, AI, live data, product architecture, and design. Founded by Australians. The public site links Instagram and TikTok @playpuntr and X @puntrplay. Public site: puntr.us. No invented user counts.',
    ],
  },
];
