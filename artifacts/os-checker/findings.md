# OS crawler findings

All names in the fixture and in these screenshots are invented. The production snapshot file was used only as a field list. No production values were copied.

The crawler runs at 390x844, 1024x768, and 1440x900. It visits every deal, person, bot sheet, decision, and email route in the fixture. The final run reported no failures at any of those sizes. The existing phone and desk end-to-end test also passed (the desk run once timed out on a button that re-rendered after save, then passed on its own rerun).

## Fixed

| # | Route | Viewport | What happened | Before | Fixed |
| --- | --- | --- | --- | --- | --- |
| 1 | `/os`, `/os/deals`, `/os/crm`, `/os/bots`, `/os/activity` | 1024 | The side rail was taken out of the grid and painted as a full-height black sheet. The page heading sat below the first screen, the rail overlapped the crumb, and bot sheets could not be clicked. | `artifacts/os-checker/before/1024-today.png` (same failure on deals, people, bots, activity) | Yes. From 900px up the shell stays a 240px rail plus the page. |
| 2 | `/os/email` and nested email routes | 1024 and 1440 | The email column had no max width, so the dashboard stretched across the content area. | `artifacts/os-checker/before/1024-email.png` | Yes. Email main is capped at 920px. |
| 3 | Every signed-in screen | 1024 and 1440 | Links, buttons, and inputs had no `:hover` or `:focus-visible` rule, so desktop pointer and keyboard states were missing. | same 1024 shots | Yes. Shared hover underline/tint and a `#123D22` focus ring. |
| 4 | `/os/deals`, deal detail | 390 and 1024 | A deck that is only a note was a chip with no action. | deals shots | Yes. The chip opens a sheet with the note and a Close control. |
| 5 | `/os/email/templates` and other copy buttons | all | If the clipboard was blocked, the button stayed on its original label. | — | Yes. The label becomes “Could not copy”. |
| 6 | `/os` inbox | 390 | Approve and Not now did nothing on touch. The card’s swipe handler captured the pointer before the button click. | `artifacts/os-checker/before/390-today.png` | Yes. The swipe ignores presses that start on a button, link, or field. |
| 7 | `/os/d/[id]` | 390 | Action buttons used a wrapping column flex, so Approve sat in a second column past the right edge. | `artifacts/os-checker/before/390-decision.png` | Yes. That column does not wrap, and the buttons stay within the screen. |
| 8 | `/os/d/[id]` | 390 | The Reply button stretched with its grid row and sat under the bottom tab bar. | `artifacts/os-checker/before/390-decision.png` | Yes. The button no longer stretches, and the page keeps 128px clear of the tab bar. |
| 9 | `/os/bots` | 390 | “1 routines failed” was 118x28. | `artifacts/os-checker/before/390-bots.png` | Yes. Minimum target is 44px. |
| 10 | Deal, person, and decision back links | 390 | “Deals”, “People”, and “Today” links were about 19px tall. | `artifacts/os-checker/before/390-person.png` | Yes. Those links are at least 44px tall. |
| 11 | `/os/deals` | 390 | Rating filters stayed on one line and were clipped. | `artifacts/os-checker/before/390-deals.png` | Yes. Those filters wrap onto extra rows. |
| 12 | Deal detail | all | Received was the raw timestamp string. | — | Yes. It is formatted in Central Time. |
| 13 | Header crumb | 1024 | Search, stamp, and the ask field competed for one row. | 1024 today after the rail fix | Yes. Under 1200px the stamp and “private” label drop out of that row. |
| 14 | `/os/deals` sticky tools | 390 | The sticky filter bar used a 52px offset and could tuck under the phone header. | — | Yes. The offset follows the app bar. |

After shots for the same screens are in `artifacts/os-checker/after/` at 390 and 1024.

## Not changed

| Item | Why |
| --- | --- |
| `GET` on a POST-only `/api/os` machine route returns 405. `POST` without an ingest token returns 503. | Neither response includes dashboard data. Turning both into 401 would mean editing the gate or the machine-auth helpers, which this pass leaves alone. The crawler fails if any of those routes returns 200. |
| A desk end-to-end click on Resume detached once while the page refreshed after save. | It passed on the immediate rerun. No product change. |
| With no snapshot, Today can still read as clear. A snapshot that fails validation is dropped and looks like no ingest. | The crawler fixture is always valid, so those states never render. |
| The email signups chart can show a sample tag on live rows. | This environment has no subscriber database, so the sample tag is correct here. |

## What the fixture cannot show

- Logo hosts that hang or return odd images. The fixture uses `example.com` or no logo.
- A snapshot larger than the store limit, or fields the schema drops, including a failed ingest that should show an error instead of an empty desk.
- Real send, clipboard permission prompts, and mail-provider errors.
- Whether a production decision’s approve label is long enough to wrap differently from the fake ones.
