import assert from "node:assert/strict";
import test from "node:test";
import { applyStudioOp, calendar, checkDraft, EMPTY_STUDIO, itemStatus, nextAction, parseStudio, type Studio } from "./studio";

const NOW = "2026-11-06T15:00:00.000Z";

function make(channels = ["newsletter", "x"]): Studio {
  const result = applyStudioOp(EMPTY_STUDIO, { op: "create", title: "Why athletes make good angels", source_kind: "note", channels }, NOW, () => "c_1");
  assert.equal(result.ok, true);
  return result.ok ? result.studio : EMPTY_STUDIO;
}

function step(studio: Studio, op: Record<string, unknown>): Studio {
  const result = applyStudioOp(studio, op, NOW);
  if (!result.ok) throw new Error(result.error);
  return result.studio;
}

test("an idea starts with one empty draft per chosen channel", () => {
  const studio = make();
  const item = studio.items[0];
  assert.deepEqual(item.drafts.map((d) => [d.channel, d.status]), [["newsletter", "draft"], ["x", "draft"]]);
  assert.equal(item.owner, "Ryan");
  assert.equal(nextAction(item), "Write the Newsletter draft.");
});

test("create needs a title and a channel", () => {
  assert.equal(applyStudioOp(EMPTY_STUDIO, { op: "create", title: " ", channels: ["x"] }).ok, false);
  assert.equal(applyStudioOp(EMPTY_STUDIO, { op: "create", title: "Idea", channels: [] }).ok, false);
});

test("approval needs the blocking checks cleared", () => {
  let studio = make(["newsletter"]);
  const blocked = applyStudioOp(studio, { op: "set_status", id: "c_1", channel: "newsletter", status: "approved" }, NOW);
  assert.equal(blocked.ok, false);
  studio = step(studio, { op: "edit_draft", id: "c_1", channel: "newsletter", subject: "Three companies", body: "Hello." });
  studio = step(studio, { op: "set_status", id: "c_1", channel: "newsletter", status: "approved" });
  assert.equal(studio.items[0].drafts[0].approved_at, NOW);
});

test("editing an approved draft sends it back to review", () => {
  let studio = make(["x"]);
  studio = step(studio, { op: "edit_draft", id: "c_1", channel: "x", body: "First take." });
  studio = step(studio, { op: "set_status", id: "c_1", channel: "x", status: "approved" });
  studio = step(studio, { op: "edit_draft", id: "c_1", channel: "x", body: "Second take." });
  const draft = studio.items[0].drafts[0];
  assert.equal(draft.status, "review");
  assert.equal(draft.approved_at, null);
  assert.equal(draft.revisions[0].body, "First take.");
});

test("scheduling needs an approval and a date; published cannot be set here", () => {
  let studio = make(["x"]);
  studio = step(studio, { op: "edit_draft", id: "c_1", channel: "x", body: "Post." });
  assert.equal(applyStudioOp(studio, { op: "set_status", id: "c_1", channel: "x", status: "scheduled", scheduled_for: "2026-11-10" }).ok, false);
  studio = step(studio, { op: "set_status", id: "c_1", channel: "x", status: "approved" });
  assert.equal(applyStudioOp(studio, { op: "set_status", id: "c_1", channel: "x", status: "scheduled" }).ok, false);
  studio = step(studio, { op: "set_status", id: "c_1", channel: "x", status: "scheduled", scheduled_for: "2026-11-10" });
  assert.equal(studio.items[0].drafts[0].status, "scheduled");
  assert.equal(applyStudioOp(studio, { op: "set_status", id: "c_1", channel: "x", status: "published" }).ok, false);
  const cal = calendar(studio, Date.parse(NOW));
  assert.equal(cal.find((row) => row.day === "2026-11-10")?.entries.length, 1);
});

test("channel checks: X length, Instagram image, newsletter subject, unsourced numbers", () => {
  assert.ok(checkDraft({ channel: "x", subject: "", preview: "", body: "a".repeat(281), image_url: "" }).some((c) => c.level === "block"));
  assert.ok(checkDraft({ channel: "instagram", subject: "", preview: "", body: "Caption", image_url: "" }).some((c) => c.text.includes("image")));
  assert.ok(checkDraft({ channel: "newsletter", subject: "", preview: "", body: "Hi", image_url: "" }).some((c) => c.text.includes("subject")));
  const warn = checkDraft({ channel: "linkedin", subject: "", preview: "", body: "We grew 40% in a year.", image_url: "" }, { sources: [] });
  assert.ok(warn.some((c) => c.level === "warn" && c.text.includes("sources")));
});

test("item status is the least-finished draft", () => {
  let studio = make(["x", "linkedin"]);
  studio = step(studio, { op: "edit_draft", id: "c_1", channel: "x", body: "Post." });
  studio = step(studio, { op: "set_status", id: "c_1", channel: "x", status: "approved" });
  assert.equal(itemStatus(studio.items[0]), "draft");
});

test("parseStudio drops junk instead of throwing", () => {
  assert.deepEqual(parseStudio("not json").items, []);
  assert.deepEqual(parseStudio(JSON.stringify({ items: [{ nope: 1 }] })).items, []);
  assert.equal(parseStudio(JSON.stringify(make())).items.length, 1);
});

test("contentWaiting lists only drafts in review, by item", async () => {
  const { contentWaiting } = await import("./studio");
  let studio = make(["x", "linkedin"]);
  assert.deepEqual(contentWaiting(studio), []);
  studio = step(studio, { op: "edit_draft", id: "c_1", channel: "x", body: "Post." });
  studio = step(studio, { op: "set_status", id: "c_1", channel: "x", status: "review" });
  assert.deepEqual(contentWaiting(studio), [{ id: "c_1", title: "Why athletes make good angels", channels: "X" }]);
  studio = step(studio, { op: "archive", id: "c_1", archived: true });
  assert.deepEqual(contentWaiting(studio), []);
});

test("a newsletter template becomes a new draft that cannot be approved until its prompts are filled", () => {
  const made = applyStudioOp(EMPTY_STUDIO, { op: "create", title: "November Handoff", source_kind: "note", channels: ["newsletter", "x"], template: "handoff" }, NOW, () => "c_t");
  assert.equal(made.ok, true);
  if (!made.ok) return;
  const [letter, post] = made.studio.items[0].drafts;
  assert.match(letter.subject, /^The Handoff, Issue/);
  assert.equal(post.body, "");
  assert.ok(checkDraft(letter).some((c) => c.level === "block" && c.text.includes("bracketed")));
  const blocked = applyStudioOp(made.studio, { op: "set_status", id: "c_t", channel: "newsletter", status: "approved" }, NOW);
  assert.equal(blocked.ok, false);
});
