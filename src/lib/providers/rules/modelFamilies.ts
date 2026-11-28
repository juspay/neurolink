/**
 * Named model-id families from `model-families.json`. Each family is a list
 * of case-insensitive patterns; gateway ids carry arbitrary prefixes and
 * suffixes (`vertex_ai/claude-sonnet-5@20260203`), so exact ids can't cover
 * them.
 */
import { getProviderRules } from "./registry.js";

const compiled = new Map<string, RegExp[]>();

/** A family's compiled patterns; throws when the family is missing. */
export function getModelFamilyPatterns(name: string): RegExp[] {
  let family = compiled.get(name);
  if (!family) {
    const sources = getProviderRules("model-families").modelFamilies?.[name];
    if (!sources) {
      throw new Error(
        `Provider rules file "model-families.json" has no modelFamilies.${name}`,
      );
    }
    family = sources.map((source) => new RegExp(source, "i"));
    compiled.set(name, family);
  }
  return family;
}

/** Whether a model id matches any pattern of a family. */
export function inModelFamily(name: string, modelId: string): boolean {
  return getModelFamilyPatterns(name).some((pattern) => pattern.test(modelId));
}

const compiledRules = new WeakMap<object, RegExp>();

/** The first rule whose case-insensitive `match` pattern matches the model id. */
export function firstModelRule<T extends { match: string }>(
  rules: readonly T[],
  modelId: string,
): T | undefined {
  return rules.find((rule) => {
    let pattern = compiledRules.get(rule);
    if (!pattern) {
      pattern = new RegExp(rule.match, "i");
      compiledRules.set(rule, pattern);
    }
    return pattern.test(modelId);
  });
}

/** A copy of a named list of exact model ids from model-families.json; throws when missing. */
export function getModelList(name: string): string[] {
  const list = getProviderRules("model-families").modelLists?.[name];
  if (!list) {
    throw new Error(
      `Provider rules file "model-families.json" has no modelLists.${name}`,
    );
  }
  return [...list];
}
