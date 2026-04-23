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

export async function POST(req: NextRequest) {
  try {
    const d = await req.json();

    // 1. Create company record
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
      })
      .select("id")
      .single();

    if (companyErr) throw companyErr;

    // 2. Create founder record
    const { data: person, error: personErr } = await supabase
      .from("people")
      .insert({
        full_name: d.founderName,
        email: d.founderEmail || null,
        title: d.founderRole || null,
        linkedin_url: d.linkedin || null,
        notes: d.background || null,
        type: "founder",
        source: d.source || null,
        metadata: d.teamSize ? { team_size: d.teamSize } : null,
      })
      .select("id")
      .single();

    if (personErr) throw personErr;

    // 3. Link founder to company
    await supabase.from("relationships").insert({
      entity_a_type: "person",
      entity_a_id: person.id,
      entity_b_type: "company",
      entity_b_id: company.id,
      relationship_type: "founder",
    });

    // 4. Log full pitch details as a note on the company
    const noteParts = [
      d.oneLiner && `One-liner: ${d.oneLiner}`,
      d.problem && `Problem: ${d.problem}`,
      d.solution && `Solution: ${d.solution}`,
      d.traction && `Traction: ${d.traction}`,
      d.raiseAmount && `Raising: ${d.raiseAmount}`,
      d.raisedToDate && `Raised to date: ${d.raisedToDate}`,
      d.deckLink && `Deck: ${d.deckLink}`,
      d.source && `Source: ${d.source}`,
      d.notes && `Notes: ${d.notes}`,
    ].filter(Boolean).join("\n");

    await supabase.from("interactions").insert({
      entity_type: "company",
      entity_id: company.id,
      type: "note",
      content: `Inbound pitch from ${d.founderName} (${d.founderEmail})\n\n${noteParts}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("pitch route error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
