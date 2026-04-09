/**
 * Research configuration validation and resolution.
 */

import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { AutoresearchError } from "./errors.js";
import type { ResearchConfig } from "../types/autoresearchTypes.js";
import { AUTORESEARCH_DEFAULTS } from "../types/autoresearchTypes.js";

export function resolveConfig(
  partial: Partial<ResearchConfig> & {
    repoPath: string;
    mutablePaths: string[];
    runCommand: string;
    metric: ResearchConfig["metric"];
  },
): ResearchConfig {
  const config: ResearchConfig = {
    repoPath: path.resolve(partial.repoPath),
    programPath: partial.programPath ?? AUTORESEARCH_DEFAULTS.programPath,
    mutablePaths: partial.mutablePaths,
    immutablePaths: partial.immutablePaths ?? [],
    resultsPath: partial.resultsPath ?? AUTORESEARCH_DEFAULTS.resultsPath,
    statePath: partial.statePath ?? AUTORESEARCH_DEFAULTS.statePath,
    runCommand: partial.runCommand,
    logPath: partial.logPath ?? AUTORESEARCH_DEFAULTS.logPath,
    metric: partial.metric,
    memoryMetric: partial.memoryMetric,
    timeoutMs: partial.timeoutMs ?? AUTORESEARCH_DEFAULTS.timeoutMs,
    branchPrefix: partial.branchPrefix ?? AUTORESEARCH_DEFAULTS.branchPrefix,
    provider: partial.provider,
    model: partial.model,
    maxExperiments: partial.maxExperiments,
    thinkingLevel: partial.thinkingLevel ?? AUTORESEARCH_DEFAULTS.thinkingLevel,
  };

  return config;
}

export function validateConfig(config: ResearchConfig): void {
  // Verify repoPath exists and is a directory
  if (
    !existsSync(config.repoPath) ||
    !statSync(config.repoPath).isDirectory()
  ) {
    throw AutoresearchError.create(
      "CONFIG_INVALID",
      `repoPath does not exist or is not a directory: ${config.repoPath}`,
    );
  }

  // Verify it's a git repo
  if (!existsSync(path.join(config.repoPath, ".git"))) {
    throw AutoresearchError.create(
      "REPO_NOT_FOUND",
      `repoPath is not a git repository: ${config.repoPath}`,
    );
  }

  // Verify mutablePaths is non-empty
  if (config.mutablePaths.length === 0) {
    throw AutoresearchError.create(
      "CONFIG_INVALID",
      "mutablePaths must contain at least one path",
    );
  }

  // Verify mutable and immutable don't overlap (normalize paths first)
  const normMutable = config.mutablePaths.map((p) =>
    path.normalize(p).replace(/\/+$/, ""),
  );
  const normImmutable = config.immutablePaths.map((p) =>
    path.normalize(p).replace(/\/+$/, ""),
  );
  const overlap = normMutable.filter((p) => normImmutable.includes(p));
  if (overlap.length > 0) {
    throw AutoresearchError.create(
      "CONFIG_INVALID",
      `mutablePaths and immutablePaths overlap: ${overlap.join(", ")}`,
    );
  }

  // Verify metric pattern — length limit and basic ReDoS safety
  const MAX_PATTERN_LENGTH = 200;
  if (config.metric.pattern.length > MAX_PATTERN_LENGTH) {
    throw AutoresearchError.create(
      "CONFIG_INVALID",
      `metric.pattern exceeds ${MAX_PATTERN_LENGTH} characters: ${config.metric.pattern.slice(0, 50)}...`,
    );
  }
  // Reject patterns with obvious catastrophic backtracking (nested quantifiers)
  if (
    /(\+|\*|\{)\s*(\+|\*|\{)/.test(config.metric.pattern) ||
    /\(\?[^)]*\)\+\+/.test(config.metric.pattern)
  ) {
    throw AutoresearchError.create(
      "CONFIG_INVALID",
      `metric.pattern contains nested quantifiers (potential ReDoS): ${config.metric.pattern}`,
    );
  }

  // Verify metric pattern is valid regex with exactly one capture group
  try {
    const _regex = new RegExp(config.metric.pattern);
    const match = new RegExp(config.metric.pattern + "|").exec("");
    const groupCount = (match?.length ?? 1) - 1;
    if (groupCount !== 1) {
      throw AutoresearchError.create(
        "CONFIG_INVALID",
        `metric.pattern must have exactly one capture group, found ${groupCount}: ${config.metric.pattern}`,
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof (error as Record<string, unknown>).code === "string"
    ) {
      throw error; // Rethrow structured AutoresearchError
    }
    throw AutoresearchError.create(
      "CONFIG_INVALID",
      `metric.pattern is not a valid regex: ${config.metric.pattern}`,
    );
  }

  // Validate memoryMetric.pattern with the same checks if present
  if (config.memoryMetric) {
    if (config.memoryMetric.pattern.length > MAX_PATTERN_LENGTH) {
      throw AutoresearchError.create(
        "CONFIG_INVALID",
        `memoryMetric.pattern exceeds ${MAX_PATTERN_LENGTH} characters`,
      );
    }
    if (
      /(\+|\*|\{)\s*(\+|\*|\{)/.test(config.memoryMetric.pattern) ||
      /\(\?[^)]*\)\+\+/.test(config.memoryMetric.pattern)
    ) {
      throw AutoresearchError.create(
        "CONFIG_INVALID",
        `memoryMetric.pattern contains nested quantifiers (potential ReDoS)`,
      );
    }
    try {
      const _memRegex = new RegExp(config.memoryMetric.pattern);
      const memMatch = new RegExp(config.memoryMetric.pattern + "|").exec("");
      const memGroupCount = (memMatch?.length ?? 1) - 1;
      if (memGroupCount !== 1) {
        throw AutoresearchError.create(
          "CONFIG_INVALID",
          `memoryMetric.pattern must have exactly one capture group, found ${memGroupCount}`,
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        typeof (error as Record<string, unknown>).code === "string"
      ) {
        throw error; // Rethrow structured AutoresearchError
      }
      throw AutoresearchError.create(
        "CONFIG_INVALID",
        `memoryMetric.pattern is not a valid regex: ${config.memoryMetric.pattern}`,
      );
    }
  }

  logger.info("[Autoresearch] Config validated", {
    repoPath: config.repoPath,
    mutablePaths: config.mutablePaths,
  });
}
