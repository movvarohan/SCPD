import { PageHeader } from "@/components/page-header";
import { HelpChat } from "@/components/help-chat";
import { getCurrentUser } from "@/lib/auth";
import { llmStatus } from "@/lib/providers/llm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Help · SC Sourcing Engine" };

export default async function HelpPage() {
  const [user, llm] = await Promise.all([getCurrentUser(), llmStatus()]);
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Help & Assistant"
        description="Ask anything about getting started, daily use, connecting keys and Gmail, or fixing something — answers come from the app's own documentation."
      />
      <div className="min-h-0 flex-1">
        <HelpChat firstName={user?.name?.split(" ")[0] ?? "there"} live={llm.configured} />
      </div>
    </div>
  );
}
