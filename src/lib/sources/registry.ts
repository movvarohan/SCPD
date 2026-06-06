import type { SourceConnector } from "./types";
import { secEdgarConnector } from "./secEdgar";
import { secFormDConnector } from "./secFormD";
import { irs990Connector } from "./irs990";
import { usaSpendingConnector } from "./usaSpending";
import { nppesConnector } from "./nppes";
import { nihReporterConnector } from "./nihReporter";
import { openFdaConnector } from "./openFda";
import { hnHiringConnector } from "./hnHiring";
import { ycDirectoryConnector } from "./ycDirectory";
import { genericDirectoryConnector } from "./genericDirectory";

// Registry of available public-source connectors. Add new connectors here
// (more registries, directories, conference lists, scrapers, …) and they
// automatically appear on the Source Leads page.
export const CONNECTORS: SourceConnector[] = [
  secEdgarConnector,
  secFormDConnector,
  irs990Connector,
  usaSpendingConnector,
  nppesConnector,
  nihReporterConnector,
  openFdaConnector,
  hnHiringConnector,
  ycDirectoryConnector,
  genericDirectoryConnector,
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
    needsUrl: Boolean(c.needsUrl),
  }));
}
