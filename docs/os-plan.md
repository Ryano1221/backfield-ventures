# Backfield OS: audit and plan

Last updated Nov 6, 2026. This file explains what the OS is made of today and the order we are changing it in.

## What is live, sample, or missing

| Area | Where the data comes from | Status |
| --- | --- | --- |
| Today, Deals, People, Bots, Activity, Waiting | One JSON snapshot posted by the office box to `/api/ingest`, stored in a private Vercel Blob. Ryan's clicks go to a separate action queue in the same store. | Live. Shows a stale banner after 6 hours without a new snapshot. |
| Fund I target, close date, commitments | `os-dashboard/raise` doc in the private store, written from the Fund I page. | Live. Ryan enters it by hand. |
| Fund I funnel | Counted from CRM people flagged `lp` in the snapshot. | Live. A different base from the People page total (all people), so the two do not match by design. |
| Email subscribers and sends | Supabase tables `email_subscribers` and `email_sends`. When the tables are missing or empty, the pages show built-in sample rows marked "sample". | Sample in production today. |
| Compose, Templates, Best 3, Lead magnets, Signup forms, Sending domain, Settings | Static templates in `src/lib/email/templates.ts` and copy in the page files. | Static. Sending is blocked in code (`/api/os/email/compose/send` always returns `blocked`) and behind `EMAIL_SEND_ENABLED`. |
| Public Handoff signup | `/api/handoff-subscribe`, used by the public site. | Live. Unchanged by this work. |
| OS signup form preview | `/api/email/subscribe`, separate from the live form. | Preview only. |
| Social content, content calendar | None. LinkedIn, Instagram and X publishers exist only as bots in the snapshot. | Missing. |
| Investment memo, diligence, decision | None. Deals have a score from the office and Ryan's rating. | Missing. |

## Why some counts disagree

- **People track chips add up to more than the total.** LP is a flag on top of a person's track, so an LP investor counts under both. The page now says so.
- **People total vs Fund I funnel.** People counts everyone in the CRM. The funnel counts only people flagged LP. Different bases, both correct.
- **"Deals to rate" vs Deals page.** Today counts open pitches (new or reviewing) with no rating from Ryan. The Deals page "Unrated" chip counts every pitch with no rating, including passed and advanced ones. Both read the same snapshot.
- **Score vs rating vs status.** Score is the office's number. Rating is Ryan's great, good, maybe or no. Status is the pipeline step (new, reviewing, advanced, passed). There is no final investment decision field yet.

## Plan

Each step ships as its own PR, merged after CI and the Vercel preview pass. Nothing in this plan sends email, posts to social, changes DNS, connects accounts, or turns on database or sheet writes.

1. **Fix what is broken on screen.** Overlapping Chase next rows, clipped email tabs and People stages, raw file paths on deals, the blank Best 3 panel, unexplained count overlaps. (This PR.)
2. **New top-level structure.** Today, Fundraising, Investments, Relationships, Audience Growth, Operations. Bots, Activity and Waiting move under Operations. Same pages, clearer grouping.
3. **Content Studio.** One content item per idea: source, brief, channel drafts for newsletter, LinkedIn, X and Instagram, status (draft, review, approved, scheduled, published, failed), owner, next action. Stored in the private store like the Fund I ledger. Channel previews with character limits. Approval is recorded. Publishing stays off.
4. **Newsletter and lead magnet flows inside the studio.** Issues created from templates as new drafts, rendered desktop and mobile previews, test-send and approval steps that stay blocked until Ryan turns sending on.
5. **Fund workflows.** LP pipeline with expected check size and confidence, deal memo and diligence checklist, a decision field separate from rating, portfolio list.
