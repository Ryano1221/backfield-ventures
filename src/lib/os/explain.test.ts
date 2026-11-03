import assert from "node:assert/strict";
import test from "node:test";
import { explainDecision, plain } from "./explain";
import type { Decision } from "./types";

test("decision copy drops paths and says what the click does", () => {
  const messy: Decision = {
    title:
      "ON HOLD. BEST3 OCTOBER 2026 PARTNER PACK (PACKET PKT_187BBAGO, OWNER INVESTMENT). APPROVE CARD OPS/BEST3/ASSEMBLE-2026-10-APPROVE-CARD.MD",
    since: "2026-10-20T15:00:00.000Z",
    link: null,
    summary: "The October partner pack is on hold until you approve it.",
  };
  const explained = explainDecision(messy, "best3");
  assert.equal(explained.primary, "Approve this pack");
  assert.equal(explained.why, "This is on hold until you approve it.");
  assert.equal(/pkt_|\/|\.md/i.test(`${explained.what} ${explained.why}`), false);
  assert.equal(plain("Approve card OPS/BEST3/file.md"), "Approve card");

  const reply = explainDecision(
    {
      title: "LINKEDIN DM REPLY TO KATHLEEN COLLINS (PROTEIN BEVERAGE FOUNDER)",
      since: "2026-10-28T22:05:00.000Z",
      link: null,
      context: "Needs Ryan's yes on the exact text before anyone sends.",
      exact_message: "Hi Kathleen, thanks for reaching out.",
    },
    "kathleen",
  );
  assert.equal(reply.who, "Kathleen Collins");
  assert.equal(reply.role, "Protein beverage founder");
  assert.equal(reply.primary, "Send this reply");
  assert.equal(reply.message, "Hi Kathleen, thanks for reaching out.");
  assert.match(reply.why, /Nothing sends until you approve/);
});
