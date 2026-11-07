"use client";

import { Fragment, useState, type ReactNode } from "react";
import { emailParagraphs, mergeLabel, parseSender } from "@/lib/os/email-preview";
import { BEST3_FROM } from "@/lib/email/templates";
import { sanitizePreviewHtml } from "@/lib/os/preview-html";
import type { DecisionCompany, DecisionDetail as Detail, DecisionSwap } from "@/lib/os/types";

export function DecisionDetailView({
  detail,
  pending,
  onSwap,
}: {
  detail: Detail;
  pending: boolean;
  onSwap: (swaps: DecisionSwap[], note: string) => void;
}) {
  const picks = detail.picks ?? [];
  const candidates = detail.candidates ?? [];
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [replace, setReplace] = useState(picks.length === 1 ? picks[0]?.slug || "" : "");
  const [swapNote, setSwapNote] = useState("");
  const candidate = candidates.find((company) => company.slug === swapFor) || null;

  return (
    <>
      {picks.length ? (
        <div className="block pack">
          <div className="lbl">In the pack</div>
          {picks.map((company) => (
            <Company key={company.slug} company={company} />
          ))}
        </div>
      ) : null}
      {candidates.length ? (
        <div className="block pack">
          <div className="lbl">Browse other companies</div>
          {candidates.map((company) => (
            <Company
              key={company.slug}
              company={company}
              action={
                <button type="button" className="btn" disabled={pending} onClick={() => setSwapFor(company.slug)}>
                  Suggest swap
                </button>
              }
            />
          ))}
          {candidate ? (
            <form
              className="swapbox"
              onSubmit={(event) => {
                event.preventDefault();
                if (!replace) return;
                onSwap([{ out: replace, in: candidate.slug }], swapNote.trim());
              }}
            >
              <div className="lbl">Replace a pick with {candidate.name}</div>
              <div className="swap-picks">
                {picks.map((pick) => (
                  <label key={pick.slug}>
                    <input
                      type="radio"
                      name={`swap-${candidate.slug}`}
                      value={pick.slug}
                      checked={replace === pick.slug}
                      onChange={() => setReplace(pick.slug)}
                    />
                    <span>{pick.name}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={swapNote}
                maxLength={2000}
                aria-label="Note for the swap"
                placeholder="Optional note. Nothing sends."
                onChange={(event) => setSwapNote(event.target.value)}
              />
              <button type="submit" className="btn" disabled={pending || !replace}>
                Suggest this swap
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
      {detail.preview ? <Preview preview={detail.preview} /> : null}
    </>
  );
}

function Company({ company, action }: { company: DecisionCompany; action?: ReactNode }) {
  const rows = [
    company.one_liner ? ["One-liner", company.one_liner] : null,
    company.category ? ["Category", company.category] : null,
    company.stage ? ["Stage", company.stage] : null,
    company.location ? ["Location", company.location] : null,
    company.score ? ["Score", company.score] : null,
    company.why ? ["Why", company.why] : null,
    company.concerns ? ["Concerns", company.concerns] : null,
    company.source ? ["Source", company.source] : null,
  ].filter((row): row is [string, string] => Boolean(row));
  return (
    <details className="co">
      <summary>
        <span className="nm">{company.name}</span>
        {company.one_liner ? <span className="ln">{company.one_liner}</span> : null}
        {action ? (
          <span className="co-action" onClick={(event) => event.stopPropagation()}>
            {action}
          </span>
        ) : null}
      </summary>
      <div className="body">
        {rows.length ? (
          <dl>
            {rows.map(([label, value]) => (
              <span className="pair" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </span>
            ))}
          </dl>
        ) : null}
        {company.website ? (
          <a className="lnk" href={company.website} target="_blank" rel="noopener noreferrer">
            {company.website.replace(/^https:\/\//, "")}
          </a>
        ) : null}
        {company.facts?.length ? (
          <ul className="facts">
            {company.facts.map((fact) => (
              <li key={`${fact.label}-${fact.value}`}>
                <b>{fact.label}.</b> {fact.value}
                {fact.source_note ? <span className="lbl"> {fact.source_note}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}

// Sends go out from Ryan's Gmail.
const SENDER = parseSender(BEST3_FROM);

function Preview({ preview }: { preview: NonNullable<Detail["preview"]> }) {
  const html = preview.html ? sanitizePreviewHtml(preview.html) : "";
  return (
    <div className="block pack">
      <div className="lbl">Preview what we&apos;d send</div>
      <p className="preview-flag">Preview. Nothing has been sent, and nothing sends from this view.</p>
      <article className="preview-body mail" aria-label="Email preview">
        {preview.subject ? (
          <h2 className="mail-subject">
            {preview.subject} <span className="mail-inbox">Inbox</span>
          </h2>
        ) : null}
        <div className="mail-from">
          <span className="mail-avatar" aria-hidden="true">
            {SENDER.initial}
          </span>
          <div>
            <p className="mail-sender">
              <b>{SENDER.name}</b> <span className="mail-addr">&lt;{SENDER.email}&gt;</span>
            </p>
            {preview.to_label ? <p className="mail-to">to {preview.to_label}</p> : null}
          </div>
        </div>
        {html ? (
          <div className="preview-html mail-text" dangerouslySetInnerHTML={{ __html: html }} />
        ) : preview.text ? (
          <div className="preview-text mail-text">
            {emailParagraphs(preview.text).map((paragraph, p) => (
              <p key={p}>
                {paragraph.map((line, l) => (
                  <Fragment key={l}>
                    {l ? <br /> : null}
                    {line.map((part, i) =>
                      part.kind === "merge" ? (
                        <span key={i} className="mail-merge" title={`Filled in per person${part.fallback ? `, or "${part.fallback}"` : ""}`}>
                          {mergeLabel(part.field)}
                        </span>
                      ) : part.kind === "link" ? (
                        // Shown the way Gmail shows a link. Not clickable: this is a preview.
                        <span key={i} className="mail-link" title={part.href}>
                          {part.value}
                        </span>
                      ) : (
                        <Fragment key={i}>{part.value}</Fragment>
                      ),
                    )}
                  </Fragment>
                ))}
              </p>
            ))}
          </div>
        ) : null}
        {preview.attachment_label ? (
          <div className="mail-attach">
            <span className="mail-file" aria-hidden="true">
              {/\.pdf$/i.test(preview.attachment_label) ? "PDF" : "FILE"}
            </span>
            <span className="mail-file-name">
              <span className="lbl">Attachment</span> {preview.attachment_label}
            </span>
          </div>
        ) : null}
      </article>
    </div>
  );
}
