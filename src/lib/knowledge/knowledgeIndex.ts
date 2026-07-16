/**
 * In-memory knowledge index construction.
 *
 * Index construction is an application-process lifecycle operation, not a
 * per-session one. A complete `KnowledgeIndexSnapshot` is built once from the
 * normalized entries and then queried by every turn.
 *
 * The lexical scorer is a compact field-aware BM25 (BM25F-style): each of the
 * five text fields is scored independently and combined with per-field
 * weights, retaining the per-field breakdown so a retrieval decision is
 * explainable in traces. No embedding model or vector store is involved.
 */

import type {
  IndexedKnowledgeDocument,
  KnowledgeFieldName,
  KnowledgeFieldWeights,
  KnowledgeIndexSnapshot,
  KnowledgeLexicalMatch,
  NormalizedKnowledgeEntry,
} from "../types/index.js";
import { normalizePhrases, normalizeText, tokenize } from "./normalize.js";

const FIELD_NAMES: KnowledgeFieldName[] = [
  "title",
  "aliases",
  "keywords",
  "summary",
  "body",
];

/** Okapi BM25 saturation and length-normalization parameters. */
const BM25_K1 = 1.5;
const BM25_B = 0.75;

/**
 * Field-aware BM25 over the document set. Query text is scored per field and
 * the weighted per-field scores are summed. Satisfies the structural
 * `KnowledgeLexicalSearcher` type held by a snapshot.
 */
export class KnowledgeLexicalIndex {
  private readonly weights: KnowledgeFieldWeights;
  // field -> (term -> (docId -> term frequency))
  private readonly postings = new Map<
    KnowledgeFieldName,
    Map<string, Map<string, number>>
  >();
  // field -> (docId -> field length in tokens)
  private readonly fieldLengths = new Map<
    KnowledgeFieldName,
    Map<string, number>
  >();
  // field -> total tokens across all docs (for average length)
  private readonly fieldTokenTotals = new Map<KnowledgeFieldName, number>();
  // field -> average field length (computed in finalize)
  private readonly avgFieldLength = new Map<KnowledgeFieldName, number>();
  private docCount = 0;

  constructor(weights: KnowledgeFieldWeights) {
    this.weights = weights;
    for (const field of FIELD_NAMES) {
      this.postings.set(field, new Map());
      this.fieldLengths.set(field, new Map());
      this.fieldTokenTotals.set(field, 0);
    }
  }

  add(document: IndexedKnowledgeDocument): void {
    this.docCount += 1;
    for (const field of FIELD_NAMES) {
      const tokens = document.fields[field];
      const postingsForField = this.postings.get(field);
      const lengthsForField = this.fieldLengths.get(field);
      if (!postingsForField || !lengthsForField) {
        continue;
      }
      lengthsForField.set(document.id, tokens.length);
      this.fieldTokenTotals.set(
        field,
        (this.fieldTokenTotals.get(field) ?? 0) + tokens.length,
      );
      const termFrequency = new Map<string, number>();
      for (const token of tokens) {
        termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
      }
      for (const [term, frequency] of termFrequency) {
        const docMap = postingsForField.get(term);
        if (docMap) {
          docMap.set(document.id, frequency);
        } else {
          postingsForField.set(term, new Map([[document.id, frequency]]));
        }
      }
    }
  }

  finalize(): void {
    for (const field of FIELD_NAMES) {
      const total = this.fieldTokenTotals.get(field) ?? 0;
      this.avgFieldLength.set(
        field,
        this.docCount > 0 ? total / this.docCount : 0,
      );
    }
  }

  search(
    queryTokens: string[],
    topK: number,
    eligibleEntryIds?: ReadonlySet<string>,
  ): KnowledgeLexicalMatch[] {
    if (this.docCount === 0 || queryTokens.length === 0) {
      return [];
    }
    const uniqueTerms = Array.from(new Set(queryTokens));
    const totals = new Map<string, number>();
    const breakdowns = new Map<
      string,
      Partial<Record<KnowledgeFieldName, number>>
    >();

    for (const field of FIELD_NAMES) {
      const weight = this.weights[field];
      const avgdl = this.avgFieldLength.get(field) ?? 0;
      const postingsForField = this.postings.get(field);
      const lengthsForField = this.fieldLengths.get(field);
      if (weight <= 0 || avgdl <= 0 || !postingsForField || !lengthsForField) {
        continue;
      }
      for (const term of uniqueTerms) {
        const docMap = postingsForField.get(term);
        if (!docMap) {
          continue;
        }
        const documentFrequency = docMap.size;
        const idf = Math.log(
          1 +
            (this.docCount - documentFrequency + 0.5) /
              (documentFrequency + 0.5),
        );
        for (const [docId, frequency] of docMap) {
          if (eligibleEntryIds && !eligibleEntryIds.has(docId)) {
            continue;
          }
          const length = lengthsForField.get(docId) ?? 0;
          const denominator =
            frequency + BM25_K1 * (1 - BM25_B + BM25_B * (length / avgdl));
          const contribution =
            ((idf * (frequency * (BM25_K1 + 1))) / denominator) * weight;
          totals.set(docId, (totals.get(docId) ?? 0) + contribution);
          const breakdown = breakdowns.get(docId) ?? {};
          breakdown[field] = (breakdown[field] ?? 0) + contribution;
          breakdowns.set(docId, breakdown);
        }
      }
    }

    const matches: KnowledgeLexicalMatch[] = [];
    for (const [id, score] of totals) {
      matches.push({ id, score, fieldScores: breakdowns.get(id) ?? {} });
    }
    matches.sort(
      (left, right) =>
        right.score - left.score || compareIds(left.id, right.id),
    );
    return matches.slice(0, topK);
  }
}

/** Deterministic tiebreak so equal scores produce a stable order. */
const compareIds = (left: string, right: string): number => {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

const addToIndex = (
  index: Map<string, Set<string>>,
  key: string,
  id: string,
): void => {
  const bucket = index.get(key);
  if (bucket) {
    bucket.add(id);
  } else {
    index.set(key, new Set([id]));
  }
};

/**
 * Build the internal search document from a normalized entry. `exactKeys`
 * carry whole-phrase identifiers (entry id and title); each
 * text field is tokenized for the field-aware scorer.
 */
export const buildDocument = (
  entry: NormalizedKnowledgeEntry,
): IndexedKnowledgeDocument => {
  const exactKeys = normalizePhrases([entry.id, entry.title]);
  return {
    id: entry.id,
    exactKeys,
    fields: {
      title: tokenize(entry.title),
      aliases: entry.aliases.flatMap((alias) => tokenize(alias)),
      keywords: entry.keywords.flatMap((keyword) => tokenize(keyword)),
      summary: tokenize(entry.summary),
      body: tokenize(entry.body),
    },
  };
};

/**
 * Build the complete immutable snapshot: entry map, exact/alias/relation
 * indexes, and the field-aware lexical index.
 */
export const buildIndexSnapshot = (
  entries: NormalizedKnowledgeEntry[],
  weights: KnowledgeFieldWeights,
): KnowledgeIndexSnapshot => {
  const entriesById = new Map<string, NormalizedKnowledgeEntry>();
  const exactIndex = new Map<string, Set<string>>();
  const aliasIndex = new Map<string, Set<string>>();
  const relationIndex = new Map<string, string[]>();
  const lexical = new KnowledgeLexicalIndex(weights);

  for (const entry of entries) {
    entriesById.set(entry.id, entry);
    const document = buildDocument(entry);

    for (const key of document.exactKeys) {
      addToIndex(exactIndex, key, entry.id);
    }
    for (const alias of entry.aliases) {
      const key = normalizeText(alias);
      if (key) {
        addToIndex(aliasIndex, key, entry.id);
      }
    }

    const relations = [...entry.relatedEntryIds];
    if (entry.parentEntryId) {
      relations.push(entry.parentEntryId);
    }
    if (relations.length > 0) {
      relationIndex.set(entry.id, relations);
    }

    lexical.add(document);
  }
  lexical.finalize();

  return {
    entriesById,
    exactIndex,
    aliasIndex,
    relationIndex,
    lexical,
    entryCount: entries.length,
  };
};
