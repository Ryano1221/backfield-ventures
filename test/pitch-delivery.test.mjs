import assert from "node:assert/strict";
import test from "node:test";
import { deliverPitch } from "../src/lib/pitch-delivery.ts";

test("a delivered email succeeds even when the CRM write throws", async () => {
  const ok = await deliverPitch({
    notify: async () => true,
    writeCrm: async () => {
      throw new Error("getaddrinfo ENOTFOUND paused.supabase.co");
    },
    log: { company: "Acme", founderEmail: "a@example.com" },
  });
  assert.equal(ok, true);
});

test("a delivered email succeeds when the CRM write times out", async () => {
  const started = Date.now();
  const ok = await deliverPitch({
    notify: async () => true,
    writeCrm: () => new Promise(() => {}),
    crmTimeoutMs: 30,
    log: { company: "Acme", founderEmail: "a@example.com" },
  });
  assert.equal(ok, true);
  assert.ok(Date.now() - started < 1000);
});

test("email failure is a failed delivery even if the CRM also fails", async () => {
  const ok = await deliverPitch({
    notify: async () => false,
    writeCrm: async () => {
      throw new Error("supabase down");
    },
  });
  assert.equal(ok, false);
});

test("a thrown email send is a failed delivery", async () => {
  const ok = await deliverPitch({
    notify: async () => {
      throw new Error("resend down");
    },
    writeCrm: async () => {},
  });
  assert.equal(ok, false);
});
