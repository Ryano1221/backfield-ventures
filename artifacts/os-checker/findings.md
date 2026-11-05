# OS crawler findings

All names in the fixture and in these screenshots are invented. The production snapshot file was used only as a field list. No production values were copied.

The crawler runs at 390x844, 1024x768, and 1440x900. It visits every deal, person, bot sheet, decision, and email route in the fixture. The final run reported no failures at any of those sizes. The existing phone and desk end-to-end test also passed (the desk run once timed out on a button that re-rendered after save, then passed on its own rerun).

## Fixed

| # | Route | Viewport | What happened | Before | Fixed |
| --- | --- | --- | --- | --- | --- |
| 1 | `/os`, `/os/deals`, `/os/crm`, `/os/bots`, `/os/activity` | 1024 | The side rail was taken out of the grid and painted as a full-height black sheet. The page heading sat below the first screen, the rail overlapped the crumb, and bot sheets could not be clicked. | Crawl shots in the CI artifact `os-crawl-report` | Yes. From 900px up the shell stays a 220px rail plus the page. |
| 2 | `/os/email` and nested email routes | 1024 and 1440 | The email column had no max width, so the dashboard stretched across the content area. Recent sends also broke words mid-letter and the sample tag overflowed. | Crawl shots in the CI artifact | Yes. Email main is capped at 920px. Under 1200px the cards stack, the email column keeps a 160px minimum, and tags wrap. |
| 3 | Every signed-in screen | 1024 and 1440 | Links, buttons, and inputs had no `:hover` or `:focus-visible` rule, so desktop pointer and keyboard states were missing. A broad hover tint also covered primary buttons and pressed chips. | Crawl shots in the CI artifact | Yes. Hover underline and tint skip `.primary`, pressed controls, and the sheet scrim. Primary hover is black. Inputs only change border color. Focus ring is `#123D22`. |
| 4 | `/os/deals` | 390 and 1024 | A deck that is only a note has no link. | deals shots | Left as pass 3 shipped it. That pass removed the deck-note dialog on purpose, so a note without a URL stays on the deal detail and is not a second dialog. |
| 5 | `/os/email/templates` and other copy buttons | all | If the clipboard was blocked, the button stayed on its original label. | — | Yes. The label becomes “Could not copy”. |
| 6 | `/os` inbox | 390 | Approve and Not now did nothing on touch. The card’s swipe handler captured the pointer before the button click. | Crawl shots in the CI artifact | Already fixed on pass 3. This pass keeps that one pointer-down guard (`button, a`) and does not add a second. |
| 7 | `/os/d/[id]` | 390 | Action buttons used a wrapping column flex, so Approve sat in a second column past the right edge. | Crawl shots in the CI artifact | Yes. That column does not wrap, and the buttons stay within the screen. |
| 8 | `/os/d/[id]` | 390 and 1024 | The Reply button stretched under the tab bar, and the decision title broke one letter per line in the narrow column. | Crawl shots in the CI artifact | Yes. The button no longer stretches, the page keeps 128px clear of the tab bar, and the title uses `overflow-wrap: break-word` with a 12ch minimum. |
| 9 | `/os/bots` | 390 | “1 routines failed” was 118x28, and the count used a bad plural. | Crawl shots in the CI artifact | Yes. Minimum target is 44px, and one failure reads “1 routine failed”. |
| 10 | Deal, person, and decision back links | 390 | “Deals”, “People”, and “Today” links were about 19px tall. | `390-people.png` | Yes. Those links are at least 44px tall. |
| 11 | `/os/deals` | 390 | The Name sort sat on its own wrapped line. | Crawl shots in the CI artifact | Yes. The four sort controls are equal columns at 15px. |
| 12 | Deal detail | all | Received was the raw timestamp string. | — | Yes. It is formatted in Central Time. |
| 13 | Header crumb | 1024 | Search, stamp, and the ask field competed for one row. | 1024 today after the rail fix | Yes. Under 1200px the stamp and “private” label drop out of that row. |
| 14 | `/os/deals` sticky tools | 390 | The sticky filter bar used a 52px offset and could tuck under the phone header. | — | Yes. The offset follows the app bar. |

Screenshots are not in git. The crawler writes them with `test.info().outputPath()`, and CI uploads `test-results` as `os-crawl-report`.

## Not changed

| Item | Why |
| --- | --- |
| A machine route with the wrong method returns 405. A missing or wrong token returns 401. | The crawler sets a dummy `OS_INGEST_TOKEN`, so “not configured” is not an acceptable stand-in for a denied call. The gate itself is unchanged. |
| A desk end-to-end click on Resume detached once while the page refreshed after save. | It passed on the immediate rerun. No product change. |
| With no snapshot, Today can still read as clear. A snapshot that fails validation is dropped and looks like no ingest. | The crawler fixture is always valid, so those states never render. |
| The email signups chart can show a sample tag on live rows. | This environment has no subscriber database, so the sample tag is correct here. |

## What the fixture cannot show

- Logo hosts that hang or return odd images. The fixture uses `example.com` or no logo.
- A snapshot larger than the store limit, or fields the schema drops, including a failed ingest that should show an error instead of an empty desk.
- Real send, clipboard permission prompts, and mail-provider errors.
- Whether a production decision’s approve label is long enough to wrap differently from the fake ones.
