/**
 * Lead finder: one pipeline for three kinds of people Ryan reaches out to.
 *   founder  a young company raising a round (to invest in)
 *   partner  someone running a small venture fund or angel syndicate (to swap deals, Best 3)
 *   lp       someone who might back the fund (pasted in or from a paid data source)
 * Nothing here sends email. Approving a lead only prepares a draft Ryan sends himself.
 */

export const LEAD_KINDS = ["founder", "partner", "lp"] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

export const KIND_LABEL: Record<LeadKind, string> = { founder: "Founders", partner: "Partners", lp: "LPs" };

export type LeadStatus = "new" | "approved" | "contacted" | "skipped";

export type LeadSignal = { label: string; value: string; source_url?: string | null };

export type LeadPerson = { name: string; title: string | null };

export type Confidence = "high" | "medium" | "low";

export type LeadContact = {
  email: string;
  /** Who the address belongs to, when it is a person's. */
  name: string | null;
  /** "website", "guess", "import", or "vendor:<name>". */
  source: string;
  confidence: Confidence;
  note: string;
};

export type LeadDraft = { subject: string; body: string; by: "ai" | "template" };

export type Lead = {
  id: string;
  kind: LeadKind;
  /** Dedupe key: kind plus the normalised company or fund name. */
  key: string;
  company: string;
  people: LeadPerson[];
  website: string | null;
  location: string | null;
  signals: LeadSignal[];
  contacts: LeadContact[];
  /** 0 to 100. Higher is a better fit. */
  score: number;
  reasons: string[];
  draft: LeadDraft | null;
  status: LeadStatus;
  /** Which contact the draft goes to, once picked. */
  to: string | null;
  source: string;
  source_url: string | null;
  note: string;
  found_at: string;
  updated_at: string;
};

export type LeadRun = { at: string; scanned: number; added: number; updated: number; errors: string[] };

export type LeadBook = {
  version: 1;
  leads: Lead[];
  /** Where the SEC reader left off. */
  cursor: { done_days: string[]; done_filings: string[] };
  last_run: LeadRun | null;
};

export const EMPTY_BOOK: LeadBook = { version: 1, leads: [], cursor: { done_days: [], done_filings: [] }, last_run: null };
