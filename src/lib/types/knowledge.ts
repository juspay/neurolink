/**
 * Knowledge grounding — lexical-first host-supplied knowledge retrieval.
 *
 * A host application owns a structured *knowledge registry*: versioned entries
 * describing concepts, configuration, taxonomies, procedures, and operating
 * rules. NeuroLink owns the
 * generic engine that ingests that registry, builds an in-memory lexical
 * index once per instance, and — independently of tool routing — retrieves a
 * small, token-bounded set of relevant entries before each main model call.
 * The selected entries are attached as *ephemeral context*: visible to the
 * current generation call, never persisted into conversation memory.
 *
 * This is retrieval-augmented generation WITHOUT vector retrieval. The first
 * release ranks with exact identifiers, reviewed aliases, metadata filters,
 * and weighted field-aware BM25 only. No embedding model, embedding service,
 * or vector store is initialized. An LLM reranker and semantic retrieval are
 * deferred behind an explicit evaluation gate.
 *
 * Ownership boundary: NeuroLink defines the contracts below and the engine;
 * it never contains host product content. The host supplies content and
 * per-request scope. The engine stays provider-neutral.
 *
 * Type names are globally prefixed `Knowledge*` to satisfy the repo's
 * unique-type-name rule and to avoid collision with the pre-existing
 * web-search `grounding.ts` vocabulary (`EnhancedGroundingMetadata` et al.),
 * which is a different concept (Google search grounding, not product
 * knowledge).
 */

import type { UnknownRecord } from "./common.js";
import type { ChatMessage } from "./conversation.js";

// ---------------------------------------------------------------------------
// Small unions
// ---------------------------------------------------------------------------

/** What a knowledge entry primarily is. Drives context labelling, not ranking. */
export type KnowledgeEntryKind =
  | "concept"
  | "text"
  | "configuration"
  | "tool"
  | "procedure"
  | "policy"
  | "troubleshooting";

/** Lifecycle state. Only `active` entries are retrievable by default. */
export type KnowledgeStatus = "draft" | "active" | "deprecated";

/**
 * Retrieval mode. Only `"lexical"` is supported in the first release; the
 * literal is a union of one to reserve a clean upgrade path to `"hybrid"` /
 * `"vector"` without a breaking change.
 */
export type KnowledgeRetrievalMode = "lexical";

/**
 * Confidence class returned with every retrieval so the host prompt can
 * instruct the model to qualify low-confidence answers rather than present
 * them as authoritative.
 */
export type KnowledgeRetrievalConfidence = "high" | "medium" | "low" | "none";

/** The five weighted text fields used by the field-aware lexical scorer. */
export type KnowledgeFieldName =
  | "title"
  | "aliases"
  | "keywords"
  | "summary"
  | "body";

// ---------------------------------------------------------------------------
// Authored input and normalized record
// ---------------------------------------------------------------------------

/**
 * The record a host author writes. `id`, `title`, `summary`, `domain`, and
 * `integrations` are required; every other field is optional and omitted
 * optionals fall back to SDK defaults during normalization.
 */
export type KnowledgeEntryInput = {
  /** Stable unique id (e.g. "account.multi-step-flow"). Drives exact-match lookup and citations. */
  id: string;
  /** Human-readable name of the concept/setting. Highest-weighted search field. */
  title: string;
  /** One-line searchable description — the short answer when a full body is unnecessary. */
  summary: string;
  /** Primary grouping and the main retrieval filter (e.g. "account-settings"). */
  domain: string;
  /** Integration identifiers this entry applies to. Empty array = applies to all integrations. */
  integrations: string[];
  /** What the entry is (concept, configuration, procedure, …). Default "text". Labels context, not ranking. */
  kind?: KnowledgeEntryKind;
  /** Lifecycle state. Default "active"; only active entries are retrievable. */
  status?: KnowledgeStatus;
  /** Full explanatory content (Markdown). Use only when the summary is insufficient. */
  body?: string;
  /** Reviewed alternate phrasings or raw identifiers that resolve to exact and alias matches. */
  aliases?: string[];
  /** Extra search terms that aid recall but are not full aliases. */
  keywords?: string[];
  /** Ids of directly related entries, pulled in by bounded relationship expansion. */
  relatedEntryIds?: string[];
  /** Id of the parent entry when this is a subtype or child. */
  parentEntryId?: string;
};

/**
 * The complete, defaults-resolved record NeuroLink indexes and injects. Omitted
 * optionals are materialized (arrays to `[]`, `body` to `""`, `kind` to "text",
 * `status` to "active") so downstream code never re-checks the resolution chain.
 * Field meanings mirror `KnowledgeEntryInput`.
 */
export type NormalizedKnowledgeEntry = {
  id: string;
  title: string;
  summary: string;
  domain: string;
  integrations: string[];
  kind: KnowledgeEntryKind;
  status: KnowledgeStatus;
  body: string;
  aliases: string[];
  keywords: string[];
  relatedEntryIds: string[];
  parentEntryId?: string;
  /** Content version from the source/manifest; appears in citations as [KB:id@version]. */
  version: string;
};

// ---------------------------------------------------------------------------
// Sources and the build manifest
// ---------------------------------------------------------------------------

/** One catalog inside a build manifest — a source id and its entries. */
export type KnowledgeManifestCatalog = {
  id: string;
  entries: KnowledgeEntryInput[];
};

/**
 * The versioned build artifact a host emits at build time. NeuroLink can
 * consume it directly (each catalog becomes a structured source) so hosts do
 * not need to construct `KnowledgeSource[]` by hand.
 */
export type KnowledgeManifest = {
  schemaVersion: string;
  contentVersion: string;
  generatedAt: string;
  catalogs: KnowledgeManifestCatalog[];
};

/**
 * A configured knowledge source: inline structured entries passed to the
 * engine. Markdown/provider source kinds were intentionally dropped for now;
 * re-introduce this as a discriminated union (with a `type` tag) if another
 * source kind is needed later.
 */
export type KnowledgeSource = {
  id: string;
  version?: string;
  entries: KnowledgeEntryInput[];
};

// ---------------------------------------------------------------------------
// Grounding configuration (constructor-level, mirrors ToolRoutingConfig)
// ---------------------------------------------------------------------------

/**
 * Relative weight applied to a lexical match in each field. Title/alias
 * matches outrank body matches. Tunable through evaluation.
 */
export type KnowledgeFieldWeights = {
  title: number;
  aliases: number;
  keywords: number;
  summary: number;
  body: number;
};

/** Lexical retrieval tuning. All fields optional; the engine supplies defaults. */
export type KnowledgeRetrievalConfig = {
  /** Retrieval mode. Default: "lexical". */
  mode?: KnowledgeRetrievalMode;
  /** How many scored candidates enter relationship expansion. Default: 24. */
  candidateLimit?: number;
  /** How many primary entries survive into the assembled context. Default: 8. */
  resultLimit?: number;
  /** Cap on relationship-expanded entries added after primary retrieval. Default: 4. */
  relationLimit?: number;
  /** Per-field BM25 weights. */
  fieldWeights?: KnowledgeFieldWeights;
  /** Additive boost for an exact entry-id / configuration-key match. Dominant. Default: 100. */
  exactBoost?: number;
  /** Additive boost for an exact reviewed-alias phrase match. Default: 60. */
  aliasBoost?: number;
};

/** Ephemeral-context assembly limits. */
export type KnowledgeContextConfig = {
  /** Hard token budget for the assembled grounding block. Default: 4000. */
  maxTokens?: number;
  /** Emit `[KB:<id>@<version>]` citations. Default: true. */
  includeCitations?: boolean;
};

/**
 * Constructor-level configuration for knowledge grounding. Sources are fixed
 * for the lifetime of a NeuroLink instance so the index can be built once.
 */
export type KnowledgeGroundingConfig = {
  /** Master switch. Grounding runs only when true AND at least one source is loaded. */
  enabled: boolean;
  /**
   * Knowledge sources used to build the instance's immutable in-memory index.
   * Required alongside `enabled`; pass an empty array only when intentionally
   * configuring no retrievable content.
   */
  sources: KnowledgeSource[];
  /** Exclude these domains from retrieval. Empty/omitted means all domains are eligible. */
  blockedDomains?: string[];
  retrieval?: KnowledgeRetrievalConfig;
  context?: KnowledgeContextConfig;
  /** Hard ceiling for one grounding operation before it fails open. Default: 800ms. */
  timeoutMs?: number;
};

// ---------------------------------------------------------------------------
// Per-request scope and internal retrieval request
// ---------------------------------------------------------------------------

/**
 * Per-call scope the host attaches to `GenerateOptions` / `StreamOptions`.
 * Supplies the enabled integrations for this turn only.
 */
export type KnowledgeRequestScope = {
  /** Installed/enabled integrations used to filter integration-specific entries. */
  enabledIntegrations?: string[];
};

/**
 * Internal structural view shared by static and dynamic public call options.
 * It contains only the fields read by knowledge grounding and history lookup.
 *
 * @internal
 */
export type KnowledgeGroundingCallOptions = {
  input?: { text?: string };
  useKnowledgeGrounding?: boolean;
  knowledgeContext?: KnowledgeRequestScope;
  conversationMessages?: ChatMessage[];
  context?: UnknownRecord;
};

/** One bounded recent conversation turn used to contextualize the query. */
export type KnowledgeConversationTurn = {
  role: "user" | "assistant";
  text: string;
};

/**
 * The fully-resolved retrieval request the engine builds internally from the
 * user query, a bounded recent window, and host scope.
 */
export type KnowledgeRetrievalRequest = {
  query: string;
  recentTurns: KnowledgeConversationTurn[];
  enabledIntegrations: string[];
};

// ---------------------------------------------------------------------------
// Index-time internal documents and snapshot
// ---------------------------------------------------------------------------

/**
 * The internal search document built from a normalized entry. `exactKeys` and
 * `fields` hold pre-tokenized normalized text. Internal to NeuroLink.
 */
export type IndexedKnowledgeDocument = {
  id: string;
  /** Normalized whole-phrase keys for exact/alias resolution. */
  exactKeys: string[];
  /** Per-field normalized token arrays fed to the field-aware BM25 scorer. */
  fields: {
    title: string[];
    aliases: string[];
    keywords: string[];
    summary: string[];
    body: string[];
  };
};

/** One lexical match with its per-field score breakdown, for tuning and traces. */
export type KnowledgeLexicalMatch = {
  id: string;
  score: number;
  fieldScores: Partial<Record<KnowledgeFieldName, number>>;
};

/**
 * Structural contract of the field-aware lexical index held in a snapshot. A
 * concrete class in the knowledge runtime module satisfies this shape; typing
 * it structurally keeps this types file free of runtime imports.
 */
export type KnowledgeLexicalSearcher = {
  search: (
    queryTokens: string[],
    topK: number,
    eligibleEntryIds?: ReadonlySet<string>,
  ) => KnowledgeLexicalMatch[];
};

/**
 * Immutable, ready-to-query index built once at client construction. Sessions
 * and turns search this snapshot; it is never mutated in place.
 */
export type KnowledgeIndexSnapshot = {
  entriesById: Map<string, NormalizedKnowledgeEntry>;
  /** Normalized entry id or title phrase -> entry ids. */
  exactIndex: Map<string, Set<string>>;
  /** Normalized reviewed alias phrase -> entry ids. */
  aliasIndex: Map<string, Set<string>>;
  /** Entry id -> directly related entry ids, for bounded expansion. */
  relationIndex: Map<string, string[]>;
  /** Field-aware BM25 over all documents. */
  lexical: KnowledgeLexicalSearcher;
  entryCount: number;
};

// ---------------------------------------------------------------------------
// Retrieval result, ephemeral context, and result metadata
// ---------------------------------------------------------------------------

/** A stable citation to a specific knowledge entry version. */
export type KnowledgeCitation = {
  id: string;
  version: string;
};

/**
 * The result of one retrieval: the selected entries, the assembled ephemeral
 * context string, a confidence class, and assembly diagnostics.
 */
export type KnowledgeRetrievalResult = {
  entries: NormalizedKnowledgeEntry[];
  assembledContext: string;
  confidence: KnowledgeRetrievalConfidence;
  citations: KnowledgeCitation[];
  /** Ids of the primary (non-expanded) entries, in final order. */
  selectedEntryIds: string[];
  /** Ids added by bounded relationship expansion. */
  expandedEntryIds: string[];
  /** Candidates scored before truncation to the result limit. */
  candidateCount: number;
  /** Estimated token size of `assembledContext`. */
  contextTokens: number;
  /** True when any entry body was truncated or entries were dropped for budget. */
  truncated: boolean;
  durationMs: number;
};

/**
 * A block of context assembled for a single generation call without becoming
 * durable conversation. The NeuroLink call boundary injects its content into
 * the effective system prompt and never persists it as a user message.
 */
export type EphemeralContext = {
  content: string;
  kind: "knowledge";
  /** Host-supplied reviewed content is trusted reference data. */
  trusted: boolean;
  citations?: KnowledgeCitation[];
  metadata?: Record<string, unknown>;
};

/**
 * Aggregate, content-free diagnostics attached to a generation/stream result
 * so the host can evaluate retrieval without the SDK exposing entry bodies.
 */
export type KnowledgeGroundingMetadata = {
  retrievalMode: KnowledgeRetrievalMode;
  selectedIds: string[];
  expandedIds: string[];
  candidateCount: number;
  contextTokens: number;
  truncated: boolean;
  durationMs: number;
  confidence?: KnowledgeRetrievalConfidence;
  /** Present when grounding failed open; names the failure class. */
  failureReason?: string;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** A single validation problem found while normalizing/indexing a source. */
export type KnowledgeValidationIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
  entryId?: string;
  sourceId?: string;
};

/** Outcome of validating a set of sources before indexing. */
export type KnowledgeValidationResult = {
  ok: boolean;
  issues: KnowledgeValidationIssue[];
};

// ---------------------------------------------------------------------------
// Engine working types (kept here per the repo rule that every type alias lives
// in src/lib/types/, including @internal ones).
//
// Only types that never reach an emitted signature carry @internal. The rest
// are public by construction: they appear in the .d.ts of public runtime
// exports (assembleKnowledgeContext, retrieve, resolveEntry, manifestToSources,
// normalizeAndValidate), and `stripInternal` does not rewrite the imports that
// reference them — tagging those produced .d.ts files that failed to compile
// for any consumer using skipLibCheck: false.
// ---------------------------------------------------------------------------

/** A source after loading: raw entries plus the version to apply. @internal */
export type KnowledgeLoadedSource = {
  id: string;
  version: string;
  entries: KnowledgeEntryInput[];
};

/** Options for normalizing + validating a set of sources before indexing. */
export type KnowledgeNormalizeOptions = {
  manifestVersion: string;
};

/** Normalized entries paired with the validation outcome. */
export type KnowledgeNormalizeResult = {
  entries: NormalizedKnowledgeEntry[];
  validation: KnowledgeValidationResult;
};

/** Retrieval tuning after config + SDK defaults are merged. */
export type KnowledgeResolvedRetrieval = {
  candidateLimit: number;
  resultLimit: number;
  relationLimit: number;
  fieldWeights: KnowledgeFieldWeights;
  exactBoost: number;
  aliasBoost: number;
};

/** One scored retrieval candidate with its signal breakdown, for traces. */
export type KnowledgeScoredCandidate = {
  id: string;
  score: number;
  exact: boolean;
  alias: boolean;
  lexical: number;
  fieldScores: Partial<Record<KnowledgeFieldName, number>>;
  matchedPhrases: string[];
};

/** The selected primary + relationship-expanded entries for one turn. */
export type KnowledgeSelection = {
  primary: NormalizedKnowledgeEntry[];
  expanded: NormalizedKnowledgeEntry[];
  candidates: KnowledgeScoredCandidate[];
  confidence: KnowledgeRetrievalConfidence;
  candidateCount: number;
};

/** The assembled ephemeral-context string plus its diagnostics. */
export type KnowledgeAssembledContext = {
  assembledContext: string;
  citations: KnowledgeCitation[];
  contextTokens: number;
  truncated: boolean;
};

/** Per-turn input to `KnowledgeGroundingEngine.ground()`. */
export type KnowledgeGroundingInput = {
  query: string;
  recentTurns?: KnowledgeConversationTurn[];
  scope?: KnowledgeRequestScope;
};

/**
 * The engine's per-turn output: the ephemeral context to inject (null on
 * no-match, when disabled, or on fail-open), the aggregate metadata for the
 * result, and the full retrieval for host diagnostics.
 */
export type KnowledgeGroundingOutcome = {
  ephemeralContext: EphemeralContext | null;
  metadata: KnowledgeGroundingMetadata;
  retrieval: KnowledgeRetrievalResult | null;
};

/** Snapshot of engine health for telemetry and host introspection. */
export type KnowledgeEngineStatus = {
  enabled: boolean;
  ready: boolean;
  entryCount: number;
  lastError: string | null;
  validationIssues: KnowledgeValidationIssue[];
};
