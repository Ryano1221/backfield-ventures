import assert from "node:assert/strict";
import test from "node:test";
import { emailParagraphs, mergeLabel, parseSender, restoreBreaks } from "./email-preview";
import { validateSnapshot } from "./schema";
import { BEST3_TEXT } from "../email/template-text";

const FLAT =
  "{{FIRST_NAME}}, Here's a couple interesting companies that I thought you might be interested in. Lmk if you want to know more or want an intro. 1) WELD Protein Energy (drinkweld.com): clear protein energy drink. Raising a $1.5M seed SAFE at a $10M cap. 2) Le Lick (enjoylelick.com): electrolyte lollipops. 4.4 stars on 205 reviews. 3) SkyMD (tryskymd.com): electrolyte drink mix. Keep me in mind as you see deals that could be a fit, and I'll keep sending ones I like your way. Best,";

const plain = (text: string) => emailParagraphs(text).map((p) => p.map((line) => line.map((part) => (part.kind === "merge" ? `<${part.field}>` : part.value)).join("")).join("\n"));

test("a flattened body gets its greeting, numbered picks, and sign-off back", () => {
  const paragraphs = plain(FLAT);
  assert.equal(paragraphs[0], "<FIRST_NAME>,");
  assert.match(paragraphs[1], /^Here's a couple/);
  assert.match(paragraphs[2], /^1\) WELD Protein Energy .*\$1\.5M seed SAFE at a \$10M cap\.$/);
  assert.match(paragraphs[3], /^2\) Le Lick .*4\.4 stars on 205 reviews\.$/);
  assert.match(paragraphs[4], /^3\) SkyMD/);
  assert.equal(paragraphs.at(-1), "Best,");
  assert.equal(paragraphs.length, 6);
});

test("a body with real line breaks is left as written", () => {
  const text = "Hi {{first_name|there}},\n\nLine one\nline two\n\n\n1. Pick\nSource: https://example.com/a.\n\nBest,\nRyan";
  assert.equal(restoreBreaks(text), text);
  assert.deepEqual(plain(text), ["Hi <first_name>,", "Line one\nline two", "1. Pick\nSource: https://example.com/a.", "Best,\nRyan"]);
  const source = emailParagraphs(text)[2][1];
  assert.deepEqual(source[1], { kind: "link", value: "https://example.com/a", href: "https://example.com/a" });
  assert.deepEqual(emailParagraphs(text)[0][0][1], { kind: "merge", field: "first_name", fallback: "there" });
});

test("merge fields read as plain labels", () => {
  assert.equal(mergeLabel("FIRST_NAME"), "First name");
  assert.equal(mergeLabel("partner_email"), "Partner email");
});

test("ingest keeps the line breaks in a preview body", () => {
  const result = validateSnapshot({
    schema_version: 1,
    generated_at: "2026-11-04T18:00:00.000Z",
    pitches: [],
    bots: [],
    outreach: [],
    activity: [],
    decisions: [
      {
        id: "dec_mail",
        title: "Send the pack",
        since: "2026-11-04T15:00:00.000Z",
        link: null,
        options: [{ value: "yes", label: "Yes" }],
        detail: { preview: { subject: "Three companies (October 2026)", text: BEST3_TEXT } },
      },
    ],
  });
  assert.ok(result.ok, JSON.stringify(!result.ok && result.issues));
  const text = result.snapshot.decisions[0]?.detail?.preview?.text || "";
  assert.match(text, /Hi \{\{first_name\|there\}\},\n\nHere are three companies/);
  assert.match(text, /\n\n1\. Sample Company One/);
  assert.ok(!/\n{3,}/.test(text));
});

test("bare domains become links the way Gmail shows them, emails and numbers do not", () => {
  const links = emailParagraphs("WELD (drinkweld.com): $1.5M at a $10M cap. Write ryan@backfieldventures.com or see tryskymd.com/daily.")
    .flat(2)
    .filter((part) => part.kind === "link");
  assert.deepEqual(links, [
    { kind: "link", value: "drinkweld.com", href: "https://drinkweld.com" },
    { kind: "link", value: "tryskymd.com/daily", href: "https://tryskymd.com/daily" },
  ]);
});

test("the sender splits into name, address and initial", () => {
  assert.deepEqual(parseSender("Ryan Arnold <ryan@backfieldventures.com>"), { name: "Ryan Arnold", email: "ryan@backfieldventures.com", initial: "R" });
});
