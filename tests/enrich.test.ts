import { describe, it, expect } from "vitest";
import { domainFromWebsite, guessEmail } from "@/lib/services/enrich";

describe("domainFromWebsite", () => {
  it("extracts the bare host and strips www", () => {
    expect(domainFromWebsite("https://www.acme.com/about")).toBe("acme.com");
    expect(domainFromWebsite("acme.io")).toBe("acme.io");
  });

  it("rejects social / aggregator hosts that aren't a company domain", () => {
    expect(domainFromWebsite("https://www.linkedin.com/company/acme")).toBeNull();
    expect(domainFromWebsite("https://crunchbase.com/org/acme")).toBeNull();
  });

  it("returns null for empty / unparseable input", () => {
    expect(domainFromWebsite(null)).toBeNull();
    expect(domainFromWebsite("")).toBeNull();
  });
});

describe("guessEmail", () => {
  it("uses first.last@domain as the primary pattern", () => {
    const g = guessEmail("Jane", "Doe", "acme.com");
    expect(g?.email).toBe("jane.doe@acme.com");
    expect(g?.pattern).toBe("first.last@domain");
    expect(g?.candidates).toContain("jdoe@acme.com");
  });

  it("strips accents and punctuation from names", () => {
    const g = guessEmail("José", "O'Neil", "acme.com");
    expect(g?.email).toBe("jose.oneil@acme.com");
  });

  it("falls back to first@domain when no last name", () => {
    const g = guessEmail("Sam", null, "acme.com");
    expect(g?.email).toBe("sam@acme.com");
    expect(g?.pattern).toBe("first@domain");
  });

  it("returns null without a domain or any name", () => {
    expect(guessEmail("Jane", "Doe", null)).toBeNull();
    expect(guessEmail(null, null, "acme.com")).toBeNull();
  });
});
