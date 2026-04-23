import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function line(label: string, value: string | undefined) {
  return value?.trim() ? `${label}: ${value.trim()}` : null;
}

export async function POST(req: NextRequest) {
  try {
    const d = await req.json();

    // Parse sector into array for investment_focus column
    // (displayed as tag pills in the CRM person detail view)
    const sectorArray = d.sector?.trim() ? [d.sector.trim()] : null;

    // Build person notes — every partner field, clearly labelled
    const personNotes = [
      line("Operator background", d.background),
      "",
      line("Stage experience", d.stageExperience),
      line("Functional strengths", d.functionalStrengths),
      line("Advisory experience", d.advisoryExperience),
      "",
      line("Primary interest", d.primaryInterest),
      line("Time commitment", d.timeCommitment),
      line("Compensation preference", d.compensation),
      "",
      line("Why Backfield", d.whyBackfield),
      line("Referred by", d.referral),
      line("Additional notes", d.notes),
    ].filter((l) => l !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();

    // 1. Create operator / partner record — all visible columns populated
    const { data: person, error: personErr } = await supabase
      .from("people")
      .insert({
        full_name: `${d.firstName} ${d.lastName}`.trim(),
        email: d.email || null,
        linkedin_url: d.linkedin || null,
        title: d.title || null,
        company: d.company || null,
        type: "operator",
        source: d.source || null,
        source_data: d.referral ? { referral: d.referral } : null,
        investment_focus: sectorArray,
        notes: personNotes || null,
      })
      .select("id")
      .single();

    if (personErr) throw personErr;

    // 2. Activity log — full submission snapshot
    await supabase.from("interactions").insert({
      entity_type: "person",
      entity_id: person.id,
      type: "note",
      content: `Partner inquiry — ${d.firstName} ${d.lastName} (${d.email})\n\n${personNotes}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("partner route error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
