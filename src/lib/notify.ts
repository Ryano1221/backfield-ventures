import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const TO = "ryan@backfieldventures.com";
const FROM = "Backfield Ventures <notifications@backfieldventures.com>";

function row(label: string, value: string | undefined | null) {
  if (!value?.trim()) return "";
  return `
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;vertical-align:top;width:160px">${label}</td>
      <td style="padding:6px 0 6px 16px;color:#111827;font-size:14px;vertical-align:top">${value.replace(/\n/g, "<br/>")}</td>
    </tr>`;
}

function section(title: string, rows: string) {
  if (!rows.trim()) return "";
  return `
    <div style="margin-bottom:28px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#9ca3af;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb">${title}</div>
      <table style="border-collapse:collapse;width:100%"><tbody>${rows}</tbody></table>
    </div>`;
}

function wrap(subject: string, badge: string, badgeColor: string, body: string) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;max-width:600px;width:100%">
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #e5e7eb">
            <div style="display:flex;align-items:center;gap:12px">
              <span style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;background:${badgeColor};color:#fff;padding:4px 10px">${badge}</span>
              <span style="font-size:18px;font-weight:700;color:#111827;letter-spacing:-0.02em">${subject}</span>
            </div>
          </td>
        </tr>
        <tr><td style="padding:28px 32px">${body}</td></tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e5e7eb;background:#f9fafb">
            <span style="font-size:11px;color:#9ca3af">Backfield Ventures &middot; backfieldventures.com</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function notifyPitch(d: Record<string, string>) {
  if (!resend) return;
  const subject = `${d.company}${d.stage ? ` — ${d.stage}` : ""}`;
  const body =
    section("Company", row("Name", d.company) + row("Website", d.website) + row("Stage", d.stage) + row("Sector", d.sector) + row("One-liner", d.oneLiner) + row("Location", d.location)) +
    section("Founder", row("Name", d.founderName) + row("Email", d.founderEmail) + row("Role", d.founderRole) + row("LinkedIn", d.linkedin) + row("Background", d.background) + row("Team size", d.teamSize)) +
    section("Opportunity", row("Problem", d.problem) + row("Solution", d.solution) + row("Traction", d.traction) + row("Raising", d.raiseAmount) + row("Raised to date", d.raisedToDate) + row("Deck", d.deckLink)) +
    section("Meta", row("Source", d.source) + row("Notes", d.notes));
  await resend.emails.send({
    from: FROM, to: TO, replyTo: d.founderEmail || undefined,
    subject: `New Pitch — ${subject}`,
    html: wrap(subject, "New Pitch", "#111827", body),
  });
}

export async function notifyInvest(d: Record<string, string>) {
  if (!resend) return;
  const name = `${d.firstName} ${d.lastName}`.trim();
  const body =
    section("Contact", row("Name", name) + row("Email", d.email) + row("Phone", d.phone) + row("Location", d.location) + row("Organization", d.organization) + row("Role", d.role)) +
    section("Investor Profile", row("Accredited status", d.accreditedStatus) + row("Investor type", d.investorType) + row("VC / alternatives experience", d.experience)) +
    section("Interest", row("Interest level", d.interestLevel) + row("Target check size", d.checkSize) + row("Sectors", d.sectors) + row("Timeline", d.timeline)) +
    section("Meta", row("Source", d.source) + row("Referred by", d.referral) + row("Preferred contact", d.preferredContact) + row("Notes", d.notes));
  await resend.emails.send({
    from: FROM, to: TO, replyTo: d.email || undefined,
    subject: `New LP Inquiry — ${name}`,
    html: wrap(name, "LP Inquiry", "#1d4ed8", body),
  });
}

export async function notifyPartner(d: Record<string, string>) {
  if (!resend) return;
  const name = `${d.firstName} ${d.lastName}`.trim();
  const body =
    section("Contact", row("Name", name) + row("Email", d.email) + row("LinkedIn", d.linkedin) + row("Title", d.title) + row("Company", d.company) + row("Sector expertise", d.sector)) +
    section("Experience", row("Background", d.background) + row("Stage experience", d.stageExperience) + row("Functional strengths", d.functionalStrengths) + row("Advisory experience", d.advisoryExperience)) +
    section("Engagement", row("Primary interest", d.primaryInterest) + row("Time commitment", d.timeCommitment) + row("Compensation", d.compensation)) +
    section("Meta", row("Why Backfield", d.whyBackfield) + row("Source", d.source) + row("Referred by", d.referral) + row("Notes", d.notes));
  await resend.emails.send({
    from: FROM, to: TO, replyTo: d.email || undefined,
    subject: `New Partner Inquiry — ${name}`,
    html: wrap(name, "Partner", "#7c3aed", body),
  });
}
