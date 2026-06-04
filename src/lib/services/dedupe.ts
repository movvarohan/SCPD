import type { RawLead } from "@/lib/types";
import {
  normalizeEmail,
  normalizeLinkedin,
  normalizeText,
} from "@/lib/utils";

// A minimal lead shape used for dedupe matching against existing DB rows.
export interface DedupeKey {
  email?: string | null;
  workEmail?: string | null;
  personalEmail?: string | null;
  linkedinUrl?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
}

export interface DedupeIndex {
  emails: Set<string>;
  linkedins: Set<string>;
  nameCompany: Set<string>;
}

export function buildDedupeIndex(existing: DedupeKey[]): DedupeIndex {
  const emails = new Set<string>();
  const linkedins = new Set<string>();
  const nameCompany = new Set<string>();
  for (const e of existing) {
    for (const em of emailsOf(e)) emails.add(em);
    const li = normalizeLinkedin(e.linkedinUrl);
    if (li) linkedins.add(li);
    const nc = nameCompanyKey(e);
    if (nc) nameCompany.add(nc);
  }
  return { emails, linkedins, nameCompany };
}

function emailsOf(lead: DedupeKey): string[] {
  return [lead.email, lead.workEmail, lead.personalEmail]
    .map(normalizeEmail)
    .filter(Boolean);
}

function fullNameOf(lead: DedupeKey): string {
  if (lead.fullName) return lead.fullName;
  return [lead.firstName, lead.lastName].filter(Boolean).join(" ");
}

function nameCompanyKey(lead: DedupeKey): string {
  const name = normalizeText(fullNameOf(lead));
  const company = normalizeText(lead.companyName);
  if (!name || !company) return "";
  return `${name}|${company}`;
}

export type DuplicateReason =
  | "email"
  | "linkedin"
  | "name_company"
  | "within_batch";

export interface DedupeResult<T extends RawLead> {
  unique: T[];
  duplicates: { lead: T; reason: DuplicateReason }[];
}

// Dedupe a batch against an existing index AND within itself.
export function dedupeLeads<T extends RawLead>(
  leads: T[],
  index: DedupeIndex
): DedupeResult<T> {
  const unique: T[] = [];
  const duplicates: { lead: T; reason: DuplicateReason }[] = [];

  // Track keys seen within this batch.
  const seenEmails = new Set<string>(index.emails);
  const seenLinkedins = new Set<string>(index.linkedins);
  const seenNameCompany = new Set<string>(index.nameCompany);

  for (const lead of leads) {
    const leadEmails = emailsOf(lead);
    const li = normalizeLinkedin(lead.linkedinUrl);
    const nc = nameCompanyKey(lead);

    // Primary: email
    const emailDup = leadEmails.find((e) => seenEmails.has(e));
    if (emailDup) {
      duplicates.push({ lead, reason: "email" });
      continue;
    }
    // Secondary: linkedin
    if (li && seenLinkedins.has(li)) {
      duplicates.push({ lead, reason: "linkedin" });
      continue;
    }
    // Tertiary: name + company
    if (nc && seenNameCompany.has(nc)) {
      duplicates.push({ lead, reason: "name_company" });
      continue;
    }

    // Unique — record its keys so later rows in the batch dedupe against it.
    unique.push(lead);
    leadEmails.forEach((e) => seenEmails.add(e));
    if (li) seenLinkedins.add(li);
    if (nc) seenNameCompany.add(nc);
  }

  return { unique, duplicates };
}

export const DUPLICATE_REASON_LABELS: Record<DuplicateReason, string> = {
  email: "Duplicate email",
  linkedin: "Duplicate LinkedIn",
  name_company: "Duplicate name + company",
  within_batch: "Duplicate within file",
};
