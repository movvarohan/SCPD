import { describe, it, expect, vi, afterEach } from "vitest";
import { nsfAwardsConnector } from "@/lib/sources/nsfAwards";

function mockNsf(awards: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ response: { award: awards } }),
  })) as unknown as typeof fetch);
}

afterEach(() => vi.unstubAllGlobals());

const university = {
  id: "1", title: "REU Site: Edge Intelligence", awardeeName: "University of Nevada, Reno",
  awardeeCity: "RENO", awardeeStateCode: "NV", piFirstName: "Rui", piLastName: "Hu",
  piEmail: "ruihu@unr.edu", fundProgramName: "RSCH EXPER FOR UNDERGRAD", fundsObligatedAmt: "464400",
};
const company = {
  id: "2", title: "SBIR: Autonomous Warehouse Robotics", awardeeName: "Dexterity Robotics Inc",
  awardeeCity: "Redwood City", awardeeStateCode: "CA", piFirstName: "Ada", piLastName: "Chen",
  piEmail: "ada@dexterity.ai", fundProgramName: "SBIR Phase II", fundsObligatedAmt: "1000000",
};

describe("NSF Awards connector", () => {
  it("requires a keyword", async () => {
    const r = await nsfAwardsConnector.search({ keywords: [], industries: [], location: "", limit: 10 });
    expect(r.leads).toEqual([]);
    expect(r.note).toMatch(/keyword/i);
  });

  it("surfaces company awardees before academic ones", async () => {
    mockNsf([university, company]);
    const r = await nsfAwardsConnector.search({ keywords: ["robotics"], industries: [], location: "", limit: 10 });
    expect(r.leads[0].companyName).toBe("Dexterity Robotics Inc");
    expect(r.leads[0].industry).toBe("Deep Tech / R&D");
    expect(r.leads[1].industry).toBe("Research / Academia");
  });

  it("maps the PI name, NSF email, and a research-abstract hook", async () => {
    mockNsf([company]);
    const r = await nsfAwardsConnector.search({ keywords: ["robotics"], industries: [], location: "", limit: 10 });
    const lead = r.leads[0];
    expect(lead.fullName).toBe("Ada Chen");
    expect(lead.email).toBe("ada@dexterity.ai");
    expect(lead.verifiedEmail).toBe(false); // real but not independently verified
    expect(lead.location).toBe("Redwood City, CA");
    expect(lead.warmConnectionNotes).toMatch(/Autonomous Warehouse Robotics/);
    expect(lead.source).toBe("nsf_awards");
  });

  it("filters by location when provided", async () => {
    mockNsf([university, company]);
    const r = await nsfAwardsConnector.search({ keywords: ["robotics"], industries: [], location: "CA", limit: 10 });
    expect(r.leads).toHaveLength(1);
    expect(r.leads[0].companyName).toBe("Dexterity Robotics Inc");
  });

  it("dedupes on the PI email", async () => {
    mockNsf([company, { ...company, id: "3", title: "Another award same PI" }]);
    const r = await nsfAwardsConnector.search({ keywords: ["robotics"], industries: [], location: "", limit: 10 });
    expect(r.leads).toHaveLength(1);
  });
});
