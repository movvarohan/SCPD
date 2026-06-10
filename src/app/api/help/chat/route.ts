import { getCurrentUser } from "@/lib/auth";
import { getLLMProvider, type LLMMessage } from "@/lib/providers/llm";
import { HELP_SYSTEM_PROMPT } from "@/lib/help-context";

export const dynamic = "force-dynamic";

// POST /api/help/chat  { messages: [{ role: "user"|"assistant", content }] }
// Answers product/setup/troubleshooting questions using the embedded context.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: { messages?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-16) // keep the conversation bounded
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 4000) }));
  if (!history.length || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Send at least one user message." }, { status: 400 });
  }

  const llm = await getLLMProvider();
  if (llm.name === "llm:mock") {
    return Response.json({
      reply:
        "The AI assistant isn't connected yet (no Anthropic API key is configured). An admin can add one in Settings → API keys & mailbox → LLM, then I can answer anything about the app.\n\nIn the meantime: the README in the repository covers setup, the demo video walks through every feature, and common fixes live in Settings (connect Gmail to actually send email; add a Hunter key for real email lookup; click Re-score after changing scoring weights).",
    });
  }

  const messages: LLMMessage[] = [
    { role: "system", content: HELP_SYSTEM_PROMPT },
    ...history,
  ];

  try {
    const reply = await llm.complete(messages);
    return Response.json({ reply: reply.trim() });
  } catch (err) {
    return Response.json(
      { error: `The assistant hit an error: ${(err as Error).message.slice(0, 160)}` },
      { status: 502 }
    );
  }
}
