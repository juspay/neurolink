/**
 * Token usage as data. A wire's `usage` block in its rules file names where
 * each count lives; `readWireUsage` reads them and `splitIncludedPart`
 * applies the one formula every wire shares: a count reported INSIDE another
 * (cache reads inside the prompt, reasoning inside the completion) is split
 * out and clamped to its total.
 */
import type {
  ProviderUsageCountDialect,
  ProviderWireUsage,
  ProviderWireUsageCounts,
} from "../../types/index.js";
import { getProviderRules } from "./registry.js";

/** The value at a dotted path, or undefined. */
export function valueAtPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const key of path.split(".")) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** A wire's usage field map; throws when its rules file has none. */
export function getWireUsage(id: string): ProviderWireUsage {
  const usage = getProviderRules(id).usage;
  if (!usage) {
    throw new Error(`Provider rules file "${id}.json" has no "usage" block`);
  }
  return usage;
}

/** Each count the wire reported, exactly as reported (undefined when absent). */
export function readWireUsage(
  wire: ProviderWireUsage,
  usage: unknown,
): ProviderWireUsageCounts {
  const read = (path: string | undefined) =>
    path === undefined
      ? undefined
      : (valueAtPath(usage, path) as number | undefined);
  return {
    input: read(wire.input),
    output: read(wire.output),
    total: read(wire.total),
    cacheRead: read(wire.cacheRead),
    reasoning: read(wire.reasoning),
  };
}

/**
 * Split `part` out of a `total` that already contains it: `rest` is the
 * remainder (never below 0) and `part` is clamped to the total, since some
 * gateways report a part larger than its total.
 */
export function splitIncludedCount(
  total: number,
  part: number,
): { rest: number; part: number } {
  return { rest: Math.max(0, total - part), part: Math.min(part, total) };
}

/** {@link splitIncludedCount}, passing both through when either is missing. */
export function splitIncludedPart(
  total: number | undefined,
  part: number | undefined,
): { rest: number | undefined; part: number | undefined } {
  if (total === undefined || part === undefined) {
    return { rest: total, part };
  }
  return splitIncludedCount(total, part);
}

/** Output billed at the output rate: reasoning is added when the wire reports it apart. */
export function outputWithReasoning(
  wire: ProviderWireUsage,
  output: number,
  reasoning: number | undefined,
): number {
  return wire.reasoningInOutput ? output : output + (reasoning ?? 0);
}

/** A named count dialect from a rules file; throws when it is missing. */
export function getUsageDialect(
  id: string,
  name: string,
): ProviderUsageCountDialect {
  const dialect = getProviderRules(id).usageDialects?.[name];
  if (!dialect) {
    throw new Error(
      `Provider rules file "${id}.json" has no usageDialects.${name}`,
    );
  }
  return dialect;
}

/** Prompt, completion and total counts read through a dialect (see ProviderUsageCountDialect). */
export function readUsageCounts(
  dialect: ProviderUsageCountDialect,
  source: unknown,
): { promptTokens: number; completionTokens: number; total: number } {
  const pick = (paths: string[]): unknown => {
    let value: unknown;
    for (const path of paths) {
      value = valueAtPath(source, path);
      if (
        dialect.pick === "truthy"
          ? value
          : value !== undefined && value !== null
      ) {
        return value;
      }
    }
    return value;
  };
  const promptTokens = Number(pick(dialect.input)) || 0;
  const completionTokens = Number(pick(dialect.output)) || 0;
  return {
    promptTokens,
    completionTokens,
    total: Number(pick(dialect.total)) || promptTokens + completionTokens,
  };
}
