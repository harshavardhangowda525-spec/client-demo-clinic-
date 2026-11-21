import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSlots, type SlotRules } from "../src/lib/slots.ts";
import { istToUtc } from "../src/lib/time.ts";

const day = { open: "09:00", close: "13:00", breaks: [{ start: "11:00", end: "11:30" }] };
const rules: SlotRules = {
  hours: { "0": null, "1": day, "2": day, "3": day, "4": day, "5": day, "6": day },
  slotIntervalMinutes: 30, bufferMinutes: 10, minNoticeMinutes: 0, bookingWindowDays: 30,
};
// Monday 2026-11-23 in IST
const DATE = "2026-11-23";
const now = istToUtc("2026-11-22", "08:00");
const base = { fromDate: DATE, days: 1, durationMinutes: 45, rules, now, appointments: [], blocks: [], external: [] };
const times = (r: ReturnType<typeof computeSlots>) => r[0].slots.map((s) => s.time);

test("respects hours and breaks", () => {
  // 45 min visits, every 30 min, break 11:00-11:30, close 13:00
  assert.deepEqual(times(computeSlots(base)), ["09:00", "09:30", "10:00", "11:30", "12:00"]);
});

test("closed on Sunday", () => {
  const r = computeSlots({ ...base, fromDate: "2026-11-22" });
  assert.equal(r[0].open, false);
  assert.equal(r[0].slots.length, 0);
});

test("existing appointment + buffer blocks overlapping slots", () => {
  const a = { start: istToUtc(DATE, "09:30").getTime(), end: istToUtc(DATE, "10:25").getTime() }; // 45 + 10 buffer
  assert.deepEqual(times(computeSlots({ ...base, appointments: [a] })), ["11:30", "12:00"]);
});

test("google busy periods are unavailable", () => {
  const e = { start: istToUtc(DATE, "12:00").getTime(), end: istToUtc(DATE, "12:15").getTime() };
  assert.deepEqual(times(computeSlots({ ...base, external: [e] })), ["09:00", "09:30", "10:00"]);
});

test("holiday blocks the whole day", () => {
  const h = { start: istToUtc(DATE, "00:00").getTime(), end: istToUtc("2026-11-24", "00:00").getTime() };
  assert.equal(computeSlots({ ...base, blocks: [h] })[0].slots.length, 0);
});

test("no slots in the past or inside minimum notice", () => {
  const r = computeSlots({ ...base, now: istToUtc(DATE, "09:40"), rules: { ...rules, minNoticeMinutes: 60 } });
  assert.deepEqual(times(r), ["11:30", "12:00"]);
});

test("booking window is enforced", () => {
  const r = computeSlots({ ...base, rules: { ...rules, bookingWindowDays: 0 } });
  assert.equal(r[0].slots.length, 0);
});

test("slot start is returned as UTC ISO for IST time", () => {
  assert.equal(computeSlots(base)[0].slots[0].start, "2026-11-23T03:30:00.000Z");
});
