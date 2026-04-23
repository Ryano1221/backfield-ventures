import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const d = await req.json();

    // Parse sector into array for investment_focus tag pills
    const sectorArray = d.sector?.trim() ? [d.sector.trim()] : null;

    // 1. Create operator / partner record — each form field in its own column
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
        // Individual columns — filterable in CRM
        op_background: d.background || null,
        stage_experience: d.stageExperience || null,
        functional_strengths: d.functionalStrengths || null,
        advisory_experience: d.advisoryExperience || null,
        primary_interest: d.primaryInterest || null,
        time_commitment: d.timeCommitment || null,
        compensation_pref: d.compensation || null,
        why_backfield: d.whyBackfield || null,
        referral: d.referral || null,
      })
      .select("id")
      .single();

    if (personErr) throw personErr;

    // 2. Activity log — full submission snapshot
    const snap = [
      `Partner inquiry — ${d.firstName} ${d.lastName} (${d.email})`,
      "",
      d.background          ? `Operator background: ${d.background}` : null,
      "",
      d.stageExperience     ? `Stage experience: ${d.stageExperience}` : null,
      d.functionalStrengths ? `Functional strengths: ${d.functionalStrengths}` : null,
      d.advisoryExperience  ? `Advisory experience: ${d.advisoryExperience}` : null,
      "",
      d.primaryInterest     ? `Primary interest: ${d.primaryInterest}` : null,
      d.timeCommitment      ? `Time commitment: ${d.timeCommitment}` : null,
      d.compensation        ? `Compensation preference: ${d.compensation}` : null,
      "",
      d.whyBackfield        ? `Why Backfield: ${d.whyBackfield}` : null,
      d.referral            ? `Referred by: ${d.referral}` : null,
      d.notes               ? `Additional notes: ${d.notes}` : null,
    ].filter((l) => l !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();

    await supabase.from("interactions").insert({
      entity_type: "person",
      entity_id: person.id,
      type: "note",
      content: snap,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("partner route error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
