/**
 * Process-level cache for knowledge index snapshots.
 *
 * Knowledge sources are constructor-level static content. Multiple NeuroLink
 * instances in the same server process can therefore share the same immutable
 * lexical index instead of rebuilding it for every conversation/session.
 */

import { createHash } from "crypto";
import type {
  KnowledgeFieldWeights,
  KnowledgeIndexSnapshot,
  KnowledgeSource,
  KnowledgeValidationResult,
  NormalizedKnowledgeEntry,
} from "../types/index.js";
import { buildIndexSnapshot } from "./knowledgeIndex.js";
import { normalizeAndValidate, resolveEntry } from "./resolve.js";

const CACHE_SCHEMA_VERSION = "knowledge-index-cache:v1";
export const KNOWLEDGE_INDEX_CACHE_LIMIT = 32;

const indexBuildCache = new Map<
  string,
  Promise<{
    snapshot: KnowledgeIndexSnapshot | null;
    validation: KnowledgeValidationResult;
  }>
>();

const rememberCacheEntry = (
  cacheKey: string,
  buildPromise: Promise<{
    snapshot: KnowledgeIndexSnapshot | null;
    validation: KnowledgeValidationResult;
  }>,
): void => {
  if (indexBuildCache.has(cacheKey)) {
    indexBuildCache.delete(cacheKey);
  }
  indexBuildCache.set(cacheKey, buildPromise);

  while (indexBuildCache.size > KNOWLEDGE_INDEX_CACHE_LIMIT) {
    const oldestKey = indexBuildCache.keys().next().value;
    if (oldestKey === undefined) {
      return;
    }
    indexBuildCache.delete(oldestKey);
  }
};

const escapePart = (value: string): string => encodeURIComponent(value);

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(",")}}`;
};

const compareEntries = (
  left: NormalizedKnowledgeEntry,
  right: NormalizedKnowledgeEntry,
): number =>
  left.id.localeCompare(right.id) ||
  stableStringify(left).localeCompare(stableStringify(right));

const hashSourceContent = (
  source: KnowledgeSource,
  fallbackVersion: string,
): string => {
  const version = source.version ?? fallbackVersion;
  const effectiveContent = {
    id: source.id,
    version,
    entries: source.entries
      .map((entry) => resolveEntry(entry, version))
      .sort(compareEntries),
  };
  return createHash("sha256")
    .update(stableStringify(effectiveContent))
    .digest("hex");
};

const formatFieldWeights = (weights: KnowledgeFieldWeights): string =>
  [
    `title=${weights.title}`,
    `aliases=${weights.aliases}`,
    `keywords=${weights.keywords}`,
    `summary=${weights.summary}`,
    `body=${weights.body}`,
  ].join(",");

const formatSource = (
  source: KnowledgeSource,
  fallbackVersion: string,
): string =>
  [
    escapePart(source.id),
    escapePart(source.version ?? fallbackVersion),
    source.entries.length,
    source.entries
      .map((entry) => escapePart(entry.id))
      .sort()
      .join(","),
    hashSourceContent(source, fallbackVersion),
  ].join(":");

/**
 * Cache key intentionally uses source/version metadata, not conversation scope.
 * The source content hash prevents stale reuse even when a host forgets to bump
 * a source version after changing entries.
 */
export const buildKnowledgeIndexCacheKey = (
  sources: KnowledgeSource[],
  fallbackVersion: string,
  weights: KnowledgeFieldWeights,
): string =>
  [
    CACHE_SCHEMA_VERSION,
    `weights=${formatFieldWeights(weights)}`,
    ...sources.map((source) => formatSource(source, fallbackVersion)),
  ].join("|");

export const getOrBuildKnowledgeIndexSnapshot = async (
  sources: KnowledgeSource[],
  fallbackVersion: string,
  weights: KnowledgeFieldWeights,
): Promise<{
  snapshot: KnowledgeIndexSnapshot | null;
  validation: KnowledgeValidationResult;
}> => {
  const cacheKey = buildKnowledgeIndexCacheKey(
    sources,
    fallbackVersion,
    weights,
  );
  const cached = indexBuildCache.get(cacheKey);
  if (cached) {
    rememberCacheEntry(cacheKey, cached);
    return cached;
  }

  const buildPromise = (async (): Promise<{
    snapshot: KnowledgeIndexSnapshot | null;
    validation: KnowledgeValidationResult;
  }> => {
    const { entries, validation } = await normalizeAndValidate(sources, {
      manifestVersion: fallbackVersion,
    });
    if (!validation.ok) {
      return { snapshot: null, validation };
    }
    return {
      snapshot: buildIndexSnapshot(entries, weights),
      validation,
    };
  })();

  rememberCacheEntry(cacheKey, buildPromise);
  void buildPromise.catch(() => {
    if (indexBuildCache.get(cacheKey) === buildPromise) {
      indexBuildCache.delete(cacheKey);
    }
  });

  return buildPromise;
};
