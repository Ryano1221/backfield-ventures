/**
 * The first email to a lead, in Ryan's plain style. Used as is when no AI key
 * is set, and as the fallback when the AI draft fails.
 */
import type { Lead, LeadDraft } from "./types";

const firstName = (lead: Lead, to: string | null) => {
  const named = lead.contacts.find((c) => c.email === to)?.name ?? lead.people[0]?.name ?? "";
  return named.split(/\s+/)[0] || "there";
};

const signal = (lead: Lead, label: string) => lead.signals.find((s) => s.label === label)?.value;

/** "Example Snacks, Inc." -> "Example Snacks", the way you'd write it in an email. */
export function plainName(company: string): string {
  const name = company.replace(/,?\s+(inc|llc|l\.l\.c|corp|corporation|co|ltd|lp|l\.p\.|pbc)\.?$/i, "").trim() || company;
  // Filings often shout ("NOVA BOULDERS"); write it the way people do. Short acronyms like "AVSF" stay.
  if (name === name.toUpperCase() && /[A-Z]{2}/.test(name)) {
    return name.replace(/[A-Za-z][A-Za-z']*/g, (word) => (!/[aeiou]/i.test(word) || /[^aeiou']{3}/i.test(word) ? word : word.charAt(0) + word.slice(1).toLowerCase()));
  }
  return name;
}

export function templateDraft(lead: Lead): LeadDraft {
  const hi = `Hi ${firstName(lead, lead.to ?? lead.contacts[0]?.email ?? null)},`;
  const name = plainName(lead.company);
  if (lead.kind === "founder") {
    const raising = signal(lead, "Raising");
    return {
      by: "template",
      subject: `${name} + Backfield Ventures`,
      body: [
        hi,
        `I came across ${name}${raising ? ` and saw you're raising a ${raising} round` : ""}. I run Backfield Ventures in Austin. We back early consumer brands and help with retail, distribution and the next round.`,
        `Would you be up for a quick call so I can learn more about what you're building?`,
        `Best,\nRyan`,
      ].join("\n\n"),
    };
  }
  if (lead.kind === "partner") {
    return {
      by: "template",
      subject: `Swapping deals`,
      body: [
        hi,
        `I saw you've been investing through ${name}. I run Backfield Ventures in Austin, focused on early consumer brands.`,
        `Each month I send a short note to a few investors with three companies I like. Happy to add you, and I'd love to see what's crossing your desk too. Lmk if you're up for swapping deals.`,
        `Best,\nRyan`,
      ].join("\n\n"),
    };
  }
  // LP: about startups and The Handoff, never the fund.
  return {
    by: "template",
    subject: `Startups worth knowing about`,
    body: [
      hi,
      `I'm Ryan, I run Backfield Ventures in Austin. Each month I write The Handoff, a short note on early consumer brands I think are impressive and why.`,
      `A lot of readers just like seeing what's being built early. Want me to add you? Here's the page: backfieldventures.com/handoff`,
      `Best,\nRyan`,
    ].join("\n\n"),
  };
}
