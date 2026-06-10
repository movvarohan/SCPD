import { describe, it, expect } from "vitest";
import { autoSendDecision } from "@/lib/services/autosend";
import { DEFAULT_AUTO_SEND, type AutoSendConfig } from "@/lib/services/settings";

// autoSendDecision takes a Prisma Lead; build minimal fixtures and cast.
const lead = (over: Record<string, unknown> = {}) =>
  ({
    email: "founder@acme.com", workEmail: null, personalEmail: null,
    verifiedEmail: true, score: 7, industry: "Fintech",
    companySize: "51-200", seniority: "founder",
    ...over,
  }) as never;

const cfg = (over: Partial<AutoSendConfig> = {}): AutoSendConfig => ({
  ...DEFAULT_AUTO_SEND,
  ...over,
});

describe("auto-send decision", () => {
  it("sends a matching lead when enabled with default config", () => {
    const d = autoSendDecision(lead(), [], cfg());
    expect(d.send).toBe(true);
  });

  it("never sends when auto-send is off", () => {
    const d = autoSendDecision(lead(), [], cfg({ enabled: false }));
    expect(d.send).toBe(false);
    expect(d.reason).toMatch(/off/);
  });

  it("refuses a lead with no email", () => {
    const d = autoSendDecision(
      lead({ email: null, workEmail: null, personalEmail: null }),
      [],
      cfg()
    );
    expect(d.send).toBe(false);
    expect(d.reason).toMatch(/no email/);
  });

  it("holds unverified email when verification is required", () => {
    const d = autoSendDecision(
      lead({ verifiedEmail: false }),
      [],
      cfg({ requireVerifiedEmail: true })
    );
    expect(d.send).toBe(false);
    expect(d.reason).toMatch(/not verified/);
  });

  it("holds drafts with warnings when skipIfWarnings is set", () => {
    const d = autoSendDecision(lead(), ["missing hook"], cfg({ skipIfWarnings: true }));
    expect(d.send).toBe(false);
    expect(d.reason).toMatch(/warning/);
  });

  it("holds leads below the minimum score", () => {
    const d = autoSendDecision(lead({ score: 2 }), [], cfg({ minScore: 5 }));
    expect(d.send).toBe(false);
    expect(d.reason).toMatch(/below minimum/);
  });

  it("respects an industry allow-list", () => {
    const allow = cfg({ industries: ["healthcare"] });
    expect(autoSendDecision(lead({ industry: "Fintech" }), [], allow).send).toBe(false);
    expect(autoSendDecision(lead({ industry: "Healthcare IT" }), [], allow).send).toBe(true);
  });

  it("respects company-size and seniority allow-lists", () => {
    const sizeRule = cfg({ companySizes: ["1-10"] });
    expect(autoSendDecision(lead({ companySize: "51-200" }), [], sizeRule).send).toBe(false);
    const roleRule = cfg({ seniorities: ["founder"] });
    expect(autoSendDecision(lead({ seniority: "ic" }), [], roleRule).send).toBe(false);
    expect(autoSendDecision(lead({ seniority: "founder" }), [], roleRule).send).toBe(true);
  });
});
