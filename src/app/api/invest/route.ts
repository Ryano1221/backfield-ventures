import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { notifyInvest } from "@/lib/notify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const d = await req.json();

    // Parse sectors string into array for investment_focus tag pills
    const sectorsArray = d.sectors
      ? d.sectors.split(",").map((s: string) => s.trim()).filter(Boolean)
      : null;

    // 1. Create prospective investor record — each form field in its own column
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
        // Individual columns — filterable in CRM
        accredited_status: d.accreditedStatus || null,
        investor_type_detail: d.investorType || null,
        vc_experience: d.experience || null,
        interest_level: d.interestLevel || null,
        check_size_range: d.checkSize || null,
        investment_timeline: d.timeline || null,
        preferred_contact: d.preferredContact || null,
        referral: d.referral || null,
      })
      .select("id")
      .single();

    if (personErr) throw personErr;

    // 2. Activity log — full submission snapshot
    const snap = [
      `LP / investor inquiry — ${d.firstName} ${d.lastName} (${d.email})`,
      "",
      d.accreditedStatus   ? `Accredited investor status: ${d.accreditedStatus}` : null,
      d.investorType       ? `Investor type: ${d.investorType}` : null,
      d.experience         ? `VC / alternatives experience: ${d.experience}` : null,
      "",
      d.interestLevel      ? `Interest: ${d.interestLevel}` : null,
      d.checkSize          ? `Target check size: ${d.checkSize}` : null,
      d.timeline           ? `Investment timeline: ${d.timeline}` : null,
      "",
      d.referral           ? `Referred by: ${d.referral}` : null,
      d.preferredContact   ? `Preferred contact method: ${d.preferredContact}` : null,
      d.notes              ? `Additional notes: ${d.notes}` : null,
    ].filter((l) => l !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();

    await supabase.from("interactions").insert({
      entity_type: "person",
      entity_id: person.id,
      type: "note",
      content: snap,
    });

    await notifyInvest(d).catch((e) => console.error("invest email error", e));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("invest route error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
