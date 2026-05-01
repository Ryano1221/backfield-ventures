import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { notifyPitch } from "@/lib/notify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stageMap: Record<string, string> = {
  "Pre-Seed": "pre-seed",
  "Seed": "seed",
  "Series A": "series-a",
  "Series B": "series-b",
};

export async function POST(req: NextRequest) {
  try {
    const d = await req.json();

    // 1. Create company record — each form field in its own column
    const hasCpgMetrics = !!(d.cpgRevenue || d.cpgGrossMargin || d.cpgVelocity);
    const hasSportsMetrics = !!(d.spArr || d.spGrossMargin);

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
        problem: d.problem || null,
        solution: d.solution || null,
        traction: d.traction || null,
        raise_amount: d.raiseAmount || null,
        raised_to_date: d.raisedToDate || null,
        deck_link: d.deckLink || null,
        metadata: {
          diligence: {
            cpg_metrics: hasCpgMetrics ? {
              revenue_ttm: d.cpgRevenue || null,
              gross_margin: d.cpgGrossMargin || null,
              velocity: d.cpgVelocity || null,
              doors: d.cpgDoors || null,
              mom_growth: d.cpgMomGrowth || null,
              dtc_pct: d.cpgDtcPct || null,
              repeat_rate: d.cpgRepeatRate || null,
              cac: d.cpgCac || null,
              payback: d.cpgPayback || null,
              runway: d.cpgRunway || null,
            } : null,
            sports_metrics: hasSportsMetrics ? {
              arr: d.spArr || null,
              gross_margin: d.spGrossMargin || null,
              yoy_growth: d.spYoyGrowth || null,
              nrr: d.spNrr || null,
              active_users: d.spActiveUsers || null,
              paying: d.spPaying || null,
              churn: d.spChurn || null,
              cac: d.spCac || null,
              ltv_cac: d.spLtvCac || null,
              runway: d.spRunway || null,
            } : null,
            why_now: d.whyNow || null,
            moat: d.moat || null,
            top_customers: d.topCustomers || null,
            risks: d.risks || null,
            use_of_proceeds: d.useOfProceeds || null,
            scores: null,
            verdict: null,
            summary: null,
          },
        },
      })
      .select("id")
      .single();

    if (companyErr) throw companyErr;

    // 2. Create founder record — each form field in its own column
    const { data: person, error: personErr } = await supabase
      .from("people")
      .insert({
        full_name: d.founderName,
        email: d.founderEmail || null,
        title: d.founderRole || null,
        linkedin_url: d.linkedin || null,
        type: "founder",
        source: d.source || null,
        // Individual founder columns — filterable in CRM
        founder_background: d.background || null,
        team_size: d.teamSize || null,
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
    const snap = [
      `Inbound pitch — ${d.founderName} (${d.founderEmail})`,
      "",
      d.oneLiner      ? `One-liner: ${d.oneLiner}` : null,
      "",
      d.problem       ? `Problem: ${d.problem}` : null,
      d.solution      ? `Solution: ${d.solution}` : null,
      d.traction      ? `Traction: ${d.traction}` : null,
      "",
      d.raiseAmount   ? `Raising: ${d.raiseAmount}` : null,
      d.raisedToDate  ? `Raised to date: ${d.raisedToDate}` : null,
      d.deckLink      ? `Deck: ${d.deckLink}` : null,
      "",
      d.background    ? `Background: ${d.background}` : null,
      d.teamSize      ? `Team size: ${d.teamSize}` : null,
      d.source        ? `Source: ${d.source}` : null,
      d.notes         ? `Additional notes: ${d.notes}` : null,
      "",
      (d.cpgRevenue || d.spArr) ? "— Metrics —" : null,
      d.cpgRevenue    ? `Revenue (TTM): ${d.cpgRevenue}` : null,
      d.cpgGrossMargin ? `Gross Margin: ${d.cpgGrossMargin}` : null,
      d.cpgVelocity   ? `Velocity: ${d.cpgVelocity}` : null,
      d.spArr         ? `ARR: ${d.spArr}` : null,
      d.spGrossMargin ? `Gross Margin: ${d.spGrossMargin}` : null,
      d.spNrr         ? `NRR: ${d.spNrr}` : null,
      "",
      (d.whyNow || d.moat || d.risks) ? "— Deep Dive —" : null,
      d.whyNow        ? `Why Now / Why Us: ${d.whyNow}` : null,
      d.moat          ? `Moat: ${d.moat}` : null,
      d.risks         ? `Key Risks: ${d.risks}` : null,
      d.useOfProceeds ? `Use of Proceeds: ${d.useOfProceeds}` : null,
    ].filter((l) => l !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();

    await supabase.from("interactions").insert({
      entity_type: "company",
      entity_id: company.id,
      type: "note",
      content: snap,
    });

    await notifyPitch(d).catch((e) => console.error("pitch email error", e));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("pitch route error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
