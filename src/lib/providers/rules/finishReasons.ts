/**
 * Finish-reason translation driven by the `finishReasons` tables in
 * `src/lib/providers/rules/<id>.json`. Every provider wire and proxy format
 * reads its table here instead of hard-coding a switch.
 */
import type { ProviderFinishReasonMap } from "../../types/index.js";
import { getProviderRules } from "./registry.js";

/** The named finish-reason table from a rules file; throws when it is missing. */
export function getFinishReasonMap(
  id: string,
  name: string,
): ProviderFinishReasonMap {
  const table = getProviderRules(id).finishReasons?.[name];
  if (!table) {
    throw new Error(
      `Provider rules file "${id}.json" has no finishReasons.${name} table`,
    );
  }
  return table;
}

/** Translate one finish reason through a table (see ProviderFinishReasonMap). */
export function translateFinishReason(
  table: ProviderFinishReasonMap,
  raw: string | null | undefined,
  hadToolCallsAtCap = false,
): string | null {
  const key = table.lowercase ? raw?.toLowerCase() : raw;
  if (typeof key === "string" && Object.hasOwn(table.map, key)) {
    return table.map[key];
  }
  if (key === null || key === undefined) {
    if (table.whenAbsent !== undefined) {
      return table.whenAbsent;
    }
  }
  if (hadToolCallsAtCap && table.defaultAtToolCap !== undefined) {
    return table.defaultAtToolCap;
  }
  if (table.passthroughUnknown && typeof raw === "string") {
    return raw;
  }
  return table.default;
}
