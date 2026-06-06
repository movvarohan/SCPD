import { PageHeader } from "@/components/page-header";
import { SourceForm } from "@/components/source-form";
import { ConnectorPanel } from "@/components/connector-panel";
import { listConnectors } from "@/lib/sources/registry";
import { apolloStatus } from "@/lib/providers/apollo";
import { clayStatus } from "@/lib/providers/clay";
import { getCurrentUser, can } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SourcePage() {
  const user = await getCurrentUser();
  const allowed = can(user, "source");
  const apollo = await apolloStatus();
  const clay = await clayStatus();
  const connectors = listConnectors();

  return (
    <div>
      <PageHeader
        title="Source Leads"
        description="Define your ideal customer profile and pull fresh leads from Apollo / Clay. Mock providers run locally with no API keys."
      />
      {!allowed && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Sourcing is an Admin action — switch to the Admin role (top right) to run a sourcing job.
        </div>
      )}
      <SourceForm apolloMode={apollo.mode} clayMode={clay.mode} />
      <div className="mt-4">
        <ConnectorPanel connectors={connectors} />
      </div>
    </div>
  );
}
