import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { runResearch, type LeadResearch } from "./research";
import type { Lead } from "./types";

/**
 * Researches a lead with Claude's web search and web fetch. Public pages only:
 * login-walled sites like LinkedIn and Instagram are reachable only where a
 * search engine shows the post. Verification lives in research.ts.
 */
export async function researchLead(lead: Lead, now: Date): Promise<LeadResearch> {
  const client = new Anthropic();
  return runResearch(lead, now, (params) => client.beta.messages.create(params));
}
