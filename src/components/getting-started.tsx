import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface OnboardingState {
  teamInvited: boolean;
  llmReady: boolean;
  mailboxReady: boolean;
  hasLeads: boolean;
}

const STEPS: {
  key: keyof OnboardingState;
  title: string;
  desc: string;
  href: string;
  cta: string;
}[] = [
  {
    key: "teamInvited",
    title: "Invite your team",
    desc: "Add Reviewers and PDs from Settings → Team & invites.",
    href: "/settings",
    cta: "Open Settings",
  },
  {
    key: "mailboxReady",
    title: "Connect your Gmail",
    desc: "Until connected, sending is simulated. Use a Google App Password.",
    href: "/settings",
    cta: "Connect mailbox",
  },
  {
    key: "llmReady",
    title: "AI drafting & research",
    desc: "An Anthropic key powers outreach drafts, research, and the Help assistant.",
    href: "/settings",
    cta: "Check keys",
  },
  {
    key: "hasLeads",
    title: "Bring in your first leads",
    desc: "Import the alumni spreadsheet, or pull from Apollo and 10+ public data sources.",
    href: "/import",
    cta: "Import a CSV",
  },
];

// First-run checklist shown on the dashboard until the workspace has leads.
export function GettingStarted({ state }: { state: OnboardingState }) {
  const done = STEPS.filter((s) => state[s.key]).length;
  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cardinal-700 text-white">
              <Rocket className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Set up your workspace</div>
              <div className="text-xs text-slate-500">
                {done} of {STEPS.length} steps done — your pipeline fills in as you go.
              </div>
            </div>
          </div>
          <Link href="/help" className="text-[13px] font-medium text-cardinal-700 hover:underline">
            Questions? Ask the assistant →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s) => {
            const isDone = state[s.key];
            return (
              <Link
                key={s.key}
                href={s.href}
                className={cn(
                  "group rounded-lg border p-3.5 transition-colors",
                  isDone
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-200 bg-white hover:border-cardinal-300"
                )}
              >
                <div className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                  )}
                  <span className={cn("text-[13px] font-semibold", isDone ? "text-emerald-800" : "text-slate-800")}>
                    {s.title}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{s.desc}</p>
                {!isDone && (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cardinal-700">
                    {s.cta} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
