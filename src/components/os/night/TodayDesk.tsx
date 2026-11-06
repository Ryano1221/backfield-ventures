"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { postStatusLabel, type DeskDecision, type TodayModel, withLiveAnswers } from "@/lib/os/night";
import { snoozeUntil } from "@/lib/os/snooze";
import { osHrefs, waitingOnYou } from "@/lib/os/nav";
import type { AnsweredDecision, OsPost, OsScheduleItem, OsTodayNote } from "@/lib/os/types";
import type { CommandModel } from "@/lib/os/command";
import type { TrackWeek } from "@/lib/os/outreach-history";
import type { ContentWaiting } from "@/lib/os/studio";
import type { SpvToday } from "@/lib/os/spv";
import { OutreachWeek } from "./OutreachWeek";
import { usd } from "@/lib/os/raise-model";
import { asOfWord } from "@/lib/os/as-of";
import { Logo } from "./Logo";
import { useNightActions } from "./NightFrame";

export function TodayDesk({
  model,
  onOs,
  posts = [],
  schedule = [],
  warmups = [],
  briefs = [],
  answered = [],
  command = null,
  stale = false,
  outreachWeeks = [],
  content = [],
  spvs = [],
}: {
  model: TodayModel;
  onOs: boolean;
  posts?: OsPost[];
  schedule?: OsScheduleItem[];
  warmups?: OsTodayNote[];
  briefs?: OsTodayNote[];
  answered?: AnsweredDecision[];
  command?: CommandModel | null;
  stale?: boolean;
  outreachWeeks?: TrackWeek[];
  /** Content Studio drafts in review: waiting on Ryan's yes. */
  content?: ContentWaiting[];
  /** Open SPVs closing within two weeks. */
  spvs?: SpvToday[];
}) {
  const hrefs = osHrefs(onOs);
  const { enqueue, inflight, reportToday, actions, setAskContext } = useNightActions();
  const view = useMemo(() => withLiveAnswers(model, actions), [actions, model]);
  const items = useMemo(() => [...view.ready, ...view.hold, ...view.open], [view]);
  const [current, setCurrent] = useState(0);
  const selected = Math.min(current, Math.max(0, items.length - 1));
  const item = items[selected] ?? null;
  const asked = new Set(items.map((row) => (row.requestedBy || "").trim().toLowerCase()).filter(Boolean));
  const bots = model.waiting.filter((bot) => !asked.has(bot.name.trim().toLowerCase()));
  const waiting = waitingOnYou({ ...view, waiting: model.waiting }).total;
  const outreach = view.kpis.find((kpi) => kpi.label === "Outreach today") ?? null;
  // Counts come from the snapshot. When it is stale, say which day they are from.
  const asOf = asOfWord(stale, model.stamp);

  useEffect(() => {
    reportToday(waiting);
  }, [reportToday, waiting]);

  useEffect(() => {
    setAskContext({
      page: hrefs.today,
      about: item?.id ?? null,
      requestedBy: item?.requestedBy ?? null,
      botName: null,
    });
  }, [hrefs.today, item?.id, item?.requestedBy, setAskContext]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        setCurrent((index) => Math.min(items.length - 1, index + 1));
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        setCurrent((index) => Math.max(0, index - 1));
      } else if ((event.key === "e" || event.key === "Enter") && item && !inflight[item.id] && !item.outcome) {
        event.preventDefault();
        approve(item);
      }
    }
    function approve(decision: DeskDecision) {
      enqueue({
        type: "decide",
        target_id: decision.id,
        payload: { choice: decision.approveChoice },
        label: "Approved.",
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enqueue, inflight, item, items.length]);

  function approve(decision: DeskDecision) {
    enqueue({
      type: "decide",
      target_id: decision.id,
      payload: { choice: decision.approveChoice },
      label: "Approved.",
    });
  }

  // One tap for every reply that is drafted and ready. Holds and open
  // questions still need a look. Each goes into the same undo window.
  const readyNow = view.ready.filter((decision) => !inflight[decision.id]);
  function approveAllReady() {
    for (const decision of readyNow) approve(decision);
  }

  function dismiss(decision: DeskDecision) {
    if (decision.notNow.kind === "decide") {
      enqueue({
        type: "decide",
        target_id: decision.id,
        payload: { choice: decision.notNow.choice },
        label: `Not now for ${decision.name}.`,
      });
      return;
    }
    enqueue({
      type: "snooze",
      target_id: decision.id,
        payload: { until: snoozeUntil("tomorrow") },
      label: `Not now for ${decision.name}.`,
    });
  }

  return (
    <div className="inbox-page">
      <p className="greet">{view.weekday || "Today"}</p>
      {stale ? (
        <p className="stale-banner">
          <b>The office has not reported in a while.</b> Last update {model.stamp || "unknown"}. Counts below are from then; check the bots if this lasts.
        </p>
      ) : null}
      <h1 className="d-xl">{waiting ? `${waiting} waiting on you` : "You're clear"}</h1>
      <p className="lede">
        {waiting
          ? `${items.length.toLocaleString("en-US")} ${items.length === 1 ? "decision" : "decisions"}, ${bots.length.toLocaleString("en-US")} ${bots.length === 1 ? "bot" : "bots"}.`
          : "Nothing needs you right now."}
      </p>
      <p className="pointer-keys keys">J and K move. E approves. / searches.</p>
      {command ? <CommandStrip command={command} hrefs={hrefs} briefs={briefs.length} asOf={asOf} /> : null}
      {readyNow.length > 1 ? (
        <div className="approve-all">
          <p>
            {readyNow.length} replies are drafted and ready. Each one still gets the 10 second undo.
          </p>
          <button type="button" className="btn primary" onClick={approveAllReady}>
            Approve all {readyNow.length}
          </button>
        </div>
      ) : null}

      {items.length ? (
        <ol className="inbox">
          {items.map((decision, index) => (
            <InboxCard
              key={decision.id}
              item={decision}
              selected={index === selected}
              href={hrefs.decision(decision.id)}
              busy={Boolean(inflight[decision.id])}
              onApprove={() => approve(decision)}
              onDismiss={() => dismiss(decision)}
              onFocus={() => setCurrent(index)}
            />
          ))}
        </ol>
      ) : (
        <p className="empty-clear">Inbox clear.</p>
      )}

      <aside className="inbox-side">
      {command ? <CommandLists command={command} hrefs={hrefs} /> : null}
      {spvs.length ? (
        <section className="stack" aria-label="SPVs closing">
          <h2>SPVs closing</h2>
          <ul className="bot-list">
            {spvs.map((row) => (
              <li key={row.id}>
                <Link className="note-row" href={hrefs.spvItem(row.id)} prefetch>
                  <span className="bot-wait-name">{row.name}</span>
                  <span className={`bot-wait-when${row.urgent ? " is-due" : ""}`}>{row.when}</span>
                  <span className="bot-wait-sum">{row.next}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {content.length ? (
        <section className="stack" aria-label="Content to approve">
          <h2>Content to approve</h2>
          <ul className="bot-list">
            {content.map((row) => (
              <li key={row.id}>
                <Link className="note-row" href={hrefs.studioItem(row.id)} prefetch>
                  <span className="bot-wait-name">{row.title}</span>
                  <span className="bot-wait-when">In review</span>
                  <span className="bot-wait-sum">{row.channels} draft waiting on your yes.</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {bots.length ? (
        <section className="stack" aria-label="Bots waiting on you">
          <h2>Bots waiting</h2>
          <ul className="bot-list">
            {bots.map((bot) => (
              <li key={bot.slug}>
                <details className="bot-wait">
                  <summary>
                    <span className="bot-wait-name">{bot.name}</span>
                    {bot.when ? <span className="bot-wait-when">{bot.when}</span> : null}
                    <span className="bot-wait-sum">{bot.ask}</span>
                  </summary>
                  {bot.detail && bot.detail !== bot.ask ? <p className="bot-wait-detail">{bot.detail}</p> : null}
                  <Link className="bot-wait-go" href={`${hrefs.bots}#${bot.slug}`} prefetch>
                    Go to {bot.name}
                  </Link>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <OutreachWeek weeks={outreachWeeks} compact />

      <NoteList label="Pre-call briefs" rows={briefs} />
      <NoteList label="Warmups today" rows={warmups} />
      <WaitingToSend rows={answered} />

      <PostsAndSchedule posts={posts} schedule={schedule} />

      <section className="stack" aria-label="Firm status">
        <h2>Firm</h2>
        <Link className={`stack-row${outreach?.stale ? " is-stale" : ""}`} href={hrefs.email} prefetch>
          <b>Email</b>
          <span>
            {outreach
              ? `Outreach ${asOf} ${outreach.value}${outreach.small || ""}${outreach.sub ? ` · ${outreach.sub}` : ""}`
              : "No send counts in this snapshot."}
          </span>
        </Link>
        <Link className="stack-row" href={hrefs.deals} prefetch>
          <b>Deals</b>
          <span>{model.reviewingCount.toLocaleString("en-US")} in review</span>
        </Link>
      </section>
      </aside>

      {view.settled.length ? (
        <section className="stack" aria-label="Answered">
          <h2>Answered</h2>
          <ul className="settled">
            {view.settled.map((row) => (
              <li key={row.id}>
                <b>{row.label}</b>
                <span>{row.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function InboxCard({
  item,
  selected,
  href,
  busy,
  onApprove,
  onDismiss,
  onFocus,
}: {
  item: DeskDecision;
  selected: boolean;
  href: string;
  busy: boolean;
  onApprove: () => void;
  onDismiss: () => void;
  onFocus: () => void;
}) {
  const start = useRef<{ x: number; y: number; drag: boolean } | null>(null);
  const dxRef = useRef(0);
  const [dx, setDx] = useState(0);
  function move(next: number) {
    dxRef.current = next;
    setDx(next);
  }

  function onPointerDown(event: React.PointerEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY, drag: false };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* Synthetic events cannot capture the pointer. */
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const origin = start.current;
    if (!origin) return;
    const x = event.clientX - origin.x;
    const y = event.clientY - origin.y;
    if (!origin.drag) {
      if (Math.abs(y) > Math.abs(x) + 6) {
        start.current = null;
        return;
      }
      if (Math.abs(x) > 10) origin.drag = true;
    }
    if (origin.drag) move(Math.max(-140, Math.min(140, x)));
  }

  function onPointerUp() {
    const dragged = dxRef.current;
    if (dragged > 80) onApprove();
    else if (dragged < -80) onDismiss();
    move(0);
    start.current = null;
  }

  const line = previewCopy(item.message || item.summary || item.happened || "");
  const [open, setOpen] = useState(false);
  const kind = item.channel || (item.hold ? "Hold" : "Decision");

  return (
    <li className={`swipe${selected ? " is-sel" : ""}`} style={{ ["--dx" as string]: `${dx}px` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <span className="swipe-yes">Approve</span>
      <span className="swipe-no">Not now</span>
      <article className={`inbox-card${open ? " is-open" : ""}`} onClick={onFocus}>
        <div className="inbox-who">
          <Logo name={item.org || item.name} domain={item.domain} logoUrl={item.logoUrl} />
          <div>
            <h2>
              <Link href={href} prefetch>{item.name}</Link>
            </h2>
            {item.org ? <p>{item.org}</p> : null}
          </div>
          <span className="chip inbox-type">{kind}</span>
        </div>
        {line ? <p className="inbox-line">{line}</p> : null}
        <div className="inbox-actions">
          <button type="button" className={selected ? "btn primary" : "btn is-outline"} disabled={busy} onClick={onApprove}>
            Approve
          </button>
          <button type="button" className="btn quiet" disabled={busy} onClick={onDismiss}>
            Not now
          </button>
          {line ? (
            <button type="button" className="btn quiet" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
              {open ? "Show less" : "Read"}
            </button>
          ) : (
            <Link className="btn quiet" href={href} prefetch>Read</Link>
          )}
        </div>
      </article>
    </li>
  );
}

function CommandStrip({ command, hrefs, briefs, asOf }: { command: CommandModel; hrefs: ReturnType<typeof osHrefs>; briefs: number; asOf: string }) {
  const { raise, deals, bots, due } = command;
  const hard = raise.pctHard ?? 0;
  const soft = Math.max(0, (raise.pctSoft ?? 0) - hard);
  return (
    <section className="command" aria-label="Firm at a glance">
      <Link className="cmd cmd-raise" href={hrefs.raise} prefetch>
        <span className="cmd-k">{raise.fund}</span>
        <b className="cmd-v">
          {usd(raise.hard)}
          {raise.target ? <small> of {usd(raise.target)}</small> : null}
        </b>
        {raise.target ? (
          <span className="cmd-bar" aria-hidden="true">
            <i className="hard" style={{ width: `${hard}%` }} />
            <i className="soft" style={{ width: `${soft}%` }} />
          </span>
        ) : null}
        <span className="cmd-s">
          {raise.target
            ? [raise.soft ? `${usd(raise.soft)} soft` : null, raise.daysLeft != null ? `${raise.daysLeft} days to close` : null].filter(Boolean).join(" · ") || `${raise.lpCount} LPs in`
            : "Set your target"}
        </span>
      </Link>
      <Link className="cmd" href={due.length ? "#day" : hrefs.people} prefetch>
        <span className="cmd-k">Your day</span>
        <b className="cmd-v">
          {due.length + briefs}
          <small> {due.length + briefs === 1 ? "thing" : "things"}</small>
        </b>
        <span className="cmd-s">
          {[briefs ? `${briefs} ${briefs === 1 ? "call" : "calls"}` : null, due.length ? `${due.length} follow-${due.length === 1 ? "up" : "ups"} due` : null].filter(Boolean).join(" · ") || "No calls or follow-ups due"}
        </span>
      </Link>
      <Link className="cmd" href={hrefs.deals} prefetch>
        <span className="cmd-k">Deal flow</span>
        <b className="cmd-v">
          {deals.fresh}
          <small> new this week</small>
        </b>
        <span className="cmd-s">{[`${deals.reviewing} in review`, deals.unrated ? `${deals.unrated} to rate` : null, deals.advanced ? `${deals.advanced} advanced` : null].filter(Boolean).join(" · ")}</span>
      </Link>
      <Link className={`cmd${bots.stuck ? " is-alert" : ""}`} href={hrefs.bots} prefetch>
        <span className="cmd-k">The office</span>
        <b className="cmd-v">
          {bots.done}
          <small> done {asOf}</small>
        </b>
        <span className="cmd-s">{[`${bots.working} working`, bots.stuck ? `${bots.stuck} stuck` : null, bots.waiting ? `${bots.waiting} need you` : null].filter(Boolean).join(" · ")}</span>
      </Link>
    </section>
  );
}

function CommandLists({ command, hrefs }: { command: CommandModel; hrefs: ReturnType<typeof osHrefs> }) {
  const { bots, due } = command;
  // Someone already under follow-ups due is not listed again as an LP to chase.
  const chase = command.chase.filter((row) => !due.some((item) => item.id === row.id));
  return (
    <>
      {due.length || chase.length || bots.lines.length ? (
        <div className="cmd-lists">
          {due.length ? (
            <div id="day">
              <h2>Follow-ups due</h2>
              <ul className="bot-list">
                {due.map((row) => (
                  <li key={row.id}>
                    <Link className="note-row" href={hrefs.person(row.id)} prefetch>
                      <span className="bot-wait-name">{row.name}</span>
                      <span className={`bot-wait-when${row.overdue ? " is-due" : ""}`}>{row.when}</span>
                      <span className="bot-wait-sum">{row.what}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {chase.length ? (
            <div>
              <h2>LPs to chase</h2>
              <ul className="bot-list">
                {chase.slice(0, 4).map((row) => (
                  <li key={row.id}>
                    <Link className="note-row" href={hrefs.person(row.id)} prefetch>
                      <span className="bot-wait-name">{row.name}</span>
                      <span className={`bot-wait-when${row.overdue ? " is-due" : ""}`}>{row.why}</span>
                      {row.firm || row.stage ? <span className="bot-wait-sum">{[row.firm, row.stage].filter(Boolean).join(" · ")}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {bots.lines.length ? (
            <div>
              <h2>Overnight</h2>
              <ul className="bot-list">
                {bots.lines.map((line) => (
                  <li key={`${line.name}-${line.text}`}>
                    <div className="note-row">
                      <span className="bot-wait-name">{line.name}</span>
                      <span className={`bot-wait-when${line.tone === "stuck" ? " is-due" : ""}`}>{line.tone === "stuck" ? "Stuck" : "Done"}</span>
                      <span className="bot-wait-sum">{line.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function NoteList({ label, rows }: { label: string; rows: OsTodayNote[] }) {
  if (!rows.length) return null;
  return (
    <section className="stack" aria-label={label}>
      <h2>{label}</h2>
      <ul className="bot-list">
        {rows.map((row, index) => (
          <li key={`${row.name}-${index}`}>
            {row.note ? (
              <details className="bot-wait">
                <summary>
                  <span className="bot-wait-name">{row.name}</span>
                  {row.when_ct ? <span className="bot-wait-when">{row.when_ct}</span> : null}
                  <span className="bot-wait-sum">{row.note}</span>
                </summary>
              </details>
            ) : (
              <div className="note-row">
                <span className="bot-wait-name">{row.name}</span>
                {row.when_ct ? <span className="bot-wait-when">{row.when_ct}</span> : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function WaitingToSend({ rows }: { rows: AnsweredDecision[] }) {
  const waiting = rows.filter((row) => row.send_state === "approved_waiting");
  if (!waiting.length) return null;
  return (
    <section className="stack" aria-label="Waiting to send">
      <h2>Approved, waiting to send</h2>
      <ul className="bot-list">
        {waiting.map((row) => (
          <li key={row.id}>
            <div className="note-row">
              <span className="bot-wait-name">{row.name || "Approved reply"}</span>
              <span className="bot-wait-when">{row.send_at_ct ? `Sends ${row.send_at_ct}` : "Sends next run"}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function previewCopy(value: string): string {
  return value
    .replace(/^\s*(hey|hi|hello|dear)\b[^,\n]*,?\s*/i, "")
    .replace(/\s*\b(best|thanks|thank you|cheers|best regards|talk soon|warmly)\b,?(\s+[A-Z][a-z]+)?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function platformLabel(platform: string | null | undefined): string {
  const key = (platform || "").trim().toLowerCase();
  if (key === "x" || key === "twitter") return "X post";
  if (!key) return "Post";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function passedGate(status: string | null | undefined): boolean {
  return (status || "").trim().toLowerCase() === "brand_pass";
}

function scheduleWhen(date: string | null | undefined, time: string | null | undefined): string {
  let day = (date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const parsed = new Date(`${day}T12:00:00-06:00`);
    if (!Number.isNaN(parsed.getTime())) {
      day = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" }).format(parsed);
    }
  }
  let clock = (time || "").trim();
  if (clock && !/\bCT\b/i.test(clock)) clock = `${clock} CT`;
  return [day, clock].filter(Boolean).join(" · ");
}

const POST_CAP = 3;

function PostsAndSchedule({ posts, schedule }: { posts: OsPost[]; schedule: OsScheduleItem[] }) {
  // "See all" is a URL state (?all=1), so browser Back collapses the list.
  const params = useSearchParams();
  const pathname = usePathname() || "/os";
  const open = params?.get("all") === "1";
  const rows = [
    ...posts.map((post, index) => ({
      key: post.id || `post-${index}`,
      title: platformLabel(post.platform),
      meta: passedGate(post.status) ? "Ready to post" : [postStatusLabel(post.status), post.gate].filter(Boolean).join(" · ") || null,
      note: null as string | null,
    })),
    ...schedule.map((row, index) => ({
      key: `schedule-${index}`,
      title: row.item || row.platform || "Scheduled item",
      meta: [scheduleWhen(row.date, row.time_ct), postStatusLabel(row.status)].filter(Boolean).join(" · "),
      note: row.note || null,
    })),
  ];
  if (!rows.length) return null;
  const visible = open ? rows : rows.slice(0, POST_CAP);
  const hidden = rows.length - visible.length;
  return (
    <section className="stack" id="posts" aria-label="Posts and schedule">
      <h2>Posts and schedule</h2>
      {visible.map((row) => (
        <div className="stack-row" key={row.key}>
          <b>{row.title}</b>
          {row.meta ? <span>{row.meta}</span> : null}
          {row.note ? <ScheduleNote note={row.note} /> : null}
        </div>
      ))}
      {hidden > 0 ? (
        <Link className="btn quiet" href={`${pathname}?all=1#posts`} scroll={false}>
          See all {rows.length.toLocaleString("en-US")}
        </Link>
      ) : null}
    </section>
  );
}

function ScheduleNote({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="schedule-note">
      <span className={open ? "is-open" : ""}>{note}</span>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "Show less" : "Read note"}
      </button>
    </span>
  );
}
