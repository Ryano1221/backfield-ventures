# Backfield OS ingest

The operating dashboard at `os.backfieldventures.com` reads one JSON snapshot. An internal box posts that snapshot. The site stores the latest copy in a private Vercel Blob and renders it after Ryan signs in.

The post replaces the previous snapshot. Send the whole picture every time.

## Endpoint

```text
POST https://os.backfieldventures.com/api/ingest
Authorization: Bearer $OS_INGEST_TOKEN
Content-Type: application/json
```

`POST /api/os/ingest` is the same route. Preview deployments do not use the `os` host, so call `/api/os/ingest` on those URLs.

The route checks the bearer token. It does not use the dashboard password. A wrong or missing token returns 401. No snapshot is returned.

## Environment variables

Set these in the Vercel project. Do not commit them.

| Name | Required | Purpose |
| --- | --- | --- |
| `OS_DASHBOARD_PASSWORD` | Yes | Password Ryan types on the sign-in screen. No default. |
| `OS_INGEST_TOKEN` | Yes | Bearer token for this endpoint. Use a long random string. |
| `OS_SESSION_SECRET` | Recommended | Signs the session cookie. 32+ bytes from `openssl rand -base64 32`. If unset, the cookie is signed with a key derived from the password. |
| `BLOB_STORE_ID` | Yes on Vercel | Set when you connect a private Blob store. The dashboard reads and writes `os-dashboard/latest.json` with private access. |

Create the store from the repo (this adds `BLOB_STORE_ID` to the linked project):

```bash
vercel blob create-store os-dashboard --access private
```

Use a private store. The dashboard never writes a public blob.

`OS_DASHBOARD_FIXTURES=1` loads `src/fixtures/os-dashboard.sample.json` only when no snapshot is stored and `VERCEL_ENV` is not `production`. Leave it unset in production. The sample companies are prefixed `FIXTURE` and are not firm data.

Local dev without Blob stores the snapshot in `.data/os-snapshot.json` (gitignored). Set `OS_SNAPSHOT_FILE` to override that path.

## Domain

Add `os.backfieldventures.com` on the existing Vercel project (Settings, Domains). It is an extra domain on this project, not a redirect to the apex.

DNS record, at the host that already serves `backfieldventures.com`:

```text
Type  CNAME
Name  os
Value cname.vercel-dns.com
```

Leave the apex and `www` records as they are. After Vercel marks the domain valid, the host serves only the dashboard. `backfieldventures.com`, `/pitch`, `/handoff`, `/fund1`, and `/deck` stay on the public site.

Production requests for `/os` on the apex or `www` return 404. Preview URLs keep the public site at `/` and the gated dashboard at `/os`.

## Sign-in

`OS_DASHBOARD_PASSWORD` is read on the server. The session cookie is `bfv_os_session`: signed, `HttpOnly`, `SameSite=Lax`, `Secure` in production, 30 days, host-only.

A failed password waits 1 second. Five failures from the same IP within 10 minutes lock sign-in for 10 minutes (best effort per server instance, plus the delay on every failure).

Logged-out page requests render only the sign-in screen. Logged-out calls to dashboard APIs return 401. The HTML, client bundles, and `public/` files do not contain the snapshot.

`generated_at` is shown as "Last updated" in America/Chicago. Older than 6 hours, the screen is marked stale.

Before the first successful ingest, the dashboard is an empty state. It does not invent pitches, bots, outreach, or handoffs. The bot map stays empty of links until `interactions` is posted.

## Schema

`schema_version` is optional and ignored. Unknown top-level keys are dropped. Inside `bots`, `built_at`, `today`, `bots`, `routines`, `pulse`, and `usage` are kept. Each bot keeps the fields below. `result` is clipped at 2000 characters.

```json
{
  "generated_at": "2026-11-03T19:40:00.000Z",
  "pitches": [
    {
      "company": "Example Co",
      "sector": "Sports",
      "stage": "Seed",
      "received": "2026-11-03",
      "founder": "Ada Example",
      "status": "new",
      "score": 72,
      "source": "inbound",
      "deck": "https://example.com/deck"
    }
  ],
  "bots": {
    "built_at": "2026-11-03T13:39:59.002558-06:00",
    "today": "2026-11-03",
    "bots": [
      {
        "name": "BV Executive",
        "slug": "executive",
        "team": "Executive",
        "role": "Executive",
        "scope": "Turns Ryan's intent into task packets",
        "registry_status": "active",
        "status": "Needs Ryan",
        "last": "Nov 2, 12:02pm CT",
        "last_iso": "2026-11-02T12:02:49.375628-06:00",
        "source": "ops/handoffs/muse-handoff-2026-11-02.md",
        "result": "Latest one-line result.",
        "usage_share": 14,
        "director": "executive"
      }
    ],
    "routines": [
      { "name": "Heartbeat network", "status": "Succeeded", "last": "Nov 3, 11:41am CT", "note": "" }
    ],
    "pulse": { "as_of": "2026-10-30 9:50am CT", "titles": [] },
    "usage": {
      "weekly_used_pct": 0.7,
      "on_demand_cycle_usd": 50.46,
      "weekly_reset": "Mon Nov 9, 8:02pm CT"
    }
  },
  "outreach": [
    { "track": "athlete", "sent": 32, "floor": 25 },
    { "track": "fo_hnwi", "sent": 10, "floor": 15, "label": "FO / HNWI" },
    { "track": "creator", "sent": 8, "floor": 10 },
    { "track": "real_estate_agents", "sent": 4, "floor": 10, "label": "Real estate agents" },
    { "track": "ig_dms", "sent": 20, "floor": 20, "label": "IG DMs" },
    { "track": "follows", "sent": 40, "floor": 30 }
  ],
  "decisions": [
    {
      "title": "Kathleen Collins LinkedIn DM reply",
      "since": "2026-11-03T17:41:00.000Z",
      "link": "https://example.com/decision"
    }
  ],
  "activity": [
    {
      "timestamp": "2026-11-03T19:16:32.000Z",
      "actor": "Instagram Comms",
      "summary": "Working the close DM queue."
    }
  ],
  "interactions": [
    {
      "timestamp": "2026-11-03T19:10:00.000Z",
      "from": "executive",
      "to": "investment",
      "kind": "packet",
      "packet_id": "pkt_example",
      "title": "Score the inbound deck",
      "status": "open"
    }
  ]
}
```

Rules:

- `generated_at` is required ISO-8601.
- `status` on a pitch is `new`, `reviewing`, `passed`, or `advanced` (any case).
- `score` is a number or `null`.
- `founder`, `sector`, `stage`, and `source` are optional. Omit them, send `""`, or send `unknown` and the dashboard stores nothing and renders nothing. Older snapshots that still send those strings keep working.
- A pitch may also include `title` (short label, clipped at 160), `summary` (internal deal note, clipped at 2000, shown in muted text), `domain`, and `logo_url`.
- `deck` and `link` are `null` or an `http`/`https` URL. `logo_url` is the same, and is dropped when it is not a public http(s) URL. `domain` is a hostname. The dashboard fetches a favicon for `domain` when `logo_url` is absent, and falls back to a monogram when nothing is found.
- `received`, `since`, `timestamp`, and `last_iso` must parse as dates. `last_iso` may be `null`.
- `bots` may be the feed object above, or a bare array of bots. The live bot-office file belongs under `bots` as that object, including `routines`, `pulse`, and `usage`.
- `usage_share` is a number or `null`.
- `sent` and `floor` are numbers from 0 to 1000000.
- Known track ids: `athlete`, `fo_hnwi`, `creator`, `real_estate_agents`, `ig_dms`, `follows`. Any other `track` string is kept. `label` overrides the display name.
- Arrays other than `interactions` are required. Send `[]` when a section is empty.
- `interactions` is optional. Current snapshots that omit it keep working. When present it is an array of at most 500 handoffs.
- `crm` is optional. When omitted, the CRM page is empty. Shape: `{ "people": [ ... ] }` with at most 5000 people.
- Each person needs `id`, `name`, and `track` (`investor`, `family_office`, `athlete`, `creator`, `real_estate`, `lp`, `founder`, or `other`). `stage` may be omitted. A stage of `unknown` is stored as no stage. Optional nulls: `firm`, `owner`, `last_touch_at`, `last_touch_channel`, `next_step`, `next_step_due`, `email`, `linkedin`, `notes` (max 280). Optional `domain` and `logo_url` supply the firm mark.
- Follow-up is anyone whose `next_step_due` is on or before today. Hot is anyone whose `last_touch_at` is within the last 7 days. Both lists use only those fields.
- A decision may also include `id`, `summary` (short muted line), `context` (max 600), `options` (`value` and `label`, up to 8), `exact_message`, `requested_by`, `created_at`, `domain`, and `logo_url`. `title` can be long. The page shows a short sentence-case title, then the summary, and keeps the full context and exact message behind Details. Without `options`, the inbox offers Approve, Edit, and Skip. Edit stores the edited text as its own choice with a sha256 of that text, not an approval of the original.
- Ryan's answer is stored separately from the snapshot, in the same private store, on the action queue. `POST /api/os/decide` is an alias: it requires the session cookie and a same-origin request. Body: `{ "decision_id", "choice", "note" }`. The stored record is an action `{ action_id, type: "decide", target_id, payload, created_at, idempotency_key }` where the payload includes `{ choice, note, exact_message_hash }`. The hash is sha256 of `exact_message` when that field is present and the choice approves it. A decision can be answered once. The same idempotency key never creates a second row.
- `POST /api/os/action` is the queue for every Ryan action. Same session cookie and same-origin check. Body: `{ "type", "target_id", "payload", "idempotency_key" }`. `payload` is a flat JSON object capped at 8000 bytes. The site never sends email, DMs, or posts. It only records the request. A typed ask is stored as text. It is never inferred as a yes or a swap.
- Action types and payloads:
  - `decide`: `{ choice, note, swaps, exact_message_hash, edited_message, prior_message_hash }`. `choice` is the option value, or `reply`, or `swap`. `swaps` is `[{ out, in }]` of pack and candidate slugs. `note` is capped at 2000 characters. A reply requires a note.
  - `rate`: `{ rating }` where rating is `great`, `good`, `maybe`, or `no`. `target_id` is the pitch id.
  - `free_text`: `{ text, page, about }`. An ask from the command box. `text` is required and capped at 2000. `target_id` is `executive`, or the decision's `requested_by` when a decision is on screen.
  - `bot_request`: `{ text, page, about }`. An ask aimed at one bot. `target_id` is the bot name. `text` is required and capped at 2000.
  - `bot_pause` and `bot_resume`: empty payload. `target_id` is the bot name. These file a request only. The office routes pause to the registry owner. The site does not change the bot.
  - `crm_stage`: `{ stage }`. `crm_next_step`: `{ next_step, next_step_due }`. Marking a next step done sends empty strings. `crm_note`: `{ note }`. `crm_hold`: `{ hold }`. `crm_dnc`: `{ dnc }`. `target_id` is the person id.
  - `draft_followup`: `{ text }`. `target_id` is the person id.
  - `pitch_status`: `{ intent, status }`. `target_id` is `pitch:<company>` or the pitch id.
  - `snooze`: `{ until }`.
- `GET /api/os/actions/mine` returns `{ actions }` for the signed-in session. No cookie returns 401. The dashboard polls it about every 30 seconds while the tab is visible so an ask, a decision, or a rating can move from "With X. Not picked up." to "Picked up." plus the note, or "Did not land." with Retry. This route is not a bearer route.
- The office box reads unacked actions with `GET /api/os/actions/pending` and marks them with `POST /api/os/actions/ack` and `{ "ids": ["action_id"], "result": { "status": "done"|"failed", "note": "optional" } }`. Both use `Authorization: Bearer $OS_INGEST_TOKEN`. The pending route stays bearer-only.
- `GET /api/os/decisions/answered` and `POST /api/os/decisions/ack` still work. They read and ack `decide` actions. Ack ids may be decision ids. After pickup the older clients still see `acked_at`.
- The office box reads answers with `GET /api/os/decisions/answered` and marks them picked up with `POST /api/os/decisions/ack` and `{ "ids": ["..."] }`. Both use `Authorization: Bearer $OS_INGEST_TOKEN`. After pickup the inbox says Done. Until then it says Pending. A later snapshot that already contains the change clears the overlay.
- Each interaction needs `timestamp` (ISO-8601), `from`, `to`, `kind` (`packet`, `amendment`, `result`, or `message`), `packet_id` (string or null), `title` (max 160 characters), and `status` (string or null).
- `from` and `to` are a lowercase director key (`investment`, `intelligence`, `network`, `growth`, `firm_os`, `executive`, `ryan`) or a bot display name.
- A bot may include `director`, one of those same keys. If it is missing, the bot map files that bot under Other.
- Limits: 2000 pitches, 500 bots, 50 outreach rows, 300 decisions, 1000 activity rows, 500 interactions, 1.5 MB.

A 400 response lists field paths in `issues` and does not echo the payload.

## curl

```bash
curl -sS -X POST "https://os.backfieldventures.com/api/ingest" \
  -H "Authorization: Bearer $OS_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  --data @snapshot.json
```

Success:

```json
{
  "ok": true,
  "generated_at": "2026-11-03T19:40:00.000Z",
  "stored_at": "2026-11-03T19:40:02.000Z",
  "counts": { "pitches": 1, "bots": 44, "outreach": 6, "decisions": 1, "activity": 1 }
}
```

To wrap the current bot-office file, put that JSON object on the `bots` key and add `generated_at`, `pitches`, `outreach`, `decisions`, and `activity` beside it.
