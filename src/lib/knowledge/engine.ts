/**
 * KnowledgeGroundingEngine — the provider-neutral orchestrator.
 *
 * Loads the source set once at construction, reuses the process-level
 * in-memory index cache when possible, and runs one retrieval + context
 * assembly per eligible turn. The engine's snapshot is never reset after
 * construction — sources are supplied only via the constructor config.
 *
 * The engine never throws from `ground()` — any failure fails open to "no
 * grounding" with a `failureReason`, so an informational turn is never broken.
 * It performs no logging and no telemetry itself; the client wiring reads
 * `getStatus()`/the outcome metadata and emits spans.
 */

import type {
  EphemeralContext,
  KnowledgeEngineStatus,
  KnowledgeGroundingConfig,
  KnowledgeGroundingInput,
  KnowledgeGroundingMetadata,
  KnowledgeGroundingOutcome,
  KnowledgeIndexSnapshot,
  KnowledgeResolvedRetrieval,
  KnowledgeRetrievalConfig,
  KnowledgeRetrievalRequest,
  KnowledgeRetrievalResult,
  KnowledgeSource,
  KnowledgeValidationIssue,
} from "../types/index.js";
import { assembleKnowledgeContext } from "./context.js";
import {
  DEFAULT_ALIAS_BOOST,
  DEFAULT_CANDIDATE_LIMIT,
  DEFAULT_EXACT_BOOST,
  DEFAULT_FIELD_WEIGHTS,
  DEFAULT_RECENT_TURNS,
  DEFAULT_RELATION_LIMIT,
  DEFAULT_RESULT_LIMIT,
  DEFAULT_TIMEOUT_MS,
} from "./defaults.js";
import { getOrBuildKnowledgeIndexSnapshot } from "./indexCache.js";
import { retrieve } from "./retrieval.js";
import { withTimeout } from "../utils/async/withTimeout.js";

/** Fallback source version when a source (or manifest) declares none. */
const FALLBACK_VERSION = "0";

const resolveRetrieval = (
  retrieval: KnowledgeRetrievalConfig | undefined,
): KnowledgeResolvedRetrieval => ({
  candidateLimit: retrieval?.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT,
  resultLimit: retrieval?.resultLimit ?? DEFAULT_RESULT_LIMIT,
  relationLimit: retrieval?.relationLimit ?? DEFAULT_RELATION_LIMIT,
  fieldWeights: retrieval?.fieldWeights ?? DEFAULT_FIELD_WEIGHTS,
  exactBoost: retrieval?.exactBoost ?? DEFAULT_EXACT_BOOST,
  aliasBoost: retrieval?.aliasBoost ?? DEFAULT_ALIAS_BOOST,
});

const emptyMetadata = (
  durationMs: number,
  failureReason?: string,
): KnowledgeGroundingMetadata => ({
  retrievalMode: "lexical",
  selectedIds: [],
  expandedIds: [],
  candidateCount: 0,
  contextTokens: 0,
  truncated: false,
  durationMs,
  failureReason,
});

export class KnowledgeGroundingEngine {
  private readonly config: KnowledgeGroundingConfig;
  private readonly resolved: KnowledgeResolvedRetrieval;
  private snapshot: KnowledgeIndexSnapshot | null = null;
  private buildPromise: Promise<void> | null = null;
  private lastError: string | null = null;
  private validationIssues: KnowledgeValidationIssue[] = [];
  private readonly now: () => number;

  constructor(
    config: KnowledgeGroundingConfig,
    now: () => number = () => Date.now(),
  ) {
    this.config = config;
    this.resolved = resolveRetrieval(config.retrieval);
    this.now = now;
    if (config.enabled && config.sources && config.sources.length > 0) {
      this.buildPromise = this.build(config.sources).catch((error) => {
        this.lastError = String(error);
      });
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  /** Resolve once the one-time build settles. Safe to call before every turn. */
  async ready(): Promise<void> {
    if (this.buildPromise) {
      await this.buildPromise;
    }
  }

  getStatus(): KnowledgeEngineStatus {
    return {
      enabled: this.config.enabled,
      ready: this.snapshot !== null,
      entryCount: this.snapshot?.entryCount ?? 0,
      lastError: this.lastError,
      validationIssues: this.validationIssues,
    };
  }

  private async build(sources: KnowledgeSource[]): Promise<void> {
    const { snapshot, validation } = await getOrBuildKnowledgeIndexSnapshot(
      sources,
      FALLBACK_VERSION,
      this.resolved.fieldWeights,
    );
    this.validationIssues = validation.issues;
    if (!validation.ok) {
      // Never load a partially valid registry — leave the index unbuilt.
      const errorCount = validation.issues.filter(
        (issue) => issue.level === "error",
      ).length;
      this.lastError = `knowledge validation failed with ${errorCount} error(s)`;
      return;
    }
    // The snapshot may be newly built or reused from another NeuroLink instance
    // in this process. It is immutable and safe to share across conversations.
    this.snapshot = snapshot;
    this.lastError = null;
  }

  private buildRequest(
    input: KnowledgeGroundingInput,
  ): KnowledgeRetrievalRequest {
    const scope = input.scope ?? {};
    return {
      query: input.query,
      recentTurns: (input.recentTurns ?? []).slice(-DEFAULT_RECENT_TURNS),
      enabledIntegrations: scope.enabledIntegrations ?? [],
    };
  }

  /**
   * Retrieve + assemble for one turn. Returns the ephemeral context to inject
   * (or null), aggregate metadata, and the full retrieval. Never throws.
   */
  async ground(
    input: KnowledgeGroundingInput,
  ): Promise<KnowledgeGroundingOutcome> {
    const started = this.now();
    const wallClockStarted = Date.now();
    if (!this.config.enabled) {
      return {
        ephemeralContext: null,
        metadata: emptyMetadata(0),
        retrieval: null,
      };
    }
    try {
      const timeoutMs = this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const outcome = await withTimeout(
        (async (): Promise<KnowledgeGroundingOutcome> => {
          await this.ready();
          const snapshot = this.snapshot;
          if (!snapshot) {
            return {
              ephemeralContext: null,
              metadata: emptyMetadata(this.now() - started, "index-not-ready"),
              retrieval: null,
            };
          }
          const request = this.buildRequest(input);
          const selection = retrieve(
            snapshot,
            request,
            this.resolved,
            this.config.blockedDomains,
          );
          const assembled = assembleKnowledgeContext(
            selection,
            this.config.context,
          );
          const durationMs = this.now() - started;

          const retrieval: KnowledgeRetrievalResult = {
            entries: [...selection.primary, ...selection.expanded],
            assembledContext: assembled.assembledContext,
            confidence: selection.confidence,
            citations: assembled.citations,
            selectedEntryIds: selection.primary.map((entry) => entry.id),
            expandedEntryIds: selection.expanded.map((entry) => entry.id),
            candidateCount: selection.candidateCount,
            contextTokens: assembled.contextTokens,
            truncated: assembled.truncated,
            durationMs,
          };
          const metadata: KnowledgeGroundingMetadata = {
            retrievalMode: "lexical",
            selectedIds: retrieval.selectedEntryIds,
            expandedIds: retrieval.expandedEntryIds,
            candidateCount: selection.candidateCount,
            contextTokens: assembled.contextTokens,
            truncated: assembled.truncated,
            durationMs,
            confidence: selection.confidence,
          };

          // Nothing to inject when retrieval found nothing (or all matches were filtered out).
          if (!assembled.assembledContext) {
            return { ephemeralContext: null, metadata, retrieval };
          }
          const ephemeralContext: EphemeralContext = {
            content: assembled.assembledContext,
            kind: "knowledge",
            trusted: true,
            citations: assembled.citations,
            metadata: { confidence: selection.confidence },
          };
          return { ephemeralContext, metadata, retrieval };
        })(),
        timeoutMs,
        `Knowledge grounding timed out after ${timeoutMs}ms`,
      );
      // Promise timers cannot pre-empt synchronous indexing/scoring work. Check
      // elapsed wall time as well so an over-budget synchronous pass still
      // fails open instead of injecting a late result.
      if (Date.now() - wallClockStarted > timeoutMs) {
        throw new Error(`Knowledge grounding timed out after ${timeoutMs}ms`);
      }
      return outcome;
    } catch (error) {
      // Fail open: no grounding rather than a broken turn.
      return {
        ephemeralContext: null,
        metadata: emptyMetadata(this.now() - started, String(error)),
        retrieval: null,
      };
    }
  }
}
