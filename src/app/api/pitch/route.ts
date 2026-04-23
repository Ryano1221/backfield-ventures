import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stageMap: Record<string, string> = {
  "Pre-Seed": "pre-seed",
  "Seed": "seed",
  "Series A": "series-a",
};

function line(label: string, value: string | undefined) {
  return value?.trim() ? `${label}: ${value.trim()}` : null;
}

export async function POST(req: NextRequest) {
  try {
    const d = await req.json();

    // Build company notes — every pitch field, clearly labelled
    const companyNotes = [
      line("One-liner", d.oneLiner),
      "",
      line("Problem", d.problem),
      line("Solution", d.solution),
      line("Traction", d.traction),
      "",
      line("Raising", d.raiseAmount),
      line("Raised to date", d.raisedToDate),
      line("Deck", d.deckLink),
      "",
      line("Source", d.source),
      line("Additional notes", d.notes),
    ].filter((l) => l !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();

    // Build founder notes — background + team context
    const founderNotes = [
      line("Background", d.background),
      line("Team size", d.teamSize),
      line("Source", d.source),
    ].filter(Boolean).join("\n") || null;

    // 1. Create company record — all visible columns populated
    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .insert({
        name: d.company,
        website: d.website || null,
        stage: stageMap[d.stage] ?? null,
        sector: d.sector || null,
        description: d.oneLiner || null,
        location: d.location || null,
        status: "prospect",
        notes: companyNotes || null,
      })
      .select("id")
      .single();

    if (companyErr) throw companyErr;

    // 2. Create founder record — all visible columns populated
    const { data: person, error: personErr } = await supabase
      .from("people")
      .insert({
        full_name: d.founderName,
        email: d.founderEmail || null,
        title: d.founderRole || null,
        linkedin_url: d.linkedin || null,
        type: "founder",
        source: d.source || null,
        notes: founderNotes,
      })
      .select("id")
      .single();

    if (personErr) throw personErr;

    // 3. Link founder → company
    await supabase.from("relationships").insert({
      entity_a_type: "person",
      entity_a_id: person.id,
      entity_b_type: "company",
      entity_b_id: company.id,
      relationship_type: "founder",
    });

    // 4. Activity log — full submission snapshot
    await supabase.from("interactions").insert({
      entity_type: "company",
      entity_id: company.id,
      type: "note",
      content: `Inbound pitch — ${d.founderName} (${d.founderEmail})\n\n${companyNotes}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("pitch route error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
