/**
 * Request defaults from the `requestDefaults` block in
 * `src/lib/providers/rules/<id>.json`.
 */
import type { ProviderRequestDefaults } from "../../types/index.js";
import { getProviderRules } from "./registry.js";

/** One request default; throws when the provider's rules file has none. */
export function getRequestDefault<K extends keyof ProviderRequestDefaults>(
  id: string,
  key: K,
): NonNullable<ProviderRequestDefaults[K]> {
  const value = getProviderRules(id).requestDefaults?.[key];
  if (value === undefined || value === null) {
    throw new Error(
      `Provider rules file "${id}.json" has no requestDefaults.${key}`,
    );
  }
  return value as NonNullable<ProviderRequestDefaults[K]>;
}
