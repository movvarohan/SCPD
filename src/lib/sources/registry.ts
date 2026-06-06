import type { SourceConnector } from "./types";
import { secEdgarConnector } from "./secEdgar";
import { irs990Connector } from "./irs990";
import { ycDirectoryConnector } from "./ycDirectory";

// Registry of available public-source connectors. Add new connectors here
// (more registries, directories, conference lists, scrapers, …) and they
// automatically appear on the Source Leads page.
export const CONNECTORS: SourceConnector[] = [
  secEdgarConnector,
  irs990Connector,
  ycDirectoryConnector,
];

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
