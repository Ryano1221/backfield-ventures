import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const d = await req.json();

    // 1. Create prospective investor record
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
      })
      .select("id")
      .single();

    if (personErr) throw personErr;

    // 2. Log interest details as a note
    const noteParts = [
      d.accreditedStatus && `Accredited status: ${d.accreditedStatus}`,
      d.investorType && `Investor type: ${d.investorType}`,
      d.experience && `VC experience: ${d.experience}`,
      d.interestLevel && `Interest: ${d.interestLevel}`,
      d.checkSize && `Target check size: ${d.checkSize}`,
      d.sectors && `Sectors: ${d.sectors}`,
      d.timeline && `Timeline: ${d.timeline}`,
      d.referral && `Referred by: ${d.referral}`,
      d.preferredContact && `Preferred contact: ${d.preferredContact}`,
      d.notes && `Notes: ${d.notes}`,
    ].filter(Boolean).join("\n");

    await supabase.from("interactions").insert({
      entity_type: "person",
      entity_id: person.id,
      type: "note",
      content: `LP / investor inquiry from ${d.firstName} ${d.lastName} (${d.email})\n\n${noteParts}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("invest route error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
