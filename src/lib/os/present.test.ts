import assert from "node:assert/strict";
import test from "node:test";
import { blankToNull, readableDetail, shortTitle, stripAsides, summaryLine } from "./present";

test("short titles drop packet ids and shouty status lines", () => {
  assert.equal(
    shortTitle(
      "ON HOLD. BEST3 OCTOBER 2026 PARTNER PACK (PACKET PKT_187BBAGO, OWNER INVESTMENT). APPROVE CARD OPS/BEST3/ASSEMBLE-2026-10-APPROVE-CARD.MD",
    ),
    "Best3 October 2026 partner pack",
  );
  assert.equal(
    shortTitle(
      'LINKEDIN DM REPLY TO KATHLEEN COLLINS (PROTEIN BEVERAGE FOUNDER, CONNECTED TO RYAN). NEEDS RYAN\'S YES ON THE EXACT TEXT BEFORE ANYONE SENDS: "HI KATHLEEN, THANKS FOR REACHING OUT."',
    ),
    "Reply to Kathleen Collins on LinkedIn",
  );
  assert.equal(blankToNull("unknown"), null);
  assert.equal(blankToNull(" Sports "), "Sports");
  assert.equal(summaryLine("Internal deal note.", "IGNORE"), "Internal deal note.");
});

test("stripAsides keeps calendar dates and does not leave a source slash", () => {
  const cleaned = stripAsides("Asked on 10/30; Source: /comms/drafts/note.md");
  assert.equal(cleaned, "Asked on 10/30;");
  assert.equal(cleaned.includes("Source: /"), false);
  const dated = readableDetail("Heard back 10/30/2026. Source: /ops/sample/note.md");
  assert.match(dated, /10\/30\/2026/);
  assert.equal(dated.includes("Source:"), false);
  assert.equal(stripAsides("Source: /"), "");
});
