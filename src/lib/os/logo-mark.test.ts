import assert from "node:assert/strict";
import test from "node:test";
import { logoReady, monogram } from "./logo-mark";

test("a missing or failed logo stays on the initials tile", () => {
  assert.equal(monogram("FIXTURE Northwind Sample"), "NS");
  assert.equal(monogram("FIXTURE Cedar Sample"), "CS");
  assert.equal(logoReady(null), false);
  assert.equal(logoReady({ complete: false, naturalWidth: 0 }), false);
  assert.equal(logoReady({ complete: true, naturalWidth: 0 }), false);
  assert.equal(logoReady({ complete: true, naturalWidth: 64 }), true);
});
