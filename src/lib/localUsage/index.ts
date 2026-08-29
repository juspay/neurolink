/**
 * Local usage: token spend read from each CLI's own session logs.
 *
 * The proxy's ledger can only account for traffic that went through it, which
 * caps coverage at the CLIs that expose a base-URL override. Every CLI writes
 * a local transcript regardless, so reading those covers the rest — and covers
 * history from before the proxy existed.
 */

import type {
  LocalUsageAggregateOptions,
  LocalUsageAggregateReport,
  LocalUsageCliId,
  LocalUsageReaderFailure,
  LocalUsageScanError,
} from "../types/index.js";
import {
  createLocalUsageReader,
  getRegisteredLocalUsageCliIds,
} from "./localUsageReaderRegistry.js";

export {
  createLocalUsageReader,
  getLocalUsageDescriptors,
  getRegisteredLocalUsageCliIds,
  registerLocalUsageReader,
} from "./localUsageReaderRegistry.js";

/**
 * Scan every registered reader whose CLI is actually present on this machine.
 *
 * "Not installed" and "failed" are reported separately and deliberately: a CLI
 * the user never installed is not an error, and collapsing the two would make
 * a broken reader indistinguishable from an absent one.
 */
export async function readAllLocalUsage(
  options?: LocalUsageAggregateOptions,
): Promise<LocalUsageAggregateReport> {
  const totals: LocalUsageAggregateReport["totals"] = {};
  const failures: LocalUsageReaderFailure[] = [];
  const notInstalled: LocalUsageCliId[] = [];
  const scanErrors: LocalUsageScanError[] = [];

  // Filtered BEFORE construction, not after: `only` decides which stores are
  // opened at all. Reading all of them and discarding the rest cost 28s for a
  // single-CLI query that needs 10.
  const requested = options?.only;
  const cliIds = requested
    ? getRegisteredLocalUsageCliIds().filter((id) => requested.includes(id))
    : getRegisteredLocalUsageCliIds();

  for (const cliId of cliIds) {
    try {
      const reader = await createLocalUsageReader(cliId);
      if (!(await reader.detect())) {
        notInstalled.push(cliId);
        continue;
      }
      const result = await reader.scan(options);
      totals[cliId] = result.totals;
      scanErrors.push(...result.errors);
    } catch (error) {
      // One reader throwing must not lose the others' results.
      failures.push({
        cliId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totals,
    failures,
    notInstalled,
    scanErrors,
  };
}
