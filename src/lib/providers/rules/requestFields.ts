/**
 * Request-building rules from `src/lib/providers/rules/<id>.json`: the wire
 * names of request parameters (`requestFields`), how a failed tool call is
 * reported (`toolResults`) and fixed conversation texts
 * (`contextTexts`).
 */
import type {
  ProviderContextTexts,
  ProviderRequestFields,
  ProviderToolResultRules,
  ProviderWireParamValues,
} from "../../types/index.js";
import { getProviderRules } from "./registry.js";

function required<T>(id: string, key: string, value: T | undefined): T {
  if (value === undefined) {
    throw new Error(`Provider rules file "${id}.json" has no ${key}`);
  }
  return value;
}

/** The provider's request field names; throws when its rules file has none. */
export function getRequestFields(id: string): ProviderRequestFields {
  return required(id, "requestFields", getProviderRules(id).requestFields);
}

/**
 * Request parameters under the provider's wire names. Unset values and empty
 * lists are left out, as every request builder did by hand.
 */
export function toWireParams(
  id: string,
  values: ProviderWireParamValues,
): Record<string, unknown> {
  const names = getRequestFields(id);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(values) as Array<
    keyof ProviderWireParamValues
  >) {
    const value = values[key];
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    out[names[key]] = value;
  }
  return out;
}

/** How a failed tool call is reported back to the model. */
export function getToolResultRules(id: string): ProviderToolResultRules {
  return required(id, "toolResults", getProviderRules(id).toolResults);
}

/** Fixed texts inserted into the conversation. */
export function getContextTexts(id: string): ProviderContextTexts {
  return required(id, "contextTexts", getProviderRules(id).contextTexts);
}
