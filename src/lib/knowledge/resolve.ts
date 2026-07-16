/**
 * Source loading, default resolution, and generic validation.
 *
 * Required fields (id/title/summary/domain/integrations) come straight
 * from the authored entry; omitted optionals fall back to SDK defaults. This
 * covers only provider-neutral invariants (ids, required fields, enum values,
 * relationship integrity). Host-specific rules — configuration-key coverage,
 * taxonomy conflicts — are enforced by the host build BEFORE the manifest
 * reaches NeuroLink. Errors block indexing; warnings are surfaced but do not.
 */
import { decodeArray, decodeString } from "type-decoder/dist/index.js";

import type {
  KnowledgeEntryInput,
  KnowledgeEntryKind,
  KnowledgeLoadedSource,
  KnowledgeManifest,
  KnowledgeNormalizeOptions,
  KnowledgeNormalizeResult,
  KnowledgeSource,
  KnowledgeStatus,
  KnowledgeValidationIssue,
  NormalizedKnowledgeEntry,
} from "../types/index.js";
import { normalizeText } from "./normalize.js";

const SDK_DEFAULT_KIND: KnowledgeEntryKind = "text";
const SDK_DEFAULT_STATUS: KnowledgeStatus = "active";

const STATUSES = new Set<KnowledgeStatus>(["draft", "active", "deprecated"]);
const KINDS = new Set<KnowledgeEntryKind>([
  "concept",
  "text",
  "configuration",
  "tool",
  "procedure",
  "policy",
  "troubleshooting",
]);

/**
 * Resolve one authored entry into a complete `NormalizedKnowledgeEntry`,
 * materializing every omitted optional (optional arrays to `[]`, `body` to "",
 * `kind` to "text", `status` to "active") so downstream code never re-checks
 * it. Authored arrays are cloned so the normalized snapshot is isolated from
 * caller-owned references.
 */
export const resolveEntry = (
  input: KnowledgeEntryInput,
  version: string,
): NormalizedKnowledgeEntry => ({
  id: input.id,
  title: input.title,
  summary: input.summary,
  domain: input.domain,
  integrations: decodeArray(input.integrations, decodeString) ?? [],
  kind: input.kind ?? SDK_DEFAULT_KIND,
  status: input.status ?? SDK_DEFAULT_STATUS,
  body: input.body ?? "",
  aliases: [...(input.aliases ?? [])],
  keywords: [...(input.keywords ?? [])],
  relatedEntryIds: [...(input.relatedEntryIds ?? [])],
  parentEntryId: input.parentEntryId,
  version,
});

/** Expand a build manifest into sources — one per catalog. */
export const manifestToSources = (
  manifest: KnowledgeManifest,
): KnowledgeSource[] =>
  manifest.catalogs.map((catalog) => ({
    id: catalog.id,
    version: manifest.contentVersion,
    entries: catalog.entries,
  }));

/** Resolve a source's entries and its effective version. */
const loadSourceEntries = (
  source: KnowledgeSource,
  manifestVersion: string,
): KnowledgeLoadedSource => ({
  id: source.id,
  version: source.version ?? manifestVersion,
  entries: source.entries,
});

const error = (
  code: string,
  message: string,
  extra?: { entryId?: string; sourceId?: string },
): KnowledgeValidationIssue => ({ level: "error", code, message, ...extra });

const warn = (
  code: string,
  message: string,
  extra?: { entryId?: string; sourceId?: string },
): KnowledgeValidationIssue => ({ level: "warning", code, message, ...extra });

/**
 * Resolve and validate every source into normalized entries. `validation.ok`
 * is false when any error-level issue was found; the caller (index builder)
 * must not swap in an index built from an invalid set. Async so the public
 * contract is stable if a future source kind needs asynchronous loading.
 */
export const normalizeAndValidate = async (
  sources: KnowledgeSource[],
  options: KnowledgeNormalizeOptions,
): Promise<KnowledgeNormalizeResult> => {
  const issues: KnowledgeValidationIssue[] = [];
  const entries: NormalizedKnowledgeEntry[] = [];
  const seenIds = new Set<string>();
  const aliasOwner = new Map<string, string>();

  for (const source of sources) {
    const loaded = loadSourceEntries(source, options.manifestVersion);
    if (!loaded.id) {
      issues.push(error("missing-source-id", "Source has no id"));
    }

    for (const input of loaded.entries) {
      if (!input.id) {
        issues.push(
          error("missing-entry-id", "Entry has no id", { sourceId: loaded.id }),
        );
        continue;
      }
      if (seenIds.has(input.id)) {
        issues.push(
          error("duplicate-entry-id", `Duplicate entry id "${input.id}"`, {
            entryId: input.id,
          }),
        );
        continue;
      }
      seenIds.add(input.id);

      if (!input.title || !input.title.trim()) {
        issues.push(
          error("missing-title", "Entry is missing a title", {
            entryId: input.id,
          }),
        );
      }
      if (!input.summary || !input.summary.trim()) {
        issues.push(
          error("missing-summary", "Entry is missing a summary", {
            entryId: input.id,
          }),
        );
      }
      if (!input.domain || !input.domain.trim()) {
        issues.push(
          error("missing-domain", "Entry is missing a domain", {
            entryId: input.id,
          }),
        );
      }
      if (input.integrations === undefined) {
        issues.push(
          error("missing-integrations", "Entry is missing integrations", {
            entryId: input.id,
          }),
        );
      } else if (decodeArray(input.integrations, decodeString) === null) {
        issues.push(
          error(
            "bad-integrations",
            "Entry integrations must be an array of strings",
            { entryId: input.id },
          ),
        );
      }

      const normalized = resolveEntry(input, loaded.version);

      if (!KINDS.has(normalized.kind)) {
        issues.push(
          error("bad-kind", `Unsupported kind "${normalized.kind}"`, {
            entryId: normalized.id,
          }),
        );
      }
      if (!STATUSES.has(normalized.status)) {
        issues.push(
          error("bad-status", `Unsupported status "${normalized.status}"`, {
            entryId: normalized.id,
          }),
        );
      }

      for (const alias of normalized.aliases) {
        const key = normalizeText(alias);
        if (!key) {
          issues.push(
            warn(
              "empty-alias",
              `Alias "${alias}" is empty after normalization`,
              { entryId: normalized.id },
            ),
          );
          continue;
        }
        const owner = aliasOwner.get(key);
        if (owner && owner !== normalized.id) {
          issues.push(
            warn(
              "duplicate-alias",
              `Alias "${alias}" also used by "${owner}"`,
              { entryId: normalized.id },
            ),
          );
        } else {
          aliasOwner.set(key, normalized.id);
        }
      }

      entries.push(normalized);
    }
  }

  // Relationship integrity — resolved after all entries are collected.
  const idSet = new Set(entries.map((entry) => entry.id));
  for (const entry of entries) {
    for (const related of entry.relatedEntryIds) {
      if (!idSet.has(related)) {
        issues.push(
          warn("broken-relation", `relatedEntryId "${related}" not found`, {
            entryId: entry.id,
          }),
        );
      }
    }
    if (entry.parentEntryId && !idSet.has(entry.parentEntryId)) {
      issues.push(
        warn(
          "broken-parent",
          `parentEntryId "${entry.parentEntryId}" not found`,
          { entryId: entry.id },
        ),
      );
    }
  }

  const ok = !issues.some((issue) => issue.level === "error");
  return { entries, validation: { ok, issues } };
};
