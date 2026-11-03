import assert from "node:assert/strict";
import test from "node:test";
import { explainDecision, plain } from "./explain";
import type { Decision } from "./types";

test("decision copy drops paths and does not invent missing lines", () => {
  const messy: Decision = {
    title:
      "ON HOLD. BEST3 OCTOBER 2026 PARTNER PACK (PACKET PKT_187BBAGO, OWNER INVESTMENT). APPROVE CARD OPS/BEST3/ASSEMBLE-2026-10-APPROVE-CARD.MD",
    since: "2026-10-20T15:00:00.000Z",
    link: null,
  };
  const explained = explainDecision(messy, "best3");
  assert.equal(explained.primary, "Approve this pack");
  assert.equal(explained.what, null);
  assert.equal(explained.message, null);
  assert.equal(/pkt_|\/|\.md/i.test(explained.who), false);
  assert.equal(plain("Approve card OPS/BEST3/file.md"), "Approve card");

  const full = "Hi Kathleen, thanks for reaching out.\nProtein stays on this second line.";
  const reply = explainDecision(
    {
      title: "LINKEDIN DM REPLY TO KATHLEEN COLLINS (PROTEIN BEVERAGE FOUNDER)",
      since: "2026-10-28T22:05:00.000Z",
      link: null,
      context: "Needs Ryan's yes on the exact text before anyone sends.",
      exact_message: full,
    },
    "kathleen",
  );
  assert.equal(reply.who, "Kathleen Collins");
  assert.equal(reply.message, full);
  assert.equal(reply.primary, "Send this reply");
  assert.equal(/protein beverage founder/i.test(`${reply.who} ${reply.what ?? ""}`), false);
});
