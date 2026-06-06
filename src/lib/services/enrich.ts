// Email enrichment for leads that have a name + company domain but no email
// (the case for every public-source connector). We derive the company domain
// and generate the most common professional email pattern. These are GUESSES,
// marked unverified — the UI warns before sending. Plug a verification API
// (Hunter, NeverBounce, MillionVerifier) into verifyEmail() later.

export function domainFromWebsite(website?: string | null): string | null {
  if (!website) return null;
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    // Skip aggregator/social hosts that aren't a company's own domain.
    if (/(angel\.co|crunchbase|linkedin|facebook|twitter|x\.com|github|ycombinator)/.test(host)) return null;
    return host || null;
  } catch {
    return null;
  }
}

function clean(s?: string | null): string {
  return (s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");
}

export interface EmailGuess {
  email: string;
  pattern: string;
  candidates: string[];
}

// Generate the primary guess (first.last@domain) plus common alternates.
export function guessEmail(
  firstName?: string | null,
  lastName?: string | null,
  domain?: string | null
): EmailGuess | null {
  const f = clean(firstName);
  const l = clean(lastName);
  const d = (domain ?? "").trim().toLowerCase();
  if (!d || (!f && !l)) return null;

  const candidates: string[] = [];
  if (f && l) {
    candidates.push(`${f}.${l}@${d}`);
    candidates.push(`${f}${l}@${d}`);
    candidates.push(`${f[0]}${l}@${d}`);
    candidates.push(`${f}@${d}`);
    candidates.push(`${f}_${l}@${d}`);
    candidates.push(`${l}${f[0]}@${d}`);
  } else if (f) {
    candidates.push(`${f}@${d}`);
  } else if (l) {
    candidates.push(`${l}@${d}`);
  }

  const primary = candidates[0];
  const pattern = f && l ? "first.last@domain" : f ? "first@domain" : "last@domain";
  return { email: primary, pattern, candidates };
}

// --- Hunter.io email find + verify (HTTPS, works anywhere) ----------------
import { getIntegrations } from "@/lib/credentials";

export interface EnrichedEmail {
  email: string;
  verified: boolean;
  status: string;
  score?: number;
  source: "hunter" | "guessed";
}

// Find a real email for a person at a domain. Uses Hunter when a key is
// present (real lookup), otherwise returns the best-guess pattern (unverified).
export async function enrichEmail(
  firstName?: string | null,
  lastName?: string | null,
  domain?: string | null
): Promise<EnrichedEmail | null> {
  const d = (domain ?? "").trim().toLowerCase();
  if (!d) return null;
  const { hunterApiKey } = await getIntegrations();

  if (hunterApiKey.trim() && firstName && lastName) {
    try {
      const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(d)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${encodeURIComponent(hunterApiKey.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as { data?: { email?: string; score?: number; verification?: { status?: string } } };
        const email = json.data?.email;
        if (email) {
          const score = json.data?.score;
          const status = json.data?.verification?.status ?? (score && score >= 80 ? "likely" : "uncertain");
          return { email, verified: status === "valid" || (score ?? 0) >= 90, status: `hunter:${status}`, score, source: "hunter" };
        }
      }
      // Fall through to guess on non-OK / no email.
    } catch {
      /* fall back to guess */
    }
  }

  const g = guessEmail(firstName, lastName, d);
  if (!g) return null;
  return { email: g.email, verified: false, status: `guessed (${g.pattern})`, source: "guessed" };
}

// Verify an existing email via Hunter when configured.
export async function verifyEmail(email: string): Promise<{ verified: boolean; status: string; score?: number }> {
  const { hunterApiKey } = await getIntegrations();
  if (!hunterApiKey.trim()) return { verified: false, status: "unverified (no provider configured)" };
  try {
    const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${encodeURIComponent(hunterApiKey.trim())}`;
    const res = await fetch(url);
    if (!res.ok) return { verified: false, status: `hunter error ${res.status}` };
    const json = (await res.json()) as { data?: { status?: string; score?: number } };
    const status = json.data?.status ?? "unknown";
    return { verified: status === "valid", status: `hunter:${status}`, score: json.data?.score };
  } catch (e) {
    return { verified: false, status: `error: ${(e as Error).message.slice(0, 80)}` };
  }
}

export function hunterStatus(key: string): { configured: boolean; mode: string } {
  return key.trim() ? { configured: true, mode: "hunter (find + verify)" } : { configured: false, mode: "pattern guess (unverified)" };
}
