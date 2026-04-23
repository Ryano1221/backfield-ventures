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

    // Parse sectors string into an array for investment_focus column
    // (displayed as tag pills in the CRM person detail view)
    const sectorsArray = d.sectors
      ? d.sectors.split(",").map((s: string) => s.trim()).filter(Boolean)
      : null;

    // Build person notes — every investor field, clearly labelled
    const personNotes = [
      line("Accredited investor status", d.accreditedStatus),
      line("Investor type", d.investorType),
      line("VC / alternatives experience", d.experience),
      "",
      line("Interest", d.interestLevel),
      line("Target check size", d.checkSize),
      line("Investment timeline", d.timeline),
      "",
      line("Referred by", d.referral),
      line("Preferred contact method", d.preferredContact),
      line("Additional notes", d.notes),
    ].filter((l) => l !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();

    // 1. Create prospective investor record — all visible columns populated
    const { data: person, error: personErr } = await supabase
      .from("people")
      .insert({
        full_name: `${d.firstName} ${d.lastName}`.trim(),
        email: d.email || null,
        phone: d.phone || null,
        location: d.location || null,
        company: d.organization || null,
        title: d.role || null,
        type: "prospective_investor",
        source: d.source || null,
        source_data: d.referral ? { referral: d.referral } : null,
        investment_focus: sectorsArray,
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
      content: `LP / investor inquiry — ${d.firstName} ${d.lastName} (${d.email})\n\n${personNotes}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("invest route error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
