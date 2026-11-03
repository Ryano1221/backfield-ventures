import assert from "node:assert/strict";
import test from "node:test";
import { blankToNull, shortTitle, summaryLine } from "./present";

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
