import type { RawLead } from "@/lib/types";

// Internal fields a CSV column can map to.
export const INTERNAL_FIELDS = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "fullName", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "personalEmail", label: "Personal Email" },
  { key: "workEmail", label: "Work Email" },
  { key: "linkedinUrl", label: "LinkedIn URL" },
  { key: "title", label: "Title / Role" },
  { key: "companyName", label: "Company" },
  { key: "companyWebsite", label: "Company Website" },
  { key: "industry", label: "Industry" },
  { key: "location", label: "Location" },
  { key: "companySize", label: "Company Size" },
  { key: "seniority", label: "Seniority" },
  { key: "graduationYear", label: "Graduation / Class Year" },
  { key: "scRole", label: "SC Role" },
  { key: "warmConnectionNotes", label: "Notes" },
] as const;

export type InternalFieldKey = (typeof INTERNAL_FIELDS)[number]["key"];

// Synonyms used for auto-detecting a column's target field.
const FIELD_SYNONYMS: Record<InternalFieldKey, string[]> = {
  firstName: ["first name", "firstname", "first", "given name", "fname"],
  lastName: ["last name", "lastname", "last", "surname", "family name", "lname"],
  fullName: ["full name", "fullname", "name", "contact name", "contact"],
  email: ["email", "email address", "e-mail", "primary email"],
  personalEmail: ["personal email", "personal e-mail", "home email"],
  workEmail: ["work email", "work e-mail", "business email", "company email"],
  linkedinUrl: ["linkedin", "linkedin url", "linkedin profile", "li url", "linkedin link"],
  title: ["title", "job title", "current role", "role", "position", "current title"],
  companyName: ["company", "current company", "employer", "organization", "org", "company name"],
  companyWebsite: ["website", "company website", "domain", "company domain", "url"],
  industry: ["industry", "sector", "vertical"],
  location: ["location", "city", "region", "geo", "country", "address"],
  companySize: ["company size", "size", "headcount", "employees", "num employees"],
  seniority: ["seniority", "level", "seniority level"],
  graduationYear: ["graduation year", "class year", "grad year", "class", "year", "cohort"],
  scRole: ["sc role", "stanford consulting role", "club role", "role at sc"],
  warmConnectionNotes: ["notes", "note", "comments", "remarks", "context"],
};

export function autoDetectMapping(headers: string[]): Record<string, InternalFieldKey | ""> {
  const mapping: Record<string, InternalFieldKey | ""> = {};
  const used = new Set<InternalFieldKey>();
  for (const header of headers) {
    const normalized = header.trim().toLowerCase();
    let best: InternalFieldKey | "" = "";
    // Exact synonym match first.
    for (const field of INTERNAL_FIELDS) {
      const syns = FIELD_SYNONYMS[field.key];
      if (syns.includes(normalized) && !used.has(field.key)) {
        best = field.key;
        break;
      }
    }
    // Partial / contains match next.
    if (!best) {
      for (const field of INTERNAL_FIELDS) {
        if (used.has(field.key)) continue;
        const syns = FIELD_SYNONYMS[field.key];
        if (syns.some((s) => normalized.includes(s) || s.includes(normalized))) {
          best = field.key;
          break;
        }
      }
    }
    if (best) used.add(best);
    mapping[header] = best;
  }
  return mapping;
}

// Apply a column->field mapping to a parsed CSV row, producing a RawLead.
export function mapRowToLead(
  row: Record<string, string>,
  mapping: Record<string, InternalFieldKey | "">,
  source: string
): RawLead {
  const lead: RawLead = { source };
  const extras: string[] = [];

  for (const [column, value] of Object.entries(row)) {
    const field = mapping[column];
    const v = (value ?? "").trim();
    if (!v) continue;
    switch (field) {
      case "firstName":
      case "lastName":
      case "fullName":
      case "email":
      case "personalEmail":
      case "workEmail":
      case "linkedinUrl":
      case "title":
      case "companyName":
      case "companyWebsite":
      case "industry":
      case "location":
      case "companySize":
      case "seniority":
        (lead as Record<string, string>)[field] = v;
        break;
      case "graduationYear":
        extras.push(`Class year: ${v}`);
        break;
      case "scRole":
        extras.push(`SC role: ${v}`);
        lead.isSCAlum = true;
        break;
      case "warmConnectionNotes":
        extras.push(v);
        break;
      default:
        // Unmapped column — ignore.
        break;
    }
  }

  if (extras.length) {
    lead.warmConnectionNotes = [lead.warmConnectionNotes, ...extras]
      .filter(Boolean)
      .join(" | ");
  }

  // Derive full name if missing.
  if (!lead.fullName && (lead.firstName || lead.lastName)) {
    lead.fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
  }
  // Pick a primary email if only work/personal provided.
  if (!lead.email) lead.email = lead.workEmail || lead.personalEmail;
  if (lead.email) lead.verifiedEmail = false;

  return lead;
}

// Basic per-row validation for the import preview.
export function validateLead(lead: RawLead): string[] {
  const errors: string[] = [];
  const hasName = lead.fullName || lead.firstName || lead.lastName;
  if (!hasName) errors.push("Missing name");
  const hasContact = lead.email || lead.workEmail || lead.personalEmail || lead.linkedinUrl;
  if (!hasContact) errors.push("No email or LinkedIn");
  return errors;
}
