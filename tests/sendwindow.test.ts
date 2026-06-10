import { describe, it, expect } from "vitest";
import { withinSendWindow } from "@/lib/services/settings";

const cfg = (over: Partial<Parameters<typeof withinSendWindow>[0]> = {}) => ({
  sendWindowEnabled: true,
  sendWindowStart: 8,
  sendWindowEnd: 18,
  sendWeekdaysOnly: true,
  sendTimezone: "UTC",
  ...over,
});

// Fixed instants (UTC): Wed 2026-06-10 was a Wednesday.
const WED_10AM = new Date("2026-06-10T10:00:00Z");
const WED_3AM = new Date("2026-06-10T03:00:00Z");
const WED_8PM = new Date("2026-06-10T20:00:00Z");
const SAT_NOON = new Date("2026-06-13T12:00:00Z");

describe("send window", () => {
  it("allows a weekday mid-morning send", () => {
    expect(withinSendWindow(cfg(), WED_10AM).ok).toBe(true);
  });

  it("blocks before the window opens and after it closes", () => {
    expect(withinSendWindow(cfg(), WED_3AM).ok).toBe(false);
    expect(withinSendWindow(cfg(), WED_8PM).ok).toBe(false);
  });

  it("blocks weekends when weekdays-only is on, allows when off", () => {
    expect(withinSendWindow(cfg(), SAT_NOON).ok).toBe(false);
    expect(withinSendWindow(cfg({ sendWeekdaysOnly: false }), SAT_NOON).ok).toBe(true);
  });

  it("always allows when the window is disabled", () => {
    expect(withinSendWindow(cfg({ sendWindowEnabled: false }), WED_3AM).ok).toBe(true);
  });

  it("respects the timezone (3am UTC is evening in Los Angeles)", () => {
    // 2026-06-10T03:00Z = 2026-06-09 20:00 PDT → outside 8–18.
    const la = cfg({ sendTimezone: "America/Los_Angeles" });
    expect(withinSendWindow(la, WED_3AM).ok).toBe(false);
    // 2026-06-10T20:00Z = 13:00 PDT → inside.
    expect(withinSendWindow(la, WED_8PM).ok).toBe(true);
  });

  it("fails open on an invalid timezone (never silently halts automation)", () => {
    const r = withinSendWindow(cfg({ sendTimezone: "Not/AZone" }), WED_3AM);
    expect(r.ok).toBe(true);
    expect(r.reason).toMatch(/invalid timezone/);
  });

  it("explains why it blocked", () => {
    const r = withinSendWindow(cfg(), WED_3AM);
    expect(r.reason).toMatch(/outside send window/);
  });
});
