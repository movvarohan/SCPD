// Pre-send email linting. Pure functions — no DB, no network — so every send
// path can run them cheaply and they're trivially testable.
//
// Two severities:
//   blockers — must never auto-send (e.g. an unresolved {{firstName}} token
//              would be visibly broken in the recipient's inbox). These force
//              the draft into the Review Queue.
//   warnings — hurt deliverability or polish but a human may overrule them.

export interface LintResult {
  blockers: string[];
  warnings: string[];
}

// Unresolved template tokens in any common syntax: {{name}}, {name}, [Name],
// <NAME>, %name%. The literal placeholder words below catch LLM slip-ups like
// "Hi FIRST_NAME," that no bracket regex would.
const TOKEN_PATTERNS = [
  /\{\{[^}]*\}\}/, // {{firstName}}
  /\{[a-z_ ]{2,30}\}/i, // {first name}
  /\[(?:first|last|full)?[\s_]?name\]/i, // [Name], [first name]
  /\[company(?:[\s_]name)?\]/i, // [Company]
  /%[a-z_]{2,30}%/i, // %first_name%
  /\b(?:FIRST|LAST|FULL)_?NAME\b/, // FIRST_NAME
  /\bCOMPANY_?NAME\b/,
  /\bINSERT[\s_][A-Z]/, // INSERT NAME / INSERT_HOOK
];

// Phrases spam filters weight heavily. Deliberately short — over-aggressive
// lists generate noise people learn to ignore.
const SPAM_PHRASES = [
  "act now",
  "100% free",
  "no obligation",
  "risk-free",
  "limited time offer",
  "click here",
  "make money fast",
  "winner",
  "guarantee",
  "once in a lifetime",
];

const MAX_SUBJECT_LENGTH = 78; // RFC-ish: longer gets clipped in most clients
const MAX_LINKS = 3;
const MIN_BODY_CHARS = 120;
const MAX_BODY_CHARS = 3500;

export function lintEmail(subject: string, body: string): LintResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const combined = `${subject}\n${body}`;

  // --- Blockers ---
  for (const pattern of TOKEN_PATTERNS) {
    const match = combined.match(pattern);
    if (match) {
      blockers.push(`Unresolved template token "${match[0]}" — would appear verbatim in the recipient's inbox.`);
      break; // one example is enough
    }
  }
  if (!subject.trim()) blockers.push("Subject line is empty.");
  if (!body.trim()) blockers.push("Email body is empty.");

  // --- Warnings ---
  const letters = subject.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 8 && letters === letters.toUpperCase()) {
    warnings.push("Subject is ALL CAPS — a classic spam signal.");
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    warnings.push(`Subject is ${subject.length} chars — most clients clip after ~${MAX_SUBJECT_LENGTH}.`);
  }

  const lower = combined.toLowerCase();
  const spamHits = SPAM_PHRASES.filter((p) => lower.includes(p));
  if (spamHits.length) {
    warnings.push(`Spam-trigger phrase${spamHits.length > 1 ? "s" : ""}: ${spamHits.map((p) => `"${p}"`).join(", ")}.`);
  }

  const links = body.match(/https?:\/\//g)?.length ?? 0;
  if (links > MAX_LINKS) {
    warnings.push(`${links} links — cold emails with more than ${MAX_LINKS} links get filtered more often.`);
  }

  const exclamations = combined.match(/!/g)?.length ?? 0;
  if (exclamations > 3) {
    warnings.push(`${exclamations} exclamation marks — tone it down for deliverability.`);
  }

  if (body.trim() && body.trim().length < MIN_BODY_CHARS) {
    warnings.push(`Body is only ${body.trim().length} chars — very short emails look automated.`);
  }
  if (body.length > MAX_BODY_CHARS) {
    warnings.push(`Body is ${body.length} chars — long cold emails get skimmed or skipped; aim under ${MAX_BODY_CHARS}.`);
  }

  return { blockers, warnings };
}
