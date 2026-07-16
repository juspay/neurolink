/**
 * Lexical-first retrieval pipeline.
 *
 * For one turn: authorize/filter BEFORE ranking, resolve exact identifiers and
 * reviewed aliases via query n-gram lookup, add field-aware BM25 over a bounded
 * query+history window, combine the deterministic signals, take the top
 * candidates, expand a bounded set of directly-related entries, and classify
 * confidence. No LLM, no embeddings, no vector store.
 */

import type {
  KnowledgeIndexSnapshot,
  KnowledgeResolvedRetrieval,
  KnowledgeRetrievalConfidence,
  KnowledgeRetrievalRequest,
  KnowledgeScoredCandidate,
  KnowledgeSelection,
  NormalizedKnowledgeEntry,
} from "../types/index.js";
import { tokenize } from "./normalize.js";

/** Per-turn history text cap so a long prior turn cannot dominate the query. */
const HISTORY_TURN_CHARS = 400;

/** All contiguous token n-grams (length 1..maxLen), de-duplicated. */
const generateNGrams = (tokens: string[], maxLen: number): string[] => {
  const grams: string[] = [];
  const seen = new Set<string>();
  const limit = Math.min(maxLen, tokens.length);
  for (let size = 1; size <= limit; size += 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      const gram = tokens.slice(start, start + size).join(" ");
      if (!seen.has(gram)) {
        seen.add(gram);
        grams.push(gram);
      }
    }
  }
  return grams;
};

/** Longest indexed exact/alias phrase length, derived from the active snapshot. */
const getMaxIndexedPhraseLen = (
  ...indexes: Array<Map<string, Set<string>>>
): number => {
  let maxLen = 0;
  for (const index of indexes) {
    for (const phrase of index.keys()) {
      const length = phrase === "" ? 0 : phrase.split(" ").length;
      maxLen = Math.max(maxLen, length);
    }
  }
  return maxLen;
};

/** Look each n-gram up in a phrase index; returns entry id -> matched phrases. */
const lookupPhrases = (
  grams: string[],
  index: Map<string, Set<string>>,
): Map<string, string[]> => {
  const hits = new Map<string, string[]>();
  for (const gram of grams) {
    const ids = index.get(gram);
    if (!ids) {
      continue;
    }
    for (const id of ids) {
      const matched = hits.get(id) ?? [];
      matched.push(gram);
      hits.set(id, matched);
    }
  }
  return hits;
};

/** Tokens fed to BM25: the current query plus a bounded recent-turn window. */
const buildLexicalTokens = (request: KnowledgeRetrievalRequest): string[] => {
  const parts: string[] = [request.query];
  for (const turn of request.recentTurns) {
    parts.push(turn.text.slice(0, HISTORY_TURN_CHARS));
  }
  return parts.flatMap((part) => tokenize(part));
};

/**
 * Authorization + metadata filter. Applied BEFORE ranking so restricted or
 * disabled-integration content never enters candidates, traces, or model context.
 */
const isAuthorized = (
  entry: NormalizedKnowledgeEntry,
  request: KnowledgeRetrievalRequest,
  blockedDomains: string[] | undefined,
): boolean => {
  if (entry.status !== "active") {
    return false;
  }
  if (blockedDomains && blockedDomains.includes(entry.domain)) {
    return false;
  }
  if (entry.integrations.length > 0) {
    const active = new Set<string>();
    for (const integration of request.enabledIntegrations) {
      active.add(integration.toLowerCase());
    }
    if (
      !entry.integrations.some((integration) =>
        active.has(integration.toLowerCase()),
      )
    ) {
      return false;
    }
  }
  return true;
};

const compareCandidates = (
  left: KnowledgeScoredCandidate,
  right: KnowledgeScoredCandidate,
): number => {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  if (left.id < right.id) {
    return -1;
  }
  if (left.id > right.id) {
    return 1;
  }
  return 0;
};

/**
 * Confidence class. `high` requires an exact/alias hit at the top; otherwise a
 * multi-field or dominant lexical top is `medium`, a single weak signal is
 * `low`, and no candidates is `none`. Thresholds are pre-tuning heuristics.
 */
const classifyConfidence = (
  candidates: KnowledgeScoredCandidate[],
): KnowledgeRetrievalConfidence => {
  if (candidates.length === 0) {
    return "none";
  }
  const [top, second] = candidates;
  if (top.exact || top.alias) {
    return "high";
  }
  const fieldsMatched = Object.keys(top.fieldScores).length;
  const dominant = second ? top.score >= 1.5 * second.score : false;
  if (fieldsMatched >= 2 || dominant) {
    return "medium";
  }
  return "low";
};

/**
 * Run retrieval against a ready snapshot. Returns the primary selection, a
 * bounded relationship expansion, the scored candidate list (diagnostics), and
 * a confidence class. Context assembly is a separate, later step.
 */
export const retrieve = (
  snapshot: KnowledgeIndexSnapshot,
  request: KnowledgeRetrievalRequest,
  config: KnowledgeResolvedRetrieval,
  blockedDomains?: string[],
): KnowledgeSelection => {
  const queryTokens = tokenize(request.query);
  const maxPhraseLen = getMaxIndexedPhraseLen(
    snapshot.exactIndex,
    snapshot.aliasIndex,
  );
  const grams = generateNGrams(queryTokens, maxPhraseLen);
  const exactHits = lookupPhrases(grams, snapshot.exactIndex);
  const aliasHits = lookupPhrases(grams, snapshot.aliasIndex);

  const eligibleEntryIds = new Set<string>();
  for (const [id, entry] of snapshot.entriesById) {
    if (isAuthorized(entry, request, blockedDomains)) {
      eligibleEntryIds.add(id);
    }
  }

  const lexicalTokens = buildLexicalTokens(request);
  const lexicalMatches = snapshot.lexical.search(
    lexicalTokens,
    config.candidateLimit * 2,
    eligibleEntryIds,
  );
  const lexicalById = new Map(lexicalMatches.map((match) => [match.id, match]));

  const candidateIds = new Set<string>();
  for (const id of exactHits.keys()) {
    if (eligibleEntryIds.has(id)) {
      candidateIds.add(id);
    }
  }
  for (const id of aliasHits.keys()) {
    if (eligibleEntryIds.has(id)) {
      candidateIds.add(id);
    }
  }
  for (const match of lexicalMatches) {
    candidateIds.add(match.id);
  }

  const candidates: KnowledgeScoredCandidate[] = [];
  for (const id of candidateIds) {
    const entry = snapshot.entriesById.get(id);
    if (!entry) {
      continue;
    }
    const exact = exactHits.has(id);
    const alias = aliasHits.has(id);
    const lexicalMatch = lexicalById.get(id);
    const lexical = lexicalMatch?.score ?? 0;

    let score = lexical;
    if (exact) {
      score += config.exactBoost;
    }
    if (alias) {
      score += config.aliasBoost;
    }
    candidates.push({
      id,
      score,
      exact,
      alias,
      lexical,
      fieldScores: lexicalMatch?.fieldScores ?? {},
      matchedPhrases: [
        ...(exactHits.get(id) ?? []),
        ...(aliasHits.get(id) ?? []),
      ],
    });
  }
  candidates.sort(compareCandidates);

  const trimmed = candidates.slice(0, config.candidateLimit);
  const primary: NormalizedKnowledgeEntry[] = [];
  for (const candidate of trimmed.slice(0, config.resultLimit)) {
    const entry = snapshot.entriesById.get(candidate.id);
    if (entry) {
      primary.push(entry);
    }
  }

  const selectedIds = new Set(primary.map((entry) => entry.id));
  const expanded: NormalizedKnowledgeEntry[] = [];
  for (const entry of primary) {
    if (expanded.length >= config.relationLimit) {
      break;
    }
    const relations = snapshot.relationIndex.get(entry.id) ?? [];
    for (const relatedId of relations) {
      if (expanded.length >= config.relationLimit) {
        break;
      }
      if (selectedIds.has(relatedId)) {
        continue;
      }
      const relatedEntry = snapshot.entriesById.get(relatedId);
      if (
        !relatedEntry ||
        !isAuthorized(relatedEntry, request, blockedDomains)
      ) {
        continue;
      }
      selectedIds.add(relatedId);
      expanded.push(relatedEntry);
    }
  }

  return {
    primary,
    expanded,
    candidates: trimmed,
    confidence: classifyConfidence(trimmed),
    candidateCount: candidates.length,
  };
};
