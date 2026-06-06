import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { CredentialsPanel } from "@/components/credentials-panel";
import { db } from "@/lib/db";
import { getOrgSettings } from "@/lib/services/settings";
import { getIntegrations } from "@/lib/credentials";
import { llmStatus } from "@/lib/providers/llm";
import { apolloStatus } from "@/lib/providers/apollo";
import { clayStatus } from "@/lib/providers/clay";
import { emailStatus } from "@/lib/providers/email";

export const dynamic = "force-dynamic";

const PERMISSIONS = [
  {
    role: "ADMIN",
    abilities: [
      "Import alumni & lead CSVs", "Source leads (Apollo/Clay)",
      "Configure scoring rules", "Approve & mark emails ready",
      "Assign leads to PDs", "View full dashboard & settings",
    ],
  },
  {
    role: "REVIEWER",
    abilities: ["Review generated emails", "Approve, reject, edit & regenerate drafts", "Mark drafts ready to send"],
  },
  {
    role: "PD",
    abilities: ["View assigned leads", "Update lead status & notes", "Manage own availability & interests"],
  },
];

export default async function SettingsPage() {
  const [settings, templates] = await Promise.all([
    getOrgSettings(),
    db.emailTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  const [llm, apollo, clay, email, integ] = await Promise.all([
    llmStatus(), apolloStatus(), clayStatus(), emailStatus(), getIntegrations(),
  ]);

  const credentialsView = {
    llmProvider: integ.llmProvider,
    anthropicModel: integ.anthropicModel,
    openaiModel: integ.openaiModel,
    emailProvider: integ.emailProvider,
    gmailUser: integ.gmailUser,
    smtpHost: integ.smtpHost,
    smtpPort: integ.smtpPort,
    imapHost: integ.imapHost,
    imapPort: integ.imapPort,
    mailFromName: integ.mailFromName,
    has: {
      anthropic: Boolean(integ.anthropicApiKey),
      openai: Boolean(integ.openaiApiKey),
      apollo: Boolean(integ.apolloApiKey),
      clay: Boolean(integ.clayApiKey),
      hunter: Boolean(integ.hunterApiKey),
      sam: Boolean(integ.samApiKey),
      tavily: Boolean(integ.tavilyApiKey),
      gmailPassword: Boolean(integ.gmailAppPassword),
    },
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your organization, outreach guardrails, scoring, templates, and integration keys."
      />
      <SettingsForm
        settings={settings}
        templates={templates.map((t) => ({
          id: t.id, name: t.name, type: t.type,
          subjectTemplate: t.subjectTemplate, bodyTemplate: t.bodyTemplate,
          followUp1Template: t.followUp1Template, followUp2Template: t.followUp2Template,
          enabled: t.enabled,
        }))}
        providers={[
          { name: "LLM (email generation)", configured: llm.configured, mode: llm.mode },
          { name: "Apollo (sourcing)", configured: apollo.configured, mode: apollo.mode },
          { name: "Clay (enrichment)", configured: clay.configured, mode: clay.mode },
          { name: "Hunter (email find/verify)", configured: Boolean(integ.hunterApiKey), mode: integ.hunterApiKey ? "hunter" : "pattern guess" },
          { name: "Research (web search)", configured: Boolean(integ.tavilyApiKey), mode: integ.tavilyApiKey ? "website + Tavily" : "website only" },
          { name: "Email (sending)", configured: email.configured, mode: email.mode },
        ]}
        permissions={PERMISSIONS}
      />
      <div className="mt-4">
        <CredentialsPanel view={credentialsView} />
      </div>
    </div>
  );
}
