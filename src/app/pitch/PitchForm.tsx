"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const TOTAL = 5;
const STEP_LABELS = ["Company", "Team", "Opp", "Metrics", "Deep Dive", "Submit"];

type Fields = {
  company: string;
  website: string;
  stage: string;
  sector: string;
  oneLiner: string;
  location: string;
  founderName: string;
  founderRole: string;
  founderEmail: string;
  linkedin: string;
  teamSize: string;
  background: string;
  problem: string;
  solution: string;
  // CPG / Consumer metrics
  revenueTtm: string;
  grossMargin: string;
  velocity: string;
  retailDoors: string;
  avgMomGrowth: string;
  dtcRevenuePct: string;
  repeatPurchaseRate: string;
  dtcCac: string;
  cacPayback: string;
  cashRunway: string;
  deckLink: string;
  source: string;
  notes: string;
  agree: boolean;
};

const EMPTY: Fields = {
  company: "", website: "", stage: "", sector: "", oneLiner: "", location: "",
  founderName: "", founderRole: "", founderEmail: "", linkedin: "", teamSize: "", background: "",
  problem: "", solution: "",
  revenueTtm: "", grossMargin: "", velocity: "", retailDoors: "",
  avgMomGrowth: "", dtcRevenuePct: "", repeatPurchaseRate: "", dtcCac: "",
  cacPayback: "", cashRunway: "",
  deckLink: "", source: "", notes: "", agree: false,
};

export default function PitchForm() {
  const [step, setStep] = useState(1);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set(k: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
      setFields((f) => ({ ...f, [k]: val }));
      setErrors((err) => ({ ...err, [k]: undefined }));
    };
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof Fields, string>> = {};
    if (step === 1) {
      if (!fields.company.trim()) errs.company = "Required";
      if (!fields.stage) errs.stage = "Required";
      if (!fields.oneLiner.trim()) errs.oneLiner = "Required";
    }
    if (step === 2) {
      if (!fields.founderName.trim()) errs.founderName = "Required";
      if (!fields.founderRole.trim()) errs.founderRole = "Required";
      if (!fields.founderEmail.trim() || !fields.founderEmail.includes("@"))
        errs.founderEmail = fields.founderEmail ? "Valid email required" : "Required";
    }
    if (step === 3) {
      if (!fields.problem.trim()) errs.problem = "Required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function next() {
    if (!validate()) return;
    if (step === TOTAL) {
      setSubmitting(true);
      try {
        await fetch("/api/pitch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: fields.company,
            website: fields.website,
            stage: fields.stage,
            sector: fields.sector,
            oneLiner: fields.oneLiner,
            location: fields.location,
            founderName: fields.founderName,
            founderRole: fields.founderRole,
            founderEmail: fields.founderEmail,
            linkedin: fields.linkedin,
            teamSize: fields.teamSize,
            background: fields.background,
            problem: fields.problem,
            solution: fields.solution,
            traction: [
              fields.revenueTtm     && `Revenue (TTM): ${fields.revenueTtm}`,
              fields.grossMargin    && `Gross Margin: ${fields.grossMargin}`,
              fields.velocity       && `Velocity: ${fields.velocity}`,
              fields.retailDoors    && `Retail Doors: ${fields.retailDoors}`,
              fields.avgMomGrowth   && `Avg MoM Growth: ${fields.avgMomGrowth}`,
              fields.dtcRevenuePct  && `DTC Revenue %: ${fields.dtcRevenuePct}`,
              fields.repeatPurchaseRate && `Repeat Purchase Rate: ${fields.repeatPurchaseRate}`,
              fields.dtcCac         && `DTC CAC: ${fields.dtcCac}`,
              fields.cacPayback     && `CAC Payback: ${fields.cacPayback}`,
              fields.cashRunway     && `Cash Runway: ${fields.cashRunway}`,
            ].filter(Boolean).join("\n") || null,
            deckLink: fields.deckLink,
            source: fields.source,
            notes: fields.notes,
          }),
        });
      } finally {
        setSubmitting(false);
        setConfirmed(true);
      }
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  const pct = confirmed ? 100 : (step / TOTAL) * 100;

  return (
    <div className="pitch-layout">
      {/* ── Left hero ── */}
      <div className="pitch-hero">
        <Link href="/" className="pitch-hero__logo" aria-label="Back to home">
          <Image
            src="/logo-text.png"
            alt="Backfield Ventures"
            width={1462}
            height={317}
            style={{ height: 28, width: "auto", filter: "invert(1)", opacity: 0.5 }}
            priority
          />
        </Link>
        <div className="pitch-hero__headline">
          BEHIND THE<br />NEXT<br />GENERATION<br />OF CONSUMER
        </div>
        <p className="pitch-hero__sub">
          Austin, TX · Pre-Seed to Series A
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="pitch-panel">
        {/* Header */}
        <div className="bfv-drawer-header">
          <div>
            <div className="bfv-drawer-label">Backfield Ventures</div>
            <div className="bfv-drawer-title">Pitch Us</div>
          </div>
          <Link href="/" className="bfv-close" aria-label="Back to home">✕</Link>
        </div>

        {/* Progress */}
        <div className="bfv-progress">
          <div className="bfv-progress-track">
            <div className="bfv-progress-fill pitch" style={{ width: `${pct}%` }} />
          </div>
          <div className="bfv-progress-labels">
            {STEP_LABELS.map((lbl, i) => {
              const stepNum = i + 1;
              const isConfirmLabel = i === STEP_LABELS.length - 1;
              let cls = "bfv-step-lbl";
              if (confirmed && isConfirmLabel) cls += " active";
              else if (!confirmed && stepNum === step) cls += " active";
              else if (stepNum < step || confirmed) cls += " done";
              return <span key={lbl} className={cls}>{lbl}</span>;
            })}
          </div>
        </div>

        {/* Body */}
        <div className="bfv-body" id="pitch-body">
          {confirmed ? (
            <div className="bfv-confirm" style={{ display: "flex" }}>
              <div className="bfv-confirm-icon">✓</div>
              <div className="bfv-confirm-title">Pitch Received</div>
              <p className="bfv-confirm-body">
                Thank you for reaching out. We review every submission and will be in touch if
                there&apos;s a fit — typically within 2–3 weeks.
              </p>
              <div className="bfv-confirm-detail">
                Backfield Ventures · {fields.founderEmail}
              </div>
              <Link href="/" className="bfv-btn-sm" style={{ marginTop: 8 }}>
                Back to Home ✕
              </Link>
            </div>
          ) : (
            <>
              {/* Step 1 — Company */}
              {step === 1 && (
                <div className="bfv-step active">
                  <div>
                    <div className="bfv-step-title">Your Company</div>
                    <div className="bfv-step-desc">Tell us the basics about what you&apos;re building.</div>
                  </div>
                  <hr className="bfv-divider" />
                  <div className={`bfv-field${errors.company ? " bfv-err" : ""}`}>
                    <label>Company Name *</label>
                    <input type="text" placeholder="Acme Inc." value={fields.company} onChange={set("company")} />
                    <span className="bfv-field-error">Required</span>
                  </div>
                  <div className="bfv-field">
                    <label>Website</label>
                    <input type="text" placeholder="https://acme.com" value={fields.website} onChange={set("website")} />
                  </div>
                  <div className="bfv-field-row">
                    <div className={`bfv-field${errors.stage ? " bfv-err" : ""}`}>
                      <label>Stage *</label>
                      <select value={fields.stage} onChange={set("stage")}>
                        <option value="">Select stage</option>
                        <option>Pre-Seed</option>
                        <option>Seed</option>
                        <option>Series A</option>
                        <option>Series B</option>
                        <option>Other</option>
                      </select>
                      <span className="bfv-field-error">Required</span>
                    </div>
                    <div className="bfv-field">
                      <label>Sector</label>
                      <select value={fields.sector} onChange={set("sector")}>
                        <option value="">Select sector</option>
                        <option>B2B SaaS</option>
                        <option>Consumer</option>
                        <option>Fintech</option>
                        <option>Health &amp; Bio</option>
                        <option>Deep Tech</option>
                        <option>Climate</option>
                        <option>Marketplace</option>
                        <option>Sports</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div className={`bfv-field${errors.oneLiner ? " bfv-err" : ""}`}>
                    <label>One-Liner *</label>
                    <input type="text" placeholder="We are the X for Y" value={fields.oneLiner} onChange={set("oneLiner")} />
                    <div className="bfv-field-hint">Describe your company in one sentence.</div>
                    <span className="bfv-field-error">Required</span>
                  </div>
                  <div className="bfv-field">
                    <label>Location</label>
                    <input type="text" placeholder="San Francisco, CA" value={fields.location} onChange={set("location")} />
                  </div>
                </div>
              )}

              {/* Step 2 — Team */}
              {step === 2 && (
                <div className="bfv-step active">
                  <div>
                    <div className="bfv-step-title">The Team</div>
                    <div className="bfv-step-desc">We invest in people first. Tell us about the founders.</div>
                  </div>
                  <hr className="bfv-divider" />
                  <div className={`bfv-field${errors.founderName ? " bfv-err" : ""}`}>
                    <label>Your Name *</label>
                    <input type="text" placeholder="Jane Smith" value={fields.founderName} onChange={set("founderName")} />
                    <span className="bfv-field-error">Required</span>
                  </div>
                  <div className="bfv-field-row">
                    <div className={`bfv-field${errors.founderRole ? " bfv-err" : ""}`}>
                      <label>Your Role *</label>
                      <input type="text" placeholder="CEO / Co-founder" value={fields.founderRole} onChange={set("founderRole")} />
                      <span className="bfv-field-error">Required</span>
                    </div>
                    <div className={`bfv-field${errors.founderEmail ? " bfv-err" : ""}`}>
                      <label>Email *</label>
                      <input type="email" placeholder="jane@acme.com" value={fields.founderEmail} onChange={set("founderEmail")} />
                      <span className="bfv-field-error">{errors.founderEmail || "Required"}</span>
                    </div>
                  </div>
                  <div className="bfv-field">
                    <label>LinkedIn</label>
                    <input type="text" placeholder="linkedin.com/in/janesmith" value={fields.linkedin} onChange={set("linkedin")} />
                  </div>
                  <div className="bfv-field">
                    <label>Team Size</label>
                    <select value={fields.teamSize} onChange={set("teamSize")}>
                      <option value="">Select size</option>
                      <option>Solo founder</option>
                      <option>2 founders</option>
                      <option>3–5</option>
                      <option>6–10</option>
                      <option>10+</option>
                    </select>
                  </div>
                  <div className="bfv-field">
                    <label>Relevant Background</label>
                    <textarea
                      placeholder="Prior experience, domain expertise, or notable credentials…"
                      value={fields.background}
                      onChange={set("background")}
                    />
                  </div>
                </div>
              )}

              {/* Step 3 — Opportunity */}
              {step === 3 && (
                <div className="bfv-step active">
                  <div>
                    <div className="bfv-step-title">The Opportunity</div>
                    <div className="bfv-step-desc">Help us understand the problem you&apos;re solving.</div>
                  </div>
                  <hr className="bfv-divider" />
                  <div className={`bfv-field${errors.problem ? " bfv-err" : ""}`}>
                    <label>The Problem *</label>
                    <textarea
                      placeholder="What problem are you solving? Who feels it and how acutely?"
                      value={fields.problem}
                      onChange={set("problem")}
                    />
                    <span className="bfv-field-error">Required</span>
                  </div>
                  <div className="bfv-field">
                    <label>Your Solution</label>
                    <textarea
                      placeholder="How does your product solve this?"
                      value={fields.solution}
                      onChange={set("solution")}
                    />
                  </div>
                </div>
              )}

              {/* Step 4 — Metrics */}
              {step === 4 && (
                <div className="bfv-step active">
                  <div>
                    <div className="bfv-step-title">CPG / Consumer Metrics</div>
                    <div className="bfv-step-desc">Share what you have — nothing here is required.</div>
                  </div>
                  <hr className="bfv-divider" />
                  <div className="bfv-field-row">
                    <div className="bfv-field">
                      <label>Revenue (TTM)</label>
                      <input type="text" placeholder="e.g. $1.8M" value={fields.revenueTtm} onChange={set("revenueTtm")} />
                      <div className="bfv-field-hint">Trailing 12 months, net of returns</div>
                    </div>
                    <div className="bfv-field">
                      <label>Gross Margin</label>
                      <input type="text" placeholder="e.g. 52%" value={fields.grossMargin} onChange={set("grossMargin")} />
                      <div className="bfv-field-hint">After COGS, freight, co-man, packaging</div>
                    </div>
                  </div>
                  <div className="bfv-field-row">
                    <div className="bfv-field">
                      <label>Velocity</label>
                      <input type="text" placeholder="e.g. $8.20/store/wk" value={fields.velocity} onChange={set("velocity")} />
                      <div className="bfv-field-hint">Avg across all active doors</div>
                    </div>
                    <div className="bfv-field">
                      <label>Retail Doors</label>
                      <input type="text" placeholder="e.g. 420" value={fields.retailDoors} onChange={set("retailDoors")} />
                    </div>
                  </div>
                  <div className="bfv-field-row">
                    <div className="bfv-field">
                      <label>Avg MoM Growth</label>
                      <input type="text" placeholder="e.g. 13%" value={fields.avgMomGrowth} onChange={set("avgMomGrowth")} />
                      <div className="bfv-field-hint">Average over last 6 months</div>
                    </div>
                    <div className="bfv-field">
                      <label>DTC Revenue %</label>
                      <input type="text" placeholder="e.g. 38%" value={fields.dtcRevenuePct} onChange={set("dtcRevenuePct")} />
                    </div>
                  </div>
                  <div className="bfv-field-row">
                    <div className="bfv-field">
                      <label>Repeat Purchase Rate</label>
                      <input type="text" placeholder="e.g. 46%" value={fields.repeatPurchaseRate} onChange={set("repeatPurchaseRate")} />
                      <div className="bfv-field-hint">Reorder within 90 days (DTC)</div>
                    </div>
                    <div className="bfv-field">
                      <label>DTC CAC</label>
                      <input type="text" placeholder="e.g. $26" value={fields.dtcCac} onChange={set("dtcCac")} />
                    </div>
                  </div>
                  <div className="bfv-field-row">
                    <div className="bfv-field">
                      <label>CAC Payback</label>
                      <input type="text" placeholder="e.g. 3.5 months" value={fields.cacPayback} onChange={set("cacPayback")} />
                    </div>
                    <div className="bfv-field">
                      <label>Cash Runway</label>
                      <input type="text" placeholder="e.g. 14 months" value={fields.cashRunway} onChange={set("cashRunway")} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5 — Deep Dive */}
              {step === 5 && (
                <div className="bfv-step active">
                  <div>
                    <div className="bfv-step-title">Final Details</div>
                    <div className="bfv-step-desc">Drop your deck and any final context.</div>
                  </div>
                  <hr className="bfv-divider" />
                  <div className="bfv-field">
                    <label>Pitch Deck Link</label>
                    <input
                      type="text"
                      placeholder="https://docsend.com/…"
                      value={fields.deckLink}
                      onChange={set("deckLink")}
                    />
                    <div className="bfv-field-hint">DocSend, Google Drive, Notion — any shareable link.</div>
                  </div>
                  <div className="bfv-field">
                    <label>How did you hear about us?</label>
                    <select value={fields.source} onChange={set("source")}>
                      <option value="">Select one</option>
                      <option>Referral / Intro</option>
                      <option>Portfolio</option>
                      <option>Social media</option>
                      <option>Event / Conference</option>
                      <option>Cold outreach</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="bfv-field">
                    <label>Anything else?</label>
                    <textarea
                      placeholder="Any context that doesn't fit above…"
                      style={{ minHeight: 80 }}
                      value={fields.notes}
                      onChange={set("notes")}
                    />
                  </div>
                  <div className="bfv-field">
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={fields.agree}
                        onChange={set("agree")}
                        style={{ width: "auto", flexShrink: 0, marginTop: 2 }}
                      />
                      <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "rgba(240,237,232,0.5)", lineHeight: 1.5 }}>
                        I understand that submission does not guarantee a response, and that Backfield Ventures may share this information internally for evaluation.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!confirmed && (
          <div className="bfv-footer">
            <div className="bfv-counter">
              {String(step).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
            </div>
            <div className="bfv-footer-btns">
              {step > 1 && (
                <button className="bfv-btn-sm" onClick={back}>
                  ← Back
                </button>
              )}
              <button className="bfv-btn-sm filled" onClick={next} disabled={submitting}>
                {submitting ? "Submitting…" : step === TOTAL ? "Submit →" : "Next →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
