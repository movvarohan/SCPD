import { describe, it, expect } from "vitest";
import { autoDetectMapping, mapRowToLead, validateLead } from "@/lib/services/csv";

describe("CSV header auto-detection", () => {
  it("maps common header synonyms to internal fields", () => {
    const m = autoDetectMapping(["First Name", "Surname", "E-mail", "Current Company"]);
    expect(m["First Name"]).toBe("firstName");
    expect(m["Surname"]).toBe("lastName");
    expect(m["E-mail"]).toBe("email");
    expect(m["Current Company"]).toBe("companyName");
  });

  it("does not assign the same field to two columns", () => {
    const m = autoDetectMapping(["Email", "Primary Email"]);
    const assigned = Object.values(m).filter((v) => v === "email");
    expect(assigned).toHaveLength(1);
  });

  it("leaves unknown headers unmapped", () => {
    const m = autoDetectMapping(["Zodiac Sign"]);
    expect(m["Zodiac Sign"]).toBe("");
  });
});

describe("mapRowToLead", () => {
  const mapping = autoDetectMapping(["First Name", "Last Name", "Work Email", "Company"]);

  it("builds a RawLead, derives full name, and picks a primary email", () => {
    const lead = mapRowToLead(
      { "First Name": "Jane", "Last Name": "Doe", "Work Email": "jane@acme.com", "Company": "Acme" },
      mapping,
      "csv-upload"
    );
    expect(lead.fullName).toBe("Jane Doe");
    expect(lead.email).toBe("jane@acme.com");
    expect(lead.source).toBe("csv-upload");
    expect(lead.verifiedEmail).toBe(false);
  });

  it("flags SC role and rolls extras into notes", () => {
    const m = autoDetectMapping(["Name", "SC Role", "Class Year"]);
    const lead = mapRowToLead(
      { "Name": "Pat Kim", "SC Role": "PD", "Class Year": "2021" },
      m,
      "csv"
    );
    expect(lead.isSCAlum).toBe(true);
    expect(lead.warmConnectionNotes).toMatch(/SC role: PD/);
    expect(lead.warmConnectionNotes).toMatch(/Class year: 2021/);
  });
});

describe("validateLead", () => {
  it("requires a name and a contact method", () => {
    expect(validateLead({ source: "x" })).toEqual(
      expect.arrayContaining(["Missing name", "No email or LinkedIn"])
    );
    expect(validateLead({ source: "x", fullName: "A", email: "a@x.com" })).toEqual([]);
  });
});
