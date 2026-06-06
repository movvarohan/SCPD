import type { SourceConnector } from "./types";
import { secEdgarConnector } from "./secEdgar";

// Registry of available public-source connectors. Add new connectors here
// (IRS 990, accelerator directories, conference lists, scrapers, …) and they
// automatically appear on the Source Leads page.
export const CONNECTORS: SourceConnector[] = [secEdgarConnector];

export function getConnector(key: string): SourceConnector | undefined {
  return CONNECTORS.find((c) => c.key === key);
}

export function listConnectors() {
  return CONNECTORS.map((c) => ({
    key: c.key,
    label: c.label,
    description: c.description,
    worksInSandbox: c.worksInSandbox,
    kind: c.kind,
  }));
}
