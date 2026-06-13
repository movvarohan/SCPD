import { describe, it, expect } from "vitest";
import { buildOutboundExtras } from "@/lib/services/attachments";
import { DEFAULT_SETTINGS, type OrgSettings } from "@/lib/services/settings";

const settings = (over: Partial<OrgSettings> = {}): OrgSettings => ({
  ...DEFAULT_SETTINGS,
  ...over,
});

describe("outbound email extras (CC + one-pager)", () => {
  it("attaches the one-pager on the FIRST email when enabled", async () => {
    const extras = await buildOutboundExtras(settings({ attachOnePager: true }), { initial: true });
    expect(extras.attachments).toHaveLength(1);
    expect(extras.attachments![0].filename).toBe(DEFAULT_SETTINGS.onePagerLabel);
    expect(extras.attachments![0].content.length).toBeGreaterThan(1000); // real PDF bytes
    expect(extras.attachments![0].contentType).toBe("application/pdf");
  });

  it("never attaches the one-pager on follow-ups", async () => {
    const extras = await buildOutboundExtras(settings({ attachOnePager: true }), { initial: false });
    expect(extras.attachments).toBeUndefined();
  });

  it("does not attach when the toggle is off", async () => {
    const extras = await buildOutboundExtras(settings({ attachOnePager: false }), { initial: true });
    expect(extras.attachments).toBeUndefined();
  });

  it("passes through trimmed CC addresses on every email", async () => {
    const extras = await buildOutboundExtras(
      settings({ ccEmails: [" a@x.com ", "b@y.com", ""] }),
      { initial: false }
    );
    expect(extras.cc).toEqual(["a@x.com", "b@y.com"]);
  });

  it("omits CC when none configured", async () => {
    const extras = await buildOutboundExtras(settings({ ccEmails: [] }), { initial: true });
    expect(extras.cc).toBeUndefined();
  });
});
