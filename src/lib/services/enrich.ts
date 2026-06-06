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

// TODO: real verification. Wire a provider here and return a confidence/status.
// SMTP RCPT checks need port 25 (often blocked); prefer an HTTPS API:
//   Hunter: GET https://api.hunter.io/v2/email-verifier?email=&api_key=
//   NeverBounce / MillionVerifier: similar.
export async function verifyEmail(_email: string): Promise<{ verified: boolean; status: string }> {
  return { verified: false, status: "unverified (no verification provider configured)" };
}
