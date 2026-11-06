import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { replanUpdates, statusFor, tokyoToday } from "./today-rules";
import type { TripDay } from "./queries";

const day = (date: string, city: string): TripDay => ({ id: date, date, city, day_number: 1, position: 1, phase: "tokyo", summary: null, notes: null });

describe("in-trip replanning", () => {
  test("applying a replan never changes past days or today", () => {
    const days = [day("2026-11-04", "Tóquio"), day("2026-11-05", "Tóquio"), day("2026-11-06", "Nikko")];
    const proposal = ["2026-11-04", "2026-11-05", "2026-11-06"].map(date => ({ date, city: "Kyoto", kind: "overnight", summary: "x" }));
    assert.deepEqual(replanUpdates(days, proposal, "2026-11-05").map(u => u.id), ["2026-11-06"]);
  });
  test("Nov 5 01:49 UTC is Nov 5 in Tokyo; Nov 5 16:00 UTC is Nov 6", () => {
    assert.equal(tokyoToday(new Date("2026-11-05T01:49:00Z")), "2026-11-05");
    assert.equal(tokyoToday(new Date("2026-11-05T16:00:00Z")), "2026-11-06");
  });
  test("status by date", () => {
    assert.equal(statusFor("2026-11-04", "2026-11-05"), "lived");
    assert.equal(statusFor("2026-11-05", "2026-11-05"), "today");
    assert.equal(statusFor("2026-11-06", "2026-11-05"), "planned");
  });
});
