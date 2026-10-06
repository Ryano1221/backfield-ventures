export type HandoffBrandId =
  | "omorpho"
  | "bandit"
  | "halfdays"
  | "kreatures"
  | "foli"
  | "parch"
  | "lectra"
  | "unwind"
  | "puntr"
  | "spade"
  | "stillers"
  | "growl"
  | "drumroll"
  | "lastcrumb";

export type HandoffBrand = {
  id: HandoffBrandId;
  name: string;
  tag: string;
  meta: string;
  hook: string;
  teaser: string;
  siteUrl: string;
  layout: "support" | "row";
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
    layout: "row",
    heroSrc: "/handoff/brands/omorpho.webp",
    heroAlt: "Omorpho micro-weighted training gear",
    heroWidth: 1600,
    heroHeight: 1200,
    logoSrc: "/handoff/logos/omorpho.webp",
    logoAlt: "Omorpho logo",
    logoWidth: 250,
    logoHeight: 33,
    writeup: [
      "Omorpho builds micro-weighted training apparel. G-Wear tops and tights use patented MicroLoad polymer and polyurethane spheres distributed through the garment, so the load sits in the fabric instead of a bulky vest silhouette. The G-Vest line uses stainless-steel bearings under the MicroLoad name.",
      "Site framing covers run, walk, and train use cases, and weighted items are listed as HSA/FSA eligible. The product photographs as athletic kit first and a training tool second.",
      "Public coverage has treated the weighted-apparel approach as a product story (including Men's Health review framing).",
    ],
  },
  {
    id: "bandit",
    name: "Bandit Running",
    tag: "Apparel · Running",
    meta: "Brooklyn · Running apparel · banditrunning.com",
    hook: "Running kit built inside a run crew.",
    teaser:
      "Brooklyn running apparel made with the New York running community, from a Greenpoint storefront outward.",
    siteUrl: "https://www.banditrunning.com/",
    layout: "row",
    heroSrc: "/handoff/brands/bandit.webp",
    heroAlt: "Bandit runner in black kit",
    heroWidth: 1600,
    heroHeight: 1200,
    logoSrc: "/handoff/logos/bandit.webp",
    logoAlt: "Bandit Running logo",
    logoWidth: 726,
    logoHeight: 152,
    writeup: [
      "Bandit Running makes performance running apparel in Brooklyn. Founder Tim West started it in a basement apartment in 2020. The first product was cushioned running socks in white and black, packed by hand. The about page says the New York running community, including friends from Brooklyn Track Club, carried those early socks, and the line is now head-to-toe apparel.",
      "The name comes from Bobbi Gibb, who raced the 1966 Boston Marathon before women were allowed to compete. West calls her the original bandit. Community is the working method: fabrics and fits come from runner feedback and wear-testing, and Greenpoint Runners meets for four easy miles on Saturday mornings, then coffee and bagels.",
      "The brand opened a headquarters and a Brooklyn store in Greenpoint. Co-founders named on the site include Nick West and Ardith Singh, chief design officer. The Nova Crop, a running top with fuel pockets, is listed among TIME Magazine's Best Inventions of 2024. Instagram: @bandit.",
    ],
  },
  {
    id: "halfdays",
    name: "Halfdays",
    tag: "Apparel · Ski",
    meta: "Colorado · Women's ski · halfdays.com",
    hook: "A mountain kit cut for women.",
    teaser:
      "Olympian-founded ski and mountain apparel from Colorado, made so more women can own the mountain, from the slope into year-round outdoor kit.",
    siteUrl: "https://halfdays.com/",
    layout: "row",
    heroSrc: "/handoff/brands/halfdays.webp",
    heroAlt: "Halfdays Georgie puffer jacket",
    heroWidth: 1600,
    heroHeight: 1200,
    logoSrc: "/handoff/logos/halfdays.webp",
    logoAlt: "Halfdays logo",
    logoWidth: 690,
    logoHeight: 168,
    writeup: [
      "Halfdays makes women's ski and mountain apparel. The homepage frames it as technical kit with inclusive sizing, and pushes back on hard-core outdoor culture. The line on the site is \"bye-bye, boys club.\" The brand says it is Olympian-founded and designed in Colorado.",
      "Co-founder Kiley McKinnon started Halfdays after competing in men's ski wear at the 2018 Winter Olympics, tired of unisex fits that were really cut for men. She launched with co-founders Ariana and Karelle. The about page says the company launched in 2020, ski is where it started, and the line has since expanded into outdoor apparel for the mountain year-round, for every level of skier.",
      "The public timeline names a first spring and summer collection, Nordstrom, REI, and a flagship on Walnut Street in Denver. Instagram and TikTok: @halfdays.",
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
    ],
  },
  {
    id: "foli",
    name: "FOLI",
    tag: "Pantry · Condiments",
    meta: "London · Interlocking glass · foliclub.com",
    hook: "The bottles that lock into one object.",
    teaser:
      "Olive oil, French dressing, chilli oil, and mature balsamic vinegar of Modena in a proprietary interlocking glass set meant to live on the counter.",
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
      "The shop lists Premium Extra Virgin Olive Oil, Premium French Salad Dressing, Premium Chilli Infused Olive Oil, and Premium Mature Balsamic Vinegar, plus the Premium Classic Trio and the Premium Classic & Chilli Trio. Founder Nohra Currie has spoken publicly about the packaging architecture.",
      "Trade signals on the brand site include Harrods stocking and 2026 award-finalist badges. A September 2026 post on the site says FOLI won Everyday Homeware (Under £50) at the London Packaging Week Innovation Awards for the Set of Essential Premium Dressings.",
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
      'Parch makes non-alcoholic sparkling agave cocktails with a Sonoran desert visual system. Brand story pages lean on desert botanicals and the line "what grows together, goes together."',
      "Product names on the public site include Desert Margarita, Sedona Spritz, Prickly Paloma, and Spiced Piñarita.",
      "Quieter than the most famous NA aperitif names, which is the point for this mosaic.",
    ],
  },
  {
    id: "lectra",
    name: "Lectra",
    tag: "Sports · Recovery tech",
    meta: "US · Conductive kinesiology tape · lectra.tech",
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
      "Instagram and TikTok: @tryunwind.",
    ],
  },
  {
    id: "puntr",
    name: "PUNTR",
    tag: "Sports · Pick'em",
    meta: "LA · Sports challenges · puntr.us",
    hook: "A free daily multi-pick challenge.",
    teaser:
      "Los Angeles sports pick'em. Free daily challenges and cash prizes, plus paid challenges in eligible markets.",
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
      "One current format is a free daily multi-pick challenge across sport. Each pick carries a different difficulty, and rankings use both accuracy and difficulty. Paid challenges run in eligible markets, where users enter fixed challenges for prizes.",
      'Longer-term direction, described as not yet available across the current product, includes more tailored challenges, relevant live moments, statistics, notifications, and suggestions on people to follow. Brad Hunt leads engineering, AI, live data, product architecture, and design. Founded by Australians. The public site links Instagram and TikTok @playpuntr and X @puntrplay.',
    ],
  },
  {
    id: "spade",
    name: "Spade",
    tag: "Drink · Soda",
    meta: "San Diego · Zero-sugar soda · drinkspade.com",
    hook: "A soda with the sugar taken out.",
    teaser:
      "All-natural, zero-sugar, zero-calorie soda with electrolytes. Guava, Yuzu-Lime, and Kiwi-Strawberry in Walmart's Modern Soda set.",
    siteUrl: "https://www.drinkspade.com/",
    layout: "row",
    heroSrc: "/handoff/brands/spade.webp",
    heroAlt: "Spade Guava, Yuzu-Lime, and Kiwi-Strawberry cans",
    heroWidth: 1600,
    heroHeight: 1200,
    logoSrc: "/handoff/logos/spade.webp",
    logoAlt: "Spade wordmark",
    logoWidth: 543,
    logoHeight: 131,
    writeup: [
      "Spade is a San Diego better-for-you soda. The public site calls it all natural, with no sugar, zero calories, and electrolytes. A December 2025 release says each can uses six ingredients, with no artificial sweeteners or preservatives, and is sweetened with a stevia extract.",
      "The retail story is a shelf story: 245 Walmart stores across California beginning January 5, 2026, in the Modern Soda set, in Guava, Yuzu-Lime, and Kiwi-Strawberry. The same release names Fresh Thyme, Bristol Farms, Foodland, select Albertsons banners (United and Market Street), and Amazon. Blake Berman is CEO and co-founder. The public site also sells Blueberry Açaí, Dr. Spade, and Cola.",
      "Instagram, TikTok, and X: @drinkspade.",
    ],
  },
  {
    id: "stillers",
    name: "Stiller's Soda",
    tag: "Drink · Soda",
    meta: "US · Classic soda · stillerssoda.com",
    hook: "The classic can, made lighter.",
    teaser:
      "Ben Stiller and Alex Doman. Root Beer, Lemon Lime, and Shirley Temple, at 30 calories and 7 grams of sugar.",
    siteUrl: "https://stillerssoda.com/",
    layout: "row",
    heroSrc: "/handoff/brands/stillers.webp",
    heroAlt: "Stiller's Soda Lemon Lime can",
    heroWidth: 1600,
    heroHeight: 1200,
    logoSrc: "/handoff/logos/stillers.webp",
    logoAlt: "Stiller's Soda logo",
    logoWidth: 900,
    logoHeight: 247,
    writeup: [
      "Stiller's Soda is a nostalgic better-for-you soda from Ben Stiller and Alex Doman. The September 2025 launch named three flavors: Root Beer, Lemon Lime, and Shirley Temple. Each 12-ounce can has 30 calories and 7 grams of sugar, from cane sugar, stevia, and monk fruit, plus vitamins D, B12, and C. The public site calls it all natural and low in calories, and also shops Shirley Cola.",
      "The public site points to Whole Foods Market, Walmart, Target, and Amazon. A January 2026 Food Business News piece places the line in Target nationwide, Whole Foods Market in New York, Connecticut, and New Jersey, and Walmart in the Northeast.",
      "Instagram and X: @stillerssoda. YouTube: @stillerssoda.",
    ],
  },
  {
    id: "growl",
    name: "GROWL",
    tag: "Sports · AI trainer",
    meta: "Home training · joingrowl.com",
    hook: "A coach at human scale.",
    teaser:
      "A life-size, human-like AI personal trainer for the home. The site calls the current coach an early prototype, with a waitlist.",
    siteUrl: "https://www.joingrowl.com/",
    layout: "row",
    heroSrc: "/handoff/brands/growl.webp",
    heroAlt: "GROWL life-size AI trainer in a home",
    heroWidth: 1600,
    heroHeight: 900,
    logoSrc: "/handoff/logos/growl.webp",
    logoAlt: "GROWL wordmark",
    logoWidth: 1400,
    logoHeight: 293,
    writeup: [
      "GROWL is a life-size, human-like AI personal trainer meant for the home. The public site describes a projected coach at human scale, an interactive touch surface, 3D motion tracking, and AI vision, hearing, and generative coaching with 360° feedback on each rep. Disciplines listed on the site include boxing, strength, Pilates, yoga, recovery, and gaming. The company says this is an early prototype of a fully generative coach, with a waitlist and a showroom visit.",
      "The site frames the trainer as something for a whole household, kids included, and designed to live in the home rather than a garage. Cyril Gane, interim UFC heavyweight champion, appears as an early user. Press named on the site includes TechCrunch, The Verge, Fast Company, and Athletech News. The footer reads GROWL (BoxCo Interactive, Inc.).",
      "Instagram and TikTok: @joingrowl.",
    ],
  },
  {
    id: "drumroll",
    name: "Drumroll",
    tag: "Food · Donuts",
    meta: "Plant-based donuts · eatdrumroll.com",
    hook: "A donut with the protein left in.",
    teaser:
      "Fluffy, cakey, plant-based donuts. Gluten-free and grain-free, with 10 grams of protein and 1 gram of sugar.",
    siteUrl: "https://eatdrumroll.com/",
    layout: "row",
    heroSrc: "/handoff/brands/drumroll.webp",
    heroAlt: "Drumroll chocolate glazed plant-based donut",
    heroWidth: 1600,
    heroHeight: 900,
    logoSrc: "/handoff/logos/drumroll.webp",
    logoAlt: "Drumroll wordmark",
    logoWidth: 1400,
    logoHeight: 186,
    writeup: [
      "Drumroll Snacks makes plant-based donuts: fluffy, cakey, and glazed. The homepage lists the line as gluten-free and grain-free, with 10 grams of protein, 1 gram of sugar, and 190 calories. Product copy also lists 8 grams of net carbs. The catalog names chocolate, vanilla, and strawberry.",
      "The chocolate glazed page describes simple, plant-based ingredients and says the donuts are perishable and meant to stay refrigerated. The homepage line is “Donuts for the people.”",
      "Instagram: @drumrollsnacks. TikTok: @drumrolldonuts.",
    ],
  },
  {
    id: "lastcrumb",
    name: "Last Crumb",
    tag: "Food · Cookies",
    meta: "Brooklyn · Ships nationwide · lastcrumb.com",
    hook: "Cookies that take three days.",
    teaser:
      "Handcrafted cookies from Brooklyn, with a Williamsburg shop and nationwide shipping. The Core Collection is a dozen, assorted by the head baker.",
    siteUrl: "https://lastcrumb.com/",
    layout: "row",
    heroSrc: "/handoff/brands/lastcrumb.webp",
    heroAlt: "Last Crumb chocolate chip cookie",
    heroWidth: 1600,
    heroHeight: 900,
    logoSrc: "/handoff/logos/lastcrumb.webp",
    logoAlt: "Last Crumb wordmark",
    logoWidth: 1200,
    logoHeight: 254,
    writeup: [
      "Last Crumb makes handcrafted cookies in Brooklyn and ships nationwide. The public site says the cookies are handcrafted over three days, and a Williamsburg shop at 144 N 8th Street bakes them fresh daily. The page title calls them the best cookies in Brooklyn.",
      "The Core Collection is a dozen, listed at $120, assorted by the head baker. Flavors named on the homepage include The O.G., The Madonna, When Life Gives You Lemons, The Floor Is Lava, Macadamnia, and S'mores Sans Campfire.",
      "Instagram and TikTok: @lastcrumb. X: @LastCrumbCookie.",
    ],
  },
];
