/**
 * Per-search retrieval planning.
 *
 * `RAGPipeline.query()` resolves four knobs — `topK`, `hybrid`, `graph`,
 * `rerank` — and every one of them is config with an optional per-call
 * override. Nothing inspects the query. The same plan is used for "what is
 * the refund window?" (one precise passage, an exact phrase worth matching
 * lexically) and "how does billing relate to entitlements?" (many passages,
 * relationships between documents).
 *
 * One decision request answers all four for the query in hand, in ~400ms.
 * Every answer is a *suggestion*: an explicit per-call option always wins,
 * and a capability the pipeline was not configured with can never be turned
 * on by a model — `graph: true` against a pipeline with no graph index would
 * be a failure, not a plan.
 *
 * @module rag/retrieval/searchDecision
 */

import {
  gateDecisionBoolean,
  readDecisionScore,
} from "../../utils/decisionAnswers.js";
import { logger } from "../../utils/logger.js";
import type {
  DecisionCallerFn,
  SearchPlanCapabilities,
  SearchPlanResult,
} from "../../types/index.js";

/**
 * How many passages the question needs, narrowest → widest, as multiples of
 * the configured default. A `score` rather than a number: a decision model
 * places things on an ordered scale well and reads digits as text badly.
 */
const BREADTH_CRITERIA: string[] = [
  "One specific fact, definition or value. A single passage answers it completely.",
  "A handful of related points — a procedure, a short comparison, one topic explained.",
  "Several distinct areas that each need their own supporting passage.",
  "A broad survey that needs evidence from across the whole corpus.",
];

/** Multiplier applied to the configured topK, indexed by breadth level. */
const BREADTH_MULTIPLIER: number[] = [0.5, 1, 1.5, 2.5];

/** Below this the breadth reading is ignored and the configured topK stands. */
const MIN_BREADTH_CONFIDENCE = 0.5;

/** Absolute bounds on a suggested topK, whatever the multiplier produces. */
const MIN_TOP_K = 1;
const MAX_TOP_K = 50;

/**
 * Ask how this particular query should be retrieved.
 *
 * Returns `null` when nothing should change — no decision provider, a failed
 * call, or an answer set that suggests nothing. Every returned field is
 * optional and means "use this unless the caller said otherwise".
 */
export async function decideSearchPlan(
  query: string,
  decide: DecisionCallerFn,
  capabilities: SearchPlanCapabilities,
): Promise<SearchPlanResult | null> {
  if (!query.trim()) {
    return null;
  }

  const questions: Record<string, unknown> = {
    breadth: {
      type: "score",
      instructions:
        "How much supporting material does answering this question require from a document collection?",
      criteria: BREADTH_CRITERIA,
    },
  };

  // Only ask about a capability the pipeline actually has. An answer nobody
  // can act on costs input tokens and invites the mistake of acting on it.
  if (capabilities.canHybrid) {
    questions.hybrid = {
      type: "boolean",
      instructions:
        "This question contains exact terms that must be matched literally — an identifier, error code, file name, version number, API name, or a quoted phrase — rather than only a topic to match by meaning.",
    };
  }
  if (capabilities.canGraph) {
    questions.graph = {
      type: "boolean",
      instructions:
        "Answering this requires connecting information that lives in separate documents, such as how two things relate, what depends on what, or tracing a chain across sources.",
    };
  }
  if (capabilities.canRerank) {
    questions.rerank = {
      type: "boolean",
      instructions:
        "This question is specific enough that the ORDER of the retrieved passages matters — a nearly-right passage would produce a wrong answer, so precision is worth an extra ranking pass.",
    };
  }

  const result = await decide({
    state: { query: query.slice(0, 4000) },
    // The map is assembled dynamically above; its members are all valid
    // question shapes, which the cast asserts once here rather than at four
    // separate construction sites.
    questions: questions as Parameters<DecisionCallerFn>[0]["questions"],
    timeoutMs: capabilities.timeoutMs,
  });

  if (!result) {
    return null;
  }

  const plan: SearchPlanResult = {
    model: result.model,
    latencyMs: result.latencyMs,
  };

  const breadth = readDecisionScore(result.answers, "breadth");
  if (breadth && breadth.confidence >= MIN_BREADTH_CONFIDENCE) {
    const level = Math.max(
      0,
      Math.min(BREADTH_MULTIPLIER.length - 1, Math.round(breadth.score)),
    );
    const multiplier = BREADTH_MULTIPLIER[level] ?? 1;
    plan.topK = Math.max(
      MIN_TOP_K,
      Math.min(MAX_TOP_K, Math.round(capabilities.defaultTopK * multiplier)),
    );
    plan.breadthLevel = level;
  }

  if (capabilities.canHybrid) {
    plan.hybrid = gateDecisionBoolean(result.answers, "hybrid");
  }
  if (capabilities.canGraph) {
    plan.graph = gateDecisionBoolean(result.answers, "graph");
  }
  if (capabilities.canRerank) {
    plan.rerank = gateDecisionBoolean(result.answers, "rerank");
  }

  const suggested =
    plan.topK !== undefined ||
    plan.hybrid !== undefined ||
    plan.graph !== undefined ||
    plan.rerank !== undefined;
  if (!suggested) {
    return null;
  }

  logger.debug("[RAG] Search plan decided", {
    model: result.model,
    latencyMs: result.latencyMs,
    topK: plan.topK,
    hybrid: plan.hybrid,
    graph: plan.graph,
    rerank: plan.rerank,
  });
  return plan;
}
