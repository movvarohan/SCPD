import fs from "node:fs";
import path from "node:path";
import type { EmailAttachment, SendOptions } from "@/lib/providers/email";
import type { OrgSettings } from "@/lib/services/settings";

// The committed one-pager lives in /public. On a normal server (local dev) we
// read it straight off disk; on serverless, where /public isn't on the function
// filesystem, we fetch it from the deployment's own public URL. The bytes are
// cached in memory after the first successful load.
const ONE_PAGER_PUBLIC_PATH = "attachments/sc-one-pager.pdf";
let cachedOnePager: Buffer | null = null;

function productionOrigin(): string {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, "");
  // Vercel sets this to the project's stable production domain.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function loadOnePager(): Promise<Buffer | null> {
  if (cachedOnePager) return cachedOnePager;

  // 1) Filesystem (works locally and anywhere /public is on disk).
  try {
    const p = path.join(process.cwd(), "public", ONE_PAGER_PUBLIC_PATH);
    const buf = await fs.promises.readFile(p);
    if (buf.length) { cachedOnePager = buf; return buf; }
  } catch {
    /* fall through to fetch */
  }

  // 2) Fetch from the deployment's public URL (serverless).
  try {
    const res = await fetch(`${productionOrigin()}/${ONE_PAGER_PUBLIC_PATH}`);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length) { cachedOnePager = buf; return buf; }
    }
  } catch {
    /* give up — caller sends without the attachment rather than failing */
  }
  return null;
}

// Build the CC + attachment extras for one outbound email. `initial` gates the
// one-pager so only first emails carry it (follow-ups don't re-attach it).
export async function buildOutboundExtras(
  settings: OrgSettings,
  opts: { initial: boolean }
): Promise<SendOptions> {
  const cc = (settings.ccEmails ?? []).map((e) => e.trim()).filter(Boolean);
  const attachments: EmailAttachment[] = [];

  if (opts.initial && settings.attachOnePager) {
    const pdf = await loadOnePager();
    if (pdf) {
      attachments.push({
        filename: settings.onePagerLabel || "Stanford Consulting — Overview.pdf",
        content: pdf,
        contentType: "application/pdf",
      });
    }
  }

  return { cc: cc.length ? cc : undefined, attachments: attachments.length ? attachments : undefined };
}
