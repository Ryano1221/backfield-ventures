import type { InspoSource } from "./types";

/**
 * The starting list. Ryan can add or remove anyone on the Studio page.
 * Public feeds work with no key; LinkedIn and X wait for an Apify key.
 */
export const DEFAULT_SOURCES: InspoSource[] = [
  { id: "20vc", name: "20VC (Harry Stebbings)", kind: "feed", url: "https://thetwentyminutevc.libsyn.com/rss" },
  { id: "a16z-podcast", name: "a16z Podcast", kind: "feed", url: "https://feeds.simplecast.com/JGE3yC0V" },
  { id: "a16z", name: "a16z", kind: "feed", url: "https://a16z.substack.com/feed" },
  { id: "notboring", name: "Not Boring (Packy McCormick)", kind: "feed", url: "https://www.notboring.co/feed" },
  { id: "huddleup", name: "Huddle Up (Joe Pompliano)", kind: "feed", url: "https://huddleup.substack.com/feed" },
  { id: "avc", name: "AVC (Fred Wilson)", kind: "feed", url: "https://avc.com/feed/" },
  { id: "eladgil", name: "Elad Gil", kind: "feed", url: "https://blog.eladgil.com/feed" },
  { id: "andrewchen", name: "Andrew Chen", kind: "feed", url: "https://andrewchen.substack.com/feed" },
  { id: "tunguz", name: "Tomasz Tunguz", kind: "feed", url: "https://tomtunguz.com/index.xml" },
  { id: "lenny", name: "Lenny's Newsletter", kind: "feed", url: "https://www.lennysnewsletter.com/feed" },
  { id: "fos", name: "Front Office Sports", kind: "feed", url: "https://frontofficesports.com/feed/" },
  { id: "x-harry", name: "Harry Stebbings", kind: "x", url: "HarryStebbings" },
  { id: "x-a16z", name: "a16z", kind: "x", url: "a16z" },
  { id: "x-eyin", name: "Elizabeth Yin (Hustle Fund)", kind: "x", url: "dunkhippo33" },
  { id: "li-harry", name: "Harry Stebbings", kind: "linkedin", url: "https://www.linkedin.com/in/harrystebbings/" },
  { id: "li-eyin", name: "Elizabeth Yin (Hustle Fund)", kind: "linkedin", url: "https://www.linkedin.com/in/elizabethyin/" },
];
