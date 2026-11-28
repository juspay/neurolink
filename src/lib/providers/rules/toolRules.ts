/**
 * Tool-choice spelling and tool-name rules, driven by the `toolChoices` and
 * `toolNames` blocks in `src/lib/providers/rules/<id>.json`.
 */
import type {
  ProviderCompiledToolNameRules,
  ProviderRuleJsonValue,
  ProviderToolChoiceMap,
  ProviderToolNameRules,
} from "../../types/index.js";
import { getProviderRules } from "./registry.js";

const TOOL_NAME_PLACEHOLDER = "{toolName}";

/** The named tool-choice table from a rules file; throws when it is missing. */
export function getToolChoiceMap(
  id: string,
  name: string,
): ProviderToolChoiceMap {
  const table = getProviderRules(id).toolChoices?.[name];
  if (!table) {
    throw new Error(
      `Provider rules file "${id}.json" has no toolChoices.${name} table`,
    );
  }
  return table;
}

const fillToolName = (
  value: ProviderRuleJsonValue,
  toolName: unknown,
): unknown => {
  if (value === TOOL_NAME_PLACEHOLDER) {
    return toolName;
  }
  if (Array.isArray(value)) {
    return value.map((item) => fillToolName(item, toolName));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        fillToolName(item, toolName),
      ]),
    );
  }
  return value;
};

const fromRule = (value: ProviderRuleJsonValue | undefined): unknown =>
  value === null || value === undefined ? undefined : structuredClone(value);

/**
 * Spell a tool choice for one wire (see ProviderToolChoiceMap). `toWireName`
 * maps a registered tool name onto the name the wire knows it by. Returns
 * undefined when nothing should be sent.
 */
export function translateToolChoice(
  table: ProviderToolChoiceMap,
  choice: unknown,
  toWireName?: (toolName: string) => string,
): unknown {
  if (choice === null || choice === undefined) {
    return undefined;
  }
  if (typeof choice === "string") {
    if (table.acceptStrings && Object.hasOwn(table.modes, choice)) {
      return fromRule(table.modes[choice as keyof typeof table.modes]);
    }
    return table.passthroughStrings ? choice : fromRule(table.fallback);
  }
  if (typeof choice === "object") {
    const { type, toolName } = choice as { type?: unknown; toolName?: unknown };
    if (type === "tool" && (!table.toolRequiresName || toolName)) {
      const wireName =
        typeof toolName === "string" && toWireName
          ? toWireName(toolName)
          : toolName;
      return fillToolName(table.tool, wireName);
    }
    if (
      table.acceptModeObjects &&
      typeof type === "string" &&
      Object.hasOwn(table.modes, type)
    ) {
      return fromRule(table.modes[type as keyof typeof table.modes]);
    }
  }
  return fromRule(table.fallback);
}

/** A provider's tool-name rules; throws when its rules file has none. */
export function getToolNameRules(id: string): ProviderToolNameRules {
  const rules = getProviderRules(id).toolNames;
  if (!rules) {
    throw new Error(`Provider rules file "${id}.json" has no toolNames block`);
  }
  return rules;
}

export function compileToolNameRules(
  rules: ProviderToolNameRules,
): ProviderCompiledToolNameRules {
  const valid = new RegExp(
    `^[${rules.firstChars}][${rules.allowedChars}]{0,${rules.maxLength - 1}}$`,
  );
  const disallowed = new RegExp(`[^${rules.allowedChars}]`, "g");
  const validFirst = new RegExp(`^[${rules.firstChars}]`);
  return {
    isValid: (name) => valid.test(name),
    sanitize: (name) => {
      if (valid.test(name)) {
        return name;
      }
      let sanitized = name.replace(disallowed, "_");
      if (!validFirst.test(sanitized)) {
        sanitized = `_${sanitized}`;
      }
      return sanitized.slice(0, rules.maxLength);
    },
    unique: (base, isTaken) => {
      if (!isTaken(base)) {
        return base;
      }
      for (let suffix = 2; ; suffix++) {
        const tail = `_${suffix}`;
        const candidate = `${base.slice(0, rules.maxLength - tail.length)}${tail}`;
        if (!isTaken(candidate)) {
          return candidate;
        }
      }
    },
  };
}
