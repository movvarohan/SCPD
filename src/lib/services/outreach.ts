import type { Lead } from "@prisma/client";
import {
  getLLMProvider,
  llmIsLive,
  OUTREACH_SYSTEM_PROMPT,
} from "@/lib/providers/llm";
import {
  OUTREACH_GOAL_LABELS,
  type OutreachType,
} from "@/lib/types";
import { fullNameOf } from "@/lib/utils";
import { decodeJson } from "@/lib/serialization";
import type { ResearchResult } from "@/lib/services/research";

export interface OutreachInput {
  senderName: string;
  senderRole: string;
  type: OutreachType;
  goal: string;
  tone: string;
  orgName: string;
  orgDescription: string;
  signature: string;
  allowedClaims: string;
}

export interface GeneratedOutreach {
  subject: string;
  body: string;
  followUp1: string;
  followUp2: string;
  personalizationNote: string;
  confidenceScore: number;
  warnings: string[];
}

// Identify which lead facts are missing — drives warnings + confidence.
function missingDataWarnings(lead: Lead): string[] {
  const warnings: string[] = [];
  if (!lead.firstName && !lead.fullName) warnings.push("No first name available — greeting will be generic.");
  if (!lead.title) warnings.push("No title on file — role-specific framing is weak.");
  if (!lead.companyName) warnings.push("No company name — company reference omitted.");
  if (!lead.industry) warnings.push("No industry — fit reasoning is generic.");
  const hasEmail = lead.email || lead.workEmail || lead.personalEmail;
  if (!hasEmail) warnings.push("No email address — cannot send without one.");
  if (!lead.verifiedEmail && hasEmail) warnings.push("Email is unverified.");
  return warnings;
}

function confidenceFrom(lead: Lead, warnings: string[]): number {
  let score = 90;
  score -= warnings.length * 12;
  if (lead.isStanfordAlum || lead.isSCAlum) score += 5;
  if (lead.warmConnectionType && lead.warmConnectionType !== "none") score += 5;
  return Math.max(20, Math.min(99, score));
}

// The single, truthful "reason for reaching out" used in every channel.
function reasonForReaching(lead: Lead, input: OutreachInput): string {
  if (lead.isSCAlum) return `as a fellow ${input.orgName} member`;
  if (lead.isStanfordAlum) return "as a fellow member of the Stanford community";
  if (lead.warmConnectionType === "prior_client" || lead.isFormerClient)
    return `given ${input.orgName}'s prior work together`;
  if (lead.warmConnectionType === "intro_available")
    return "after a mutual connection suggested we connect";
  if (lead.industry)
    return `because we're focused on ${lead.industry} this quarter`;
  if (lead.companyName) return `because of the work happening at ${lead.companyName}`;
  return "to learn more about your work";
}

// --- Deterministic template generation (mock / offline) --------------------
function templateGenerate(lead: Lead, input: OutreachInput, research?: ResearchResult | null): GeneratedOutreach {
  const first = lead.firstName || (lead.fullName ? lead.fullName.split(" ")[0] : "there");
  const company = lead.companyName ? ` at ${lead.companyName}` : "";
  // Prefer a grounded research hook as the reason for reaching out when present.
  const reason = research?.hook
    ? `because ${research.hook.replace(/^because\s+/i, "").replace(/[.]+$/, "")}`
    : reasonForReaching(lead, input);
  const goalLabel = OUTREACH_GOAL_LABELS[input.goal] || "a short intro call";
  const ask =
    input.goal === "explore_project"
      ? "I'd love to find 15 minutes to explore whether there's a project we could help with."
      : input.goal === "reconnect"
        ? "I'd love to reconnect over a quick 15-minute call."
        : input.goal === "follow_up_intro"
          ? "Following up on the intro — would you be open to a quick 15-minute call?"
          : "Would you be open to a quick 15-minute call?";

  const orgLine = `I'm ${input.senderName}, ${input.senderRole} at ${input.orgName}. ${input.orgDescription}`;

  const subjectMap: Record<OutreachType, string> = {
    stanford_alum: `Stanford Consulting — quick hello${lead.companyName ? ` re: ${lead.companyName}` : ""}`,
    founder_startup: `${input.orgName} x ${lead.companyName || "your team"}`,
    corporate_exec: `Intro from ${input.orgName}`,
    prior_client_warm: `Reconnecting — ${input.orgName}`,
    cold_high_fit: `${input.orgName} — ${lead.industry || "your work"}`,
  };

  const body = [
    `Hi ${first},`,
    "",
    `${orgLine}`,
    "",
    `I'm reaching out ${reason}${company ? ` and the work${company}` : ""}. ${ask}`,
    "",
    `No worries at all if the timing isn't right.`,
    "",
    input.signature || `Best,\n${input.senderName}\n${input.orgName}`,
  ].join("\n");

  const followUp1 = [
    `Hi ${first},`,
    "",
    `Just floating this back to the top of your inbox — would a quick 15-minute call work in the next week or two?`,
    "",
    `Happy to work around your schedule.`,
    "",
    input.signature || `Best,\n${input.senderName}`,
  ].join("\n");

  const followUp2 = [
    `Hi ${first},`,
    "",
    `I'll close the loop here so I'm not cluttering your inbox. If exploring how ${input.orgName} might help${company} is ever useful, I'm one reply away.`,
    "",
    input.signature || `Best,\n${input.senderName}`,
  ].join("\n");

  const personalizationNote = [
    research?.hook ? `Researched hook: ${research.hook}` : "",
    lead.industry ? `Industry: ${lead.industry}.` : "",
    lead.title ? `Role: ${lead.title}.` : "",
    lead.isStanfordAlum || lead.isSCAlum ? "Alumni connection used as the opener." : "",
    lead.warmConnectionType && lead.warmConnectionType !== "none"
      ? `Warm connection: ${lead.warmConnectionType}.`
      : "",
    `Goal: ${goalLabel}. Tone: ${input.tone}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const warnings = missingDataWarnings(lead);
  if (!research || research.groundedBy === "none") {
    warnings.push("No grounded research yet — run Research on the lead for a specific, verifiable hook.");
  }

  return {
    subject: subjectMap[input.type] || subjectMap.cold_high_fit,
    body,
    followUp1,
    followUp2,
    personalizationNote,
    confidenceScore: confidenceFrom(lead, warnings),
    warnings,
  };
}

// --- LLM generation (when a real provider is configured) -------------------
async function llmGenerate(lead: Lead, input: OutreachInput, research?: ResearchResult | null): Promise<GeneratedOutreach> {
  const llm = await getLLMProvider();
  const facts = {
    name: fullNameOf(lead),
    firstName: lead.firstName,
    title: lead.title,
    company: lead.companyName,
    industry: lead.industry,
    location: lead.location,
    isStanfordAlum: lead.isStanfordAlum,
    isSCAlum: lead.isSCAlum,
    isFormerClient: lead.isFormerClient,
    warmConnectionType: lead.warmConnectionType,
    warmConnectionNotes: lead.warmConnectionNotes,
  };

  const researchBlock = research && research.groundedBy !== "none"
    ? `\nGROUNDED RESEARCH (from the company's public website/news — you MAY reference ONE specific detail from here, but do not exaggerate or invent beyond it):
- Summary: ${research.summary || "n/a"}
- Signals: ${research.signals.length ? research.signals.join("; ") : "none"}
- Suggested hook: ${research.hook || "none"}\n`
    : "\nGROUNDED RESEARCH: none available — do not fabricate any company-specific detail.\n";

  const userPrompt = `Generate outreach for this lead. Use ONLY these facts + the grounded research (omit anything missing, never invent):
${JSON.stringify(facts, null, 2)}
${researchBlock}
Sender: ${input.senderName}, ${input.senderRole}
Organization: ${input.orgName} — ${input.orgDescription}
Allowed claims about the org (do not exceed these): ${input.allowedClaims || "none beyond the description"}
Signature to use: ${input.signature || `Best, ${input.senderName}, ${input.orgName}`}
Email type: ${input.type}
Goal: ${OUTREACH_GOAL_LABELS[input.goal] || input.goal}
Tone: ${input.tone}

Return STRICT JSON with this exact shape:
{
  "subject": string,
  "body": string,            // the first email, 3-6 sentences, includes greeting + signature
  "followUp1": string,       // short follow-up email
  "followUp2": string,       // short final follow-up email
  "personalizationNote": string, // one line: what personalization was used
  "confidenceScore": number, // 0-100
  "warnings": string[]       // any weak/missing facts
}`;

  const raw = await llm.complete(
    [
      { role: "system", content: OUTREACH_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    { json: true }
  );

  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as GeneratedOutreach;
    // Always merge in our own deterministic warnings so nothing is missed.
    const ownWarnings = missingDataWarnings(lead);
    const warnings = Array.from(
      new Set([...(parsed.warnings || []), ...ownWarnings])
    );
    return { ...parsed, warnings };
  } catch {
    // If the model returns malformed JSON, fall back to templates.
    return templateGenerate(lead, input, research);
  }
}

export async function generateOutreach(
  lead: Lead,
  input: OutreachInput
): Promise<GeneratedOutreach> {
  // Decode any grounded research stored on the lead and feed it in.
  const research = decodeJson<ResearchResult | null>(
    (lead as Lead & { researchJson?: string }).researchJson ?? "",
    null
  );

  if (await llmIsLive()) {
    try {
      return await llmGenerate(lead, input, research);
    } catch (err) {
      // If the live LLM call fails (rate limit, network), fall back to templates
      // with a warning rather than failing the whole generation.
      const base = templateGenerate(lead, input, research);
      return {
        ...base,
        warnings: [
          `LLM generation failed, used template fallback: ${(err as Error).message.slice(0, 140)}`,
          ...base.warnings,
        ],
      };
    }
  }
  return templateGenerate(lead, input, research);
}
