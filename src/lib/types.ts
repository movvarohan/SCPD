// Shared domain types and constants for the SC Sourcing Engine.

// --- Roles -----------------------------------------------------------------
export const ROLES = ["ADMIN", "PD", "REVIEWER"] as const;
export type Role = (typeof ROLES)[number];

// --- Lead lifecycle statuses ----------------------------------------------
export const LEAD_STATUSES = [
  "sourced",
  "enriched",
  "drafted",
  "needs_review",
  "approved",
  "ready_to_send",
  "sent",
  "follow_up_1_sent",
  "follow_up_2_sent",
  "replied",
  "booked",
  "assigned",
  "not_interested",
  "no_response",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<string, string> = {
  sourced: "Sourced",
  enriched: "Enriched",
  drafted: "Drafted",
  needs_review: "Needs Review",
  approved: "Approved",
  ready_to_send: "Ready to Send",
  sent: "Sent",
  follow_up_1_sent: "Follow-up 1 Sent",
  follow_up_2_sent: "Follow-up 2 Sent",
  replied: "Replied",
  booked: "Booked",
  assigned: "Assigned",
  not_interested: "Not Interested",
  no_response: "No Response",
};

// Manual status transitions exposed on the tracking page.
export const TRACKING_STATUSES: LeadStatus[] = [
  "ready_to_send",
  "sent",
  "follow_up_1_sent",
  "follow_up_2_sent",
  "replied",
  "booked",
  "not_interested",
  "no_response",
];

// --- Seniority -------------------------------------------------------------
export const SENIORITIES = [
  "founder",
  "c_suite",
  "vp",
  "director",
  "head",
  "manager",
  "ic",
  "other",
] as const;
export type Seniority = (typeof SENIORITIES)[number];

export const SENIORITY_LABELS: Record<string, string> = {
  founder: "Founder",
  c_suite: "C-Suite",
  vp: "VP",
  director: "Director",
  head: "Head",
  manager: "Manager",
  ic: "Individual Contributor",
  other: "Other",
};

// --- Company size ----------------------------------------------------------
export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+",
] as const;

// --- Warm connection -------------------------------------------------------
export const WARM_CONNECTION_TYPES = [
  "none",
  "alumni",
  "intro_available",
  "mutual",
  "prior_client",
] as const;
export const WARM_CONNECTION_LABELS: Record<string, string> = {
  none: "None",
  alumni: "Alumni",
  intro_available: "Intro Available",
  mutual: "Mutual Connection",
  prior_client: "Prior Client",
};

// --- Functional interests (PDs) -------------------------------------------
export const FUNCTIONS = [
  "strategy",
  "gtm",
  "product",
  "operations",
  "technical",
  "ai",
  "market_research",
] as const;
export type FunctionInterest = (typeof FUNCTIONS)[number];
export const FUNCTION_LABELS: Record<string, string> = {
  strategy: "Strategy",
  gtm: "Go-to-Market",
  product: "Product",
  operations: "Operations",
  technical: "Technical",
  ai: "AI",
  market_research: "Market Research",
};

export const AVAILABILITY_OPTIONS = [
  "high",
  "medium",
  "low",
  "unavailable",
] as const;

// --- Outreach -------------------------------------------------------------
export const OUTREACH_TYPES = [
  "stanford_alum",
  "founder_startup",
  "corporate_exec",
  "prior_client_warm",
  "cold_high_fit",
] as const;
export type OutreachType = (typeof OUTREACH_TYPES)[number];
export const OUTREACH_TYPE_LABELS: Record<string, string> = {
  stanford_alum: "Stanford Alum Outreach",
  founder_startup: "Founder / Startup Outreach",
  corporate_exec: "Corporate Executive Outreach",
  prior_client_warm: "Prior Client / Warm Intro",
  cold_high_fit: "Cold High-Fit Outreach",
};

export const OUTREACH_GOALS = [
  "intro_call",
  "explore_project",
  "reconnect",
  "follow_up_intro",
] as const;
export const OUTREACH_GOAL_LABELS: Record<string, string> = {
  intro_call: "Ask for a 15-minute intro call",
  explore_project: "Explore a potential project",
  reconnect: "Reconnect with alum",
  follow_up_intro: "Follow up on warm intro",
};

export const OUTREACH_TONES = [
  "concise",
  "warm",
  "professional",
  "student_written",
  "low_salesy",
] as const;

export const DRAFT_STATUSES = [
  "needs_review",
  "approved",
  "rejected",
  "ready_to_send",
  "sent",
] as const;

// --- Scoring ---------------------------------------------------------------
export interface ScoreBreakdownItem {
  key: string;
  label: string;
  weight: number;
  applied: boolean;
  reason: string;
}

export interface ScoreBreakdown {
  total: number;
  priority: "High" | "Medium" | "Low";
  items: ScoreBreakdownItem[];
}

// Priority thresholds applied to total score.
export const PRIORITY_THRESHOLDS = { high: 8, medium: 4 };

// --- Provider DTOs ---------------------------------------------------------
export interface SourcingCriteria {
  industries: string[];
  titles: string[];
  seniority: string[];
  companySize: string[];
  location: string;
  keywords: string[];
  stanfordPreference: boolean;
  limit: number;
}

// Loose lead shape returned by providers / parsed from CSV before persistence.
export interface RawLead {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  personalEmail?: string;
  workEmail?: string;
  linkedinUrl?: string;
  title?: string;
  seniority?: string;
  companyName?: string;
  companyWebsite?: string;
  industry?: string;
  location?: string;
  companySize?: string;
  source?: string;
  isStanfordAlum?: boolean;
  isSCAlum?: boolean;
  isFormerClient?: boolean;
  warmConnectionType?: string;
  warmConnectionNotes?: string;
  verifiedEmail?: boolean;
}

export type EnrichedLead = RawLead;
