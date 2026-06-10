import { describe, it, expect } from "vitest";
import { lintEmail } from "@/lib/services/deliverability";

const CLEAN_BODY =
  "Hi Jane,\n\nI saw Acme's launch of the new payments API last week — congrats. " +
  "We're a student-run consulting team at Stanford and we've helped fintech teams " +
  "scope go-to-market questions exactly like the one your post raised. Would you be " +
  "open to a 20-minute intro call next week?\n\nBest,\nThe Stanford Consulting Team";

describe("deliverability lint — blockers", () => {
  it("passes a clean, personalized email", () => {
    const r = lintEmail("Quick question about Acme's new API", CLEAN_BODY);
    expect(r.blockers).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it.each([
    ["Hi {{firstName}}, congrats on the round", "{{firstName}}"],
    ["Hi {first name}, congrats", "{first name}"],
    ["Hi [Name], congrats", "[Name]"],
    ["Hi FIRST_NAME, congrats", "FIRST_NAME"],
    ["We loved what %company_name% is doing", "%company_name%"],
    ["INSERT HOOK here about their company", "INSERT H"],
  ])("blocks unresolved template tokens: %s", (snippet) => {
    const r = lintEmail("Quick question", `${CLEAN_BODY}\n${snippet}`);
    expect(r.blockers.length).toBeGreaterThan(0);
    expect(r.blockers[0]).toMatch(/template token/i);
  });

  it("blocks an empty subject and empty body", () => {
    expect(lintEmail("", CLEAN_BODY).blockers).toContain("Subject line is empty.");
    expect(lintEmail("Hello", "  ").blockers).toContain("Email body is empty.");
  });
});

describe("deliverability lint — warnings", () => {
  it("flags an ALL-CAPS subject", () => {
    const r = lintEmail("AMAZING OPPORTUNITY FOR YOU", CLEAN_BODY);
    expect(r.warnings.some((w) => w.includes("ALL CAPS"))).toBe(true);
  });

  it("flags spam-trigger phrases", () => {
    const r = lintEmail("Hello", `${CLEAN_BODY}\nThis is a limited time offer, act now.`);
    expect(r.warnings.some((w) => w.includes("Spam-trigger"))).toBe(true);
  });

  it("flags too many links", () => {
    const links = "https://a.com https://b.com https://c.com https://d.com";
    const r = lintEmail("Hello", `${CLEAN_BODY}\n${links}`);
    expect(r.warnings.some((w) => w.includes("links"))).toBe(true);
  });

  it("flags a very short body", () => {
    const r = lintEmail("Hello", "Hi, call me?");
    expect(r.warnings.some((w) => w.includes("short"))).toBe(true);
  });

  it("flags excessive exclamation marks", () => {
    const r = lintEmail("Hello!!", `${CLEAN_BODY}!!!`);
    expect(r.warnings.some((w) => w.includes("exclamation"))).toBe(true);
  });
});
