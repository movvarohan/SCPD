import { describe, it, expect } from "vitest";
import { buildDedupeIndex, dedupeLeads } from "@/lib/services/dedupe";
import type { RawLead } from "@/lib/types";

const raw = (over: Partial<RawLead> = {}): RawLead => ({ source: "test", ...over });

describe("lead dedupe", () => {
  it("drops a lead whose email already exists in the index", () => {
    const index = buildDedupeIndex([{ email: "sam@acme.com" }]);
    const { unique, duplicates } = dedupeLeads(
      [raw({ fullName: "Sam Lee", email: "SAM@acme.com", companyName: "Acme" })],
      index
    );
    expect(unique).toHaveLength(0);
    expect(duplicates[0].reason).toBe("email");
  });

  it("matches on LinkedIn URL regardless of trailing slash / case", () => {
    const index = buildDedupeIndex([{ linkedinUrl: "https://www.linkedin.com/in/janedoe/" }]);
    const { unique, duplicates } = dedupeLeads(
      [raw({ fullName: "Jane Doe", linkedinUrl: "http://linkedin.com/in/JaneDoe" })],
      index
    );
    expect(unique).toHaveLength(0);
    expect(duplicates[0].reason).toBe("linkedin");
  });

  it("matches on name + company when no email or LinkedIn", () => {
    const index = buildDedupeIndex([{ fullName: "Pat Kim", companyName: "Globex" }]);
    const { duplicates } = dedupeLeads(
      [raw({ firstName: "Pat", lastName: "Kim", companyName: "globex" })],
      index
    );
    expect(duplicates[0].reason).toBe("name_company");
  });

  it("dedupes within the batch itself", () => {
    const index = buildDedupeIndex([]);
    const { unique } = dedupeLeads(
      [
        raw({ fullName: "Dup One", email: "dup@x.com" }),
        raw({ fullName: "Dup Two", email: "DUP@x.com" }),
      ],
      index
    );
    expect(unique).toHaveLength(1);
  });

  it("keeps genuinely distinct leads", () => {
    const index = buildDedupeIndex([{ email: "a@x.com" }]);
    const { unique } = dedupeLeads(
      [
        raw({ fullName: "B", email: "b@x.com" }),
        raw({ fullName: "C", email: "c@x.com" }),
      ],
      index
    );
    expect(unique).toHaveLength(2);
  });
});
