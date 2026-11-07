import assert from "node:assert/strict";
import test from "node:test";
import { applyLeadOp, gmailLink, mergeLeads, parseImport, parseLeads } from "./leads/book";
import { templateDraft } from "./leads/draft";
import { DEFAULT_LIMITS, recentDays, runFinder, type RunDeps } from "./leads/run";
import { learnTaste, scoreLead } from "./leads/score";
import { classify, dailyIndexUrl, filingXmlUrl, leadFromFiling, parseDailyIndex, parseFormD, syndicateName, syndicatePerson } from "./leads/sec-form-d";
import { EMPTY_BOOK, type Lead } from "./leads/types";
import { vendorConfig, vendorContacts, vendorUrl } from "./leads/vendor";
import { extractEmails, findOnWebsite, guessDomains, pageMatches, rankEmails } from "./leads/website";

// Shaped like a real EDGAR Form D primary_doc.xml. Names and numbers are fake.
function formD(opts: { name: string; industry: string; fundType?: string; total?: string; sold?: string; investors?: string; age?: string; amendment?: boolean; people?: [string, string, string][] }): string {
  const people = (opts.people ?? [["Fixture", "Founder", "Executive Officer"]])
    .map(
      ([first, last, role]) => `<relatedPersonInfo>
            <relatedPersonName><firstName>${first}</firstName><lastName>${last}</lastName></relatedPersonName>
            <relatedPersonAddress><street1>1 Example St</street1><city>Austin</city><stateOrCountry>TX</stateOrCountry></relatedPersonAddress>
            <relatedPersonRelationshipList><relationship>${role}</relationship><relationship>Director</relationship></relatedPersonRelationshipList>
        </relatedPersonInfo>`,
    )
    .join("\n");
  return `<?xml version="1.0"?>
<edgarSubmission>
    <submissionType>D</submissionType>
    <primaryIssuer>
        <cik>0009999999</cik>
        <entityName>${opts.name}</entityName>
        <issuerAddress><street1>1 EXAMPLE ST</street1><city>AUSTIN</city><stateOrCountry>TX</stateOrCountry><zipCode>78704</zipCode></issuerAddress>
        <issuerPhoneNumber>5125550100</issuerPhoneNumber>
        <entityType>Corporation</entityType>
        <yearOfInc><${opts.age ?? "withinFiveYears"}>true</${opts.age ?? "withinFiveYears"}></yearOfInc>
    </primaryIssuer>
    <relatedPersonsList>
${people}
    </relatedPersonsList>
    <offeringData>
        <industryGroup><industryGroupType>${opts.industry}</industryGroupType>${opts.fundType ? `<investmentFundInfo><investmentFundType>${opts.fundType}</investmentFundType></investmentFundInfo>` : ""}</industryGroup>
        <typeOfFiling><newOrAmendment><isAmendment>${opts.amendment ? "true" : "false"}</isAmendment></newOrAmendment><dateOfFirstSale><value>2026-10-16</value></dateOfFirstSale></typeOfFiling>
        <offeringSalesAmounts><totalOfferingAmount>${opts.total ?? "1000000"}</totalOfferingAmount><totalAmountSold>${opts.sold ?? "400000"}</totalAmountSold></offeringSalesAmounts>
        <investors><totalNumberAlreadyInvested>${opts.investors ?? "8"}</totalNumberAlreadyInvested></investors>
    </offeringData>
</edgarSubmission>`;
}

const INDEX = `Description:           Daily Index of EDGAR Dissemination Feed by Form Type
Form Type   Company Name                                                  CIK         Date Filed  File Name
---------------------------------------------------------------------------------------------------------------------------------------------
1-A POS          Fixture Aero, Inc.                                        1890225     20261105    edgar/data/1890225/0001683168-26-008318.txt
D                Fixture Grandma, Inc.                                     2000001     20261105    edgar/data/2000001/0002000001-26-000001.txt
D                BL-1006 Fund I, a series of Example Angel Funds, LP       2000002     20261105    edgar/data/2000002/0002000002-26-000001.txt
D                GU-0907 Fund I, a series of Example Angel Funds, LP       2000003     20261105    edgar/data/2000003/0002000003-26-000001.txt
D/A              Fixture Amended Co                                        2000004     20261105    edgar/data/2000004/0002000004-26-000001.txt
D                Example Realty Fund LP                                    2000005     20261105    edgar/data/2000005/0002000005-26-000001.txt
`;

test("the daily index lists Form D filings and skips amendments and other forms", () => {
  const rows = parseDailyIndex(INDEX);
  assert.deepEqual(
    rows.map((row) => row.company),
    ["Fixture Grandma, Inc.", "BL-1006 Fund I, a series of Example Angel Funds, LP", "GU-0907 Fund I, a series of Example Angel Funds, LP", "Example Realty Fund LP"],
  );
  assert.equal(filingXmlUrl(rows[0]), "https://www.sec.gov/Archives/edgar/data/2000001/000200000126000001/primary_doc.xml");
  assert.equal(dailyIndexUrl("20261105"), "https://www.sec.gov/Archives/edgar/daily-index/2026/QTR4/form.20261105.idx");
});

test("a Form D reads into a founder lead with the raise, and no street or phone", () => {
  const form = parseFormD(formD({ name: "Fixture Grandma, Inc.", industry: "Retailing", total: "500000", sold: "250000", investors: "4" }));
  assert.ok(form);
  assert.equal(form.city, "Austin");
  assert.deepEqual(form.people, [{ name: "Fixture Founder", roles: ["Executive Officer", "Director"] }]);
  const kind = classify(form);
  assert.deepEqual(kind, { kind: "founder", group: "Fixture Grandma, Inc." });
  const lead = leadFromFiling(form, parseDailyIndex(INDEX)[0], kind!, "2026-11-06T00:00:00.000Z");
  assert.deepEqual(
    lead.signals.filter((s) => s.label !== "Filed").map((s) => `${s.label}: ${s.value}`),
    ["Raising: $500K", "In so far: $250K (50%)", "Investors: 4", "Industry: Retailing", "Company age: Under 5 years"],
  );
  assert.equal(lead.location, "Austin, TX");
  assert.ok(!JSON.stringify(lead).includes("5550100"));
  assert.ok(!JSON.stringify(lead).includes("Example St"));
});

test("classify keeps young consumer raises and venture syndicates, and drops the rest", () => {
  const kindOf = (opts: Parameters<typeof formD>[0]) => classify(parseFormD(formD(opts))!)?.kind ?? null;
  assert.equal(kindOf({ name: "Fixture Protein Energy Inc", industry: "Other" }), "founder");
  assert.equal(kindOf({ name: "Fixture Old Co", industry: "Retailing", age: "overFiveYears" }), null);
  assert.equal(kindOf({ name: "Fixture Big Co", industry: "Retailing", total: "90000000" }), null);
  assert.equal(kindOf({ name: "Fixture Co", industry: "Retailing", amendment: true }), null);
  assert.equal(kindOf({ name: "Example Holdings LLC", industry: "Other" }), null);
  assert.equal(kindOf({ name: "Fixture Bio", industry: "Biotechnology" }), null);
  assert.equal(classify({ ...parseFormD(formD({ name: "Fixture Co", industry: "Retailing" }))!, state: "K7" }), null);
  assert.equal(kindOf({ name: "Example Fund", industry: "Pooled Investment Fund", fundType: "Venture Capital Fund" }), "partner");
  assert.equal(kindOf({ name: "Example PE", industry: "Pooled Investment Fund", fundType: "Private Equity Fund" }), null);
  assert.equal(syndicateName("BL-1006 Fund I, a series of Example Angel Funds, LP"), "Example Angel Funds, LP");
  assert.equal(syndicateName("AVSF - Fixture 2026, LLC"), "AVSF");
});

test("website guesses, checks the page, and ranks published addresses", () => {
  assert.deepEqual(guessDomains("Fixture Grandma, Inc."), ["fixturegrandma.com", "getfixturegrandma.com", "tryfixturegrandma.com", "fixturegrandma.co"]);
  assert.ok(pageMatches("<title>Fixture Grandma | Cookies</title>", "Fixture Grandma, Inc."));
  assert.ok(!pageMatches("<title>Domain for sale</title>", "Fixture Grandma, Inc."));
  const html = `<a href="mailto:fixture@fixturegrandma.com">x</a> hello [at] fixturegrandma [dot] com support@fixturegrandma.com logo@2x.png someone@example.com`;
  assert.deepEqual(extractEmails(html, "fixturegrandma.com").sort(), ["fixture@fixturegrandma.com", "hello@fixturegrandma.com", "support@fixturegrandma.com"]);
  const ranked = rankEmails(["hello@fixturegrandma.com", "support@fixturegrandma.com", "fixture@fixturegrandma.com"], [{ name: "Fixture Founder", title: null }]);
  assert.deepEqual(
    ranked.map((c) => [c.email, c.confidence]),
    [
      ["fixture@fixturegrandma.com", "high"],
      ["hello@fixturegrandma.com", "medium"],
    ],
  );
});

test("findOnWebsite marks a guessed address as a guess", async () => {
  const pages: Record<string, string> = { "https://fixturegrandma.com": "<title>Fixture Grandma</title><p>hello@fixturegrandma.com</p>" };
  const result = await findOnWebsite("Fixture Grandma, Inc.", [{ name: "Fixture Founder", title: null }], null, {
    fetchText: async (url) => pages[url] ?? null,
    hasMx: async () => true,
  });
  assert.equal(result.website, "https://fixturegrandma.com");
  assert.deepEqual(
    result.contacts.map((c) => [c.email, c.source, c.confidence]),
    [
      ["hello@fixturegrandma.com", "website", "medium"],
      ["fixture@fixturegrandma.com", "guess", "low"],
    ],
  );
});

function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: "lead_founder_fixture",
    kind: "founder",
    key: "founder:fixture",
    company: "Fixture Snacks",
    people: [{ name: "Fixture Founder", title: "Executive Officer" }],
    website: "https://fixturesnacks.example",
    location: "Austin, TX",
    signals: [
      { label: "Raising", value: "$1.5M" },
      { label: "In so far", value: "$600K (40%)" },
      { label: "Industry", value: "Retailing" },
    ],
    contacts: [{ email: "fixture@example.com", name: "Fixture Founder", source: "website", confidence: "high", note: "" }],
    score: 0,
    reasons: [],
    draft: null,
    status: "new",
    to: null,
    source: "SEC Form D",
    source_url: null,
    note: "",
    found_at: "2026-11-06T00:00:00.000Z",
    updated_at: "2026-11-06T00:00:00.000Z",
    ...over,
  };
}

test("score explains itself and learns from ratings", () => {
  const none = learnTaste([]);
  const base = scoreLead(lead(), none);
  assert.equal(base.score, 100);
  assert.equal(base.reasons.length, 6);
  assert.ok(base.reasons.includes("+15 seed-size round"));
  assert.ok(base.reasons.includes("+15 named contact found"));
  const taste = learnTaste([
    { company: "Example Snacks", sector: "snacks", rating: "great" },
    { company: "Example Chips", sector: "snacks", rating: "good" },
    { company: "Example Cookies", sector: "snacks", rating: "great" },
    { company: "Example Bank", sector: "fintech", rating: "no" },
    { company: "Example Pay", sector: "fintech", rating: "no" },
  ]);
  const liked = scoreLead(lead({ contacts: [] }), taste);
  const plain = scoreLead(lead({ contacts: [] }), none);
  assert.ok(liked.score > plain.score, `${liked.score} > ${plain.score}`);
  assert.ok(liked.reasons.some((r) => r.includes("snacks")));
});

test("templates fit each kind, and the LP note never pitches the fund", () => {
  assert.match(templateDraft(lead()).body, /^Hi Fixture,\n\nI came across Fixture Snacks and saw you're raising a \$1\.5M round/);
  assert.match(templateDraft(lead({ kind: "partner", company: "Example Angel Funds, LP" })).body, /investing through Example Angel Funds\./);
  assert.equal(templateDraft(lead({ company: "Fixture Snacks, Inc." })).subject, "Fixture Snacks + Backfield Ventures");
  const lp = templateDraft(lead({ kind: "lp" })).body;
  assert.ok(!/invest in the fund|commit|returns|carry|terms/i.test(lp));
  assert.ok(!/—/.test(Object.values(templateDraft(lead())).join("")));
});

test("lead ops: approve needs an address, import parses lines, merge keeps status", () => {
  const book = { ...EMPTY_BOOK, leads: [lead({ contacts: [] })] };
  assert.deepEqual(applyLeadOp(book, { op: "approve", id: "lead_founder_fixture" }), { ok: false, error: "Pick or type an email address first." });
  const approved = applyLeadOp(book, { op: "approve", id: "lead_founder_fixture", to: "Fixture@Example.com" });
  assert.ok(approved.ok);
  assert.equal(approved.book.leads[0].status, "approved");
  assert.equal(approved.book.leads[0].to, "fixture@example.com");

  const merged = mergeLeads(approved.book, [lead({ signals: [{ label: "Raising", value: "$2M" }] })]);
  assert.equal(merged.added, 0);
  assert.equal(merged.book.leads[0].status, "approved");
  assert.equal(merged.book.leads[0].signals.find((s) => s.label === "Raising")?.value, "$2M");

  const imported = parseImport("Fixture Person, Example Family Office, fp@example.com, met at Example Summit\n\nCasey Example", "lp", "2026-11-06T00:00:00.000Z");
  assert.equal(imported.length, 2);
  assert.equal(imported[0].company, "Example Family Office");
  assert.equal(imported[0].to, "fp@example.com");
  assert.equal(imported[0].note, "met at Example Summit");
  assert.equal(imported[1].contacts.length, 0);

  const withDraft = { ...lead({ to: "fixture@example.com" }), draft: templateDraft(lead()) };
  const link = new URL(gmailLink(withDraft)!);
  assert.equal(link.searchParams.get("to"), "fixture@example.com");
  assert.equal(link.searchParams.get("su"), "Fixture Snacks + Backfield Ventures");
  assert.deepEqual(parseLeads("not json"), EMPTY_BOOK);
});

test("vendor slot stays off until configured, then fills the URL", async () => {
  assert.equal(vendorConfig({}), null);
  const config = vendorConfig({ LEADS_VENDOR_NAME: "Example", LEADS_VENDOR_URL: "https://api.example.com/find?domain={domain}&first={first}&last={last}&key={key}", LEADS_VENDOR_KEY: "k1", LEADS_VENDOR_EMAIL_PATH: "data.email" })!;
  assert.equal(vendorUrl(config, { domain: "fixture.example", first: "Fixture", last: "Founder", company: "x" }), "https://api.example.com/find?domain=fixture.example&first=Fixture&last=Founder&key=k1");
  const contacts = await vendorContacts(config, "Fixture", [{ name: "Fixture Founder", title: null }], "https://fixture.example", async () => ({ data: { email: "Fixture@Fixture.example" } }));
  assert.deepEqual(contacts.map((c) => [c.email, c.source]), [["fixture@fixture.example", "vendor:Example"]]);
});

test("a run reads filings, groups syndicates, finds contacts, and remembers where it stopped", async () => {
  const pages: Record<string, string> = {
    [dailyIndexUrl("20261105")]: INDEX,
    "https://www.sec.gov/Archives/edgar/data/2000001/000200000126000001/primary_doc.xml": formD({ name: "Fixture Grandma, Inc.", industry: "Retailing", total: "500000", sold: "250000" }),
    "https://www.sec.gov/Archives/edgar/data/2000002/000200000226000001/primary_doc.xml": formD({ name: "BL-1006 Fund I, a series of Example Angel Funds, LP", industry: "Pooled Investment Fund", fundType: "Venture Capital Fund", total: "120000", people: [["Fixture", "Angel", "Executive Officer"]] }),
    "https://www.sec.gov/Archives/edgar/data/2000003/000200000326000001/primary_doc.xml": formD({ name: "GU-0907 Fund I, a series of Example Angel Funds, LP", industry: "Pooled Investment Fund", fundType: "Venture Capital Fund", total: "80000", people: [["Fixture", "Angel", "Executive Officer"]] }),
    "https://www.sec.gov/Archives/edgar/data/2000005/000200000526000001/primary_doc.xml": formD({ name: "Example Realty Fund LP", industry: "Other Real Estate" }),
  };
  const web: Record<string, string> = { "https://fixturegrandma.com": "<title>Fixture Grandma</title> fixture@fixturegrandma.com" };
  const deps: RunDeps = {
    secText: async (url) => pages[url] ?? null,
    webText: async (url) => web[url] ?? null,
    hasMx: async () => false,
    vendor: null,
    ai: null,
    research: null,
    taste: learnTaste([]),
    now: new Date("2026-11-06T12:00:00Z"),
    pause: async () => undefined,
  };
  const first = await runFinder(EMPTY_BOOK, deps, { ...DEFAULT_LIMITS, days: 1 });
  assert.equal(first.run.scanned, 4);
  assert.equal(first.run.added, 2);
  const founder = first.book.leads.find((l) => l.kind === "founder")!;
  assert.equal(founder.website, "https://fixturegrandma.com");
  assert.equal(founder.to, "fixture@fixturegrandma.com");
  assert.equal(founder.draft?.by, "template");
  const partner = first.book.leads.find((l) => l.kind === "partner")!;
  assert.equal(partner.company, "Example Angel Funds, LP");
  assert.equal(partner.signals.find((s) => s.label === "Vehicles filed")?.value, "2");
  assert.deepEqual(first.book.cursor.done_days, ["20261105"]);

  const second = await runFinder(first.book, deps, { ...DEFAULT_LIMITS, days: 1 });
  assert.equal(second.run.scanned, 0);
  assert.equal(second.book.leads.length, 2);
});

test("recent days skip weekends", () => {
  assert.deepEqual(recentDays(new Date("2026-11-09T12:00:00Z"), 3), ["20261106", "20261105", "20261104"]);
});

test("a syndicate named after a person gets that person; other names don't", () => {
  assert.equal(syndicatePerson("Fixture Example Angel Funds, LP"), "Fixture Example");
  assert.equal(syndicatePerson("Casey Example Syndicate"), "Casey Example");
  assert.equal(syndicatePerson("Roll Up Vehicles, LP"), null);
  assert.equal(syndicatePerson("JMWTX Investments, LP"), null);
  assert.equal(syndicatePerson("Platform Funds 2026, LP"), null);
});
