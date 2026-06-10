import { describe, it, expect } from "vitest";
import { scoreLead } from "@/lib/services/scoring";

// scoreLead accepts a partial Lead; cast through unknown for these fixtures.
const lead = (over: Record<string, unknown> = {}) =>
  ({
    isStanfordAlum: false, isSCAlum: false, isFormerClient: false,
    seniority: "ic", industry: null, companySize: null, verifiedEmail: false,
    warmConnectionType: "none", warmConnectionNotes: "", location: null,
    ...over,
  }) as never;

describe("lead scoring", () => {
  it("scores a cold IC with nothing as Low priority", () => {
    const r = scoreLead(lead());
    expect(r.priority).toBe("Low");
    expect(r.total).toBeLessThan(4);
  });

  it("rewards an SC-alum founder in a strong industry as High", () => {
    const r = scoreLead(lead({
      isSCAlum: true, seniority: "founder", industry: "Fintech",
      companySize: "51-200", verifiedEmail: true, warmConnectionType: "alumni",
      location: "San Francisco, CA",
    }));
    expect(r.priority).toBe("High");
    expect(r.total).toBeGreaterThanOrEqual(8);
  });

  it("explains every rule in the breakdown", () => {
    const r = scoreLead(lead({ isSCAlum: true }));
    expect(r.items.length).toBeGreaterThan(5);
    expect(r.items.every((i) => typeof i.reason === "string")).toBe(true);
    const alum = r.items.find((i) => i.key === "stanford_sc_alum");
    expect(alum?.applied).toBe(true);
  });

  it("respects disabled rules via weights", () => {
    const weights = {
      stanford_sc_alum: { weight: 3, enabled: false, label: "alum" },
    };
    const r = scoreLead(lead({ isSCAlum: true }), weights);
    const alum = r.items.find((i) => i.key === "stanford_sc_alum");
    expect(alum?.applied).toBe(false);
  });
});
