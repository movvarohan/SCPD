"use client";

import * as React from "react";
import { Send, LifeBuoy, Sparkles } from "lucide-react";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "How do I invite a teammate?",
  "How do I connect Gmail so emails actually send?",
  "Why are my sourced leads missing emails?",
  "How does auto-send decide what to send?",
  "How do follow-ups work, and what stops them?",
  "What do I do with a draft that has warnings?",
];

export function HelpChat({ firstName, live }: { firstName: string; live: boolean }) {
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: "assistant",
      content: `Hi ${firstName} — I'm the built-in assistant for the SC Sourcing Engine. Ask me anything: getting started, inviting your team, connecting Gmail or API keys, how auto-send and follow-ups behave, or fixing something that looks off.${live ? "" : "\n\n(Heads up: no AI key is connected yet, so my answers are limited — an admin can add an Anthropic key in Settings.)"}`,
    },
  ]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m, i) => !(i === 0 && m.role === "assistant")) }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? data.error ?? "Something went wrong — try again." },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error — try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <Card className="flex min-h-[60vh] flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-cardinal-700 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-700"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
              </div>
            </div>
          )}
          {messages.length <= 1 && (
            <div className="mt-2">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <Sparkles className="h-3.5 w-3.5" /> Try asking
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-600 transition-colors hover:border-cardinal-300 hover:text-cardinal-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </CardContent>

        <div className="border-t border-slate-100 p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about using or fixing the app…"
              disabled={busy}
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} title="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <LifeBuoy className="h-3.5 w-3.5" /> Answers come from the app&apos;s built-in documentation. For code or deployment changes, contact the repo owner.
          </p>
        </div>
      </Card>
    </div>
  );
}
