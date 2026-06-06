"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save, Plug, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Label, Badge,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  saveCredentials, testLLM, testApollo, testEmail, testHunter,
} from "@/server/actions/integrations";

// Non-secret current values + presence flags for secrets.
export interface CredentialsView {
  llmProvider: string;
  anthropicModel: string;
  openaiModel: string;
  emailProvider: string;
  gmailUser: string;
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
  mailFromName: string;
  has: { anthropic: boolean; openai: boolean; apollo: boolean; clay: boolean; hunter: boolean; gmailPassword: boolean };
}

type TestState = { ok: boolean; message: string } | "loading" | null;

export function CredentialsPanel({ view }: { view: CredentialsView }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = React.useTransition();

  const [llmProvider, setLlmProvider] = React.useState(view.llmProvider);
  const [anthropicKey, setAnthropicKey] = React.useState("");
  const [anthropicModel, setAnthropicModel] = React.useState(view.anthropicModel);
  const [openaiKey, setOpenaiKey] = React.useState("");
  const [apolloKey, setApolloKey] = React.useState("");
  const [hunterKey, setHunterKey] = React.useState("");
  const [emailProvider, setEmailProvider] = React.useState(view.emailProvider);
  const [gmailUser, setGmailUser] = React.useState(view.gmailUser);
  const [gmailPassword, setGmailPassword] = React.useState("");
  const [smtpHost, setSmtpHost] = React.useState(view.smtpHost);
  const [smtpPort, setSmtpPort] = React.useState(view.smtpPort);
  const [imapHost, setImapHost] = React.useState(view.imapHost);
  const [imapPort, setImapPort] = React.useState(view.imapPort);
  const [mailFromName, setMailFromName] = React.useState(view.mailFromName);

  const [llmTest, setLlmTest] = React.useState<TestState>(null);
  const [apolloTest, setApolloTest] = React.useState<TestState>(null);
  const [hunterTest, setHunterTest] = React.useState<TestState>(null);
  const [emailTest, setEmailTest] = React.useState<TestState>(null);

  function save(after?: () => void) {
    start(async () => {
      await saveCredentials({
        llmProvider: llmProvider as never,
        anthropicApiKey: anthropicKey,
        anthropicModel,
        openaiApiKey: openaiKey,
        openaiModel: view.openaiModel,
        apolloApiKey: apolloKey,
        hunterApiKey: hunterKey,
        emailProvider: emailProvider as never,
        gmailUser,
        gmailAppPassword: gmailPassword,
        smtpHost, smtpPort: Number(smtpPort),
        imapHost, imapPort: Number(imapPort),
        mailFromName,
      });
      // Clear secret inputs after save (they're persisted server-side).
      setAnthropicKey(""); setOpenaiKey(""); setApolloKey(""); setHunterKey(""); setGmailPassword("");
      toast("Credentials saved.", "success");
      router.refresh();
      after?.();
    });
  }

  function runTest(
    fn: () => Promise<{ ok: boolean; message: string }>,
    setter: (s: TestState) => void
  ) {
    setter("loading");
    // Save first so the test uses the latest values.
    save(async () => {
      const res = await fn();
      setter(res);
      toast(res.message, res.ok ? "success" : "error");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle><span className="inline-flex items-center gap-1.5"><KeyRound className="h-4 w-4" /> API keys & mailbox</span></CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">
          Paste keys here to store them in the database (overrides <code className="rounded bg-white px-1">.env</code>). Leave a secret field blank to keep the current value. Secrets are never sent back to the browser.
        </p>

        {/* LLM */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">LLM — email generation</h4>
            <TestBadge state={llmTest} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <Label>Provider</Label>
              <Select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)} className="mt-1">
                <option value="mock">Mock (offline)</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </Select>
            </div>
            <div>
              <Label>Anthropic key {view.has.anthropic && <SetTag />}</Label>
              <Input type="password" value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} placeholder={view.has.anthropic ? "•••• saved" : "sk-ant-…"} className="mt-1" />
            </div>
            <div>
              <Label>Anthropic model</Label>
              <Input value={anthropicModel} onChange={(e) => setAnthropicModel(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>OpenAI key {view.has.openai && <SetTag />}</Label>
              <Input type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder={view.has.openai ? "•••• saved" : "sk-…"} className="mt-1" />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => runTest(testLLM, setLlmTest)} disabled={pending}>
            <Plug className="h-3.5 w-3.5" /> Save & test LLM
          </Button>
        </section>

        {/* Apollo */}
        <section className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Apollo — lead sourcing</h4>
            <TestBadge state={apolloTest} />
          </div>
          <div>
            <Label>Apollo API key {view.has.apollo && <SetTag />}</Label>
            <Input type="password" value={apolloKey} onChange={(e) => setApolloKey(e.target.value)} placeholder={view.has.apollo ? "•••• saved" : "Apollo key"} className="mt-1 max-w-md" />
          </div>
          <Button variant="outline" size="sm" onClick={() => runTest(testApollo, setApolloTest)} disabled={pending}>
            <Plug className="h-3.5 w-3.5" /> Save & test Apollo
          </Button>
        </section>

        {/* Hunter — email find/verify */}
        <section className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Hunter — email find & verify (enrichment)</h4>
            <TestBadge state={hunterTest} />
          </div>
          <div>
            <Label>Hunter API key {view.has.hunter && <SetTag />}</Label>
            <Input type="password" value={hunterKey} onChange={(e) => setHunterKey(e.target.value)} placeholder={view.has.hunter ? "•••• saved" : "Hunter.io key (free tier)"} className="mt-1 max-w-md" />
            <p className="mt-1 text-xs text-slate-500">With a key, &quot;Enrich missing emails&quot; finds + verifies real emails. Without one, it falls back to pattern guesses (unverified).</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => runTest(testHunter, setHunterTest)} disabled={pending}>
            <Plug className="h-3.5 w-3.5" /> Save & test Hunter
          </Button>
        </section>

        {/* Email */}
        <section className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Mailbox — sending & replies</h4>
            <TestBadge state={emailTest} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <Label>Provider</Label>
              <Select value={emailProvider} onChange={(e) => setEmailProvider(e.target.value)} className="mt-1">
                <option value="mock">Mock (no real send)</option>
                <option value="gmail_smtp">Gmail App Password (SMTP + IMAP)</option>
              </Select>
            </div>
            <div>
              <Label>From display name</Label>
              <Input value={mailFromName} onChange={(e) => setMailFromName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Gmail address</Label>
              <Input value={gmailUser} onChange={(e) => setGmailUser(e.target.value)} placeholder="you@gmail.com" className="mt-1" />
            </div>
            <div>
              <Label>Gmail App Password {view.has.gmailPassword && <SetTag />}</Label>
              <Input type="password" value={gmailPassword} onChange={(e) => setGmailPassword(e.target.value)} placeholder={view.has.gmailPassword ? "•••• saved" : "16-char app password"} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>SMTP host</Label><Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="mt-1" /></div>
              <div><Label>SMTP port</Label><Input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>IMAP host</Label><Input value={imapHost} onChange={(e) => setImapHost(e.target.value)} className="mt-1" /></div>
              <div><Label>IMAP port</Label><Input type="number" value={imapPort} onChange={(e) => setImapPort(Number(e.target.value))} className="mt-1" /></div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Create an App Password at{" "}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-cardinal-700 hover:underline">myaccount.google.com/apppasswords</a>{" "}
            (requires 2-Step Verification). Emails send as <span className="font-medium">you</span>; replies arrive in your inbox and sync back here.
          </p>
          <Button variant="outline" size="sm" onClick={() => runTest(testEmail, setEmailTest)} disabled={pending}>
            <Plug className="h-3.5 w-3.5" /> Save & test mailbox
          </Button>
        </section>

        <div className="border-t border-slate-100 pt-4">
          <Button onClick={() => save()} disabled={pending}><Save className="h-4 w-4" /> Save all credentials</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SetTag() {
  return <Badge tone="green" className="ml-1 align-middle">saved</Badge>;
}

function TestBadge({ state }: { state: TestState }) {
  if (state === null) return null;
  if (state === "loading")
    return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> testing…</span>;
  return state.ok ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> connected</span>
  ) : (
    <span className="inline-flex max-w-xs items-center gap-1 truncate text-xs text-red-600" title={state.message}><XCircle className="h-3.5 w-3.5" /> failed</span>
  );
}
