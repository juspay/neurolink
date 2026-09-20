/**
 * Tool routing by decision model.
 *
 * The shipped router asks a generative model for `{servers: string[]}` on a
 * 15-second budget. That shape cannot express uncertainty: a server is in the
 * list or it is not, and the only recourse for a model that is unsure is to
 * include it. A decision model answers one yes/no question per server and
 * returns a *calibrated probability* for each, in one round trip of ~400ms
 * costing ~$0.00002.
 *
 * The asymmetry that follows is the whole point. Keeping a server that was not
 * needed costs a few hundred tokens of tool definitions. Dropping a server
 * that WAS needed costs the turn — the model cannot call a tool it was never
 * shown, and it has no way to ask for it back. So a server is excluded only on
 * a *confident no*; unanswered, mistyped and near-coin-flip answers all keep
 * it. This is the same reasoning as the classifier's asymmetric upgrade and
 * downgrade bars, applied to a different decision.
 *
 * Fail-open in every direction: returns `null` whenever the caller should
 * carry on as if this module did not exist.
 *
 * @module core/toolRoutingDecision
 */

import { decisionKey, gateDecisionBoolean } from "../utils/decisionAnswers.js";
import { logger } from "../utils/logger.js";
import type {
  DecisionCallerFn,
  DecisionQuestion,
  ToolRoutingCatalogEntry,
  ToolRoutingDecisionOutcome,
} from "../types/index.js";

/** Namespace for the per-server questions in the batch. */
const SERVER_NAMESPACE = "server";

/**
 * How confidently the model must answer "no" before a server's tools are
 * withheld. Deliberately high — a wrongly dropped server breaks the turn,
 * while a wrongly kept one costs tokens.
 */
const DEFAULT_MIN_DROP_CONFIDENCE = 0.6;

/**
 * Upper bound on the query text sent as state. The query is untrusted and may
 * attempt injection; the blast radius is bounded (the worst outcome is keeping
 * MORE already-registered tools, since ids are never read back off the wire —
 * answers are matched by position), but an unbounded state would still be
 * billed and could push the request past the model's input ceiling.
 */
const MAX_STATE_CHARS = 10000;

/**
 * Cap on servers asked about in one batch. Latency is flat in question count,
 * so this is purely an input-size guard: state plus all questions must stay
 * under the ~64K request ceiling.
 */
const MAX_SERVERS = 200;

/**
 * The question wording, and why it is this wording.
 *
 * The obvious phrasing — "answering this request will require calling at least
 * one tool from this server", with a `false` criterion reading "this server is
 * unrelated, OR the request needs no tool at all" — was measured against a
 * 10-request × 5-server labelled set. It separated correctly but weakly:
 * unrelated servers averaged p=0.31 and reached 0.80, so at the 0.6 drop bar
 * only 12 of 39 unneeded servers were dropped.
 *
 * Naming the server, asking in the present tense about what carrying out the
 * request *involves*, and splitting the bundled `false` criterion into a single
 * claim moved unrelated servers to a mean of p=0.03 with a maximum of 0.35 —
 * **37 of 39** dropped at the same bar, still with zero wrong drops.
 *
 * The lesson generalises: a decision model reads literally, and an `or` in a
 * criterion is two questions wearing one coat.
 */
function serverQuestion(server: ToolRoutingCatalogEntry): DecisionQuestion {
  const does = uncapitalize(describeServer(server));
  return {
    type: "boolean",
    instructions: `The request needs the "${server.id}" server, which can ${does}.`,
    criteria: {
      true: `Carrying out the request involves ${does}.`,
      false: `The request is about something else; nothing it asks for involves ${does}.`,
    },
  };
}

/**
 * Lowercase only the FIRST character. A plain `toLowerCase()` would turn
 * "Read and write GitHub issues" into "…github issues", and the proper noun is
 * often the strongest signal in the sentence.
 */
function uncapitalize(text: string): string {
  // charAt rather than an index: it returns "" for an empty string, so this
  // needs no length guard and no non-null assertion.
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * Ask one yes/no question per routable server and return the servers to keep.
 *
 * Returns `null` when the caller should fall through to its existing path:
 * no decision provider, a failed call, fewer than two servers, or an answer
 * set that would change nothing.
 */
export async function selectServersByDecision(
  userQuery: string,
  routableServers: ToolRoutingCatalogEntry[],
  decide: DecisionCallerFn,
  options?: { timeoutMs?: number; minDropConfidence?: number },
): Promise<ToolRoutingDecisionOutcome | null> {
  if (!userQuery || routableServers.length < 2) {
    return null;
  }

  const servers = routableServers.slice(0, MAX_SERVERS);
  const questions: Record<string, DecisionQuestion> = {};
  servers.forEach((server, index) => {
    questions[decisionKey(SERVER_NAMESPACE, index)] = serverQuestion(server);
  });

  const result = await decide({
    // Structured state rather than a prompt string: the vendor accepts JSON,
    // and naming the fields is what stops the model reading the catalogue as
    // part of the user's request.
    state: {
      request: userQuery.slice(0, MAX_STATE_CHARS),
      available_servers: servers.map((server) => ({
        name: server.id,
        does: describeServer(server),
        tool_count: server.toolNames.length,
      })),
    },
    questions,
    timeoutMs: options?.timeoutMs,
  });

  if (!result) {
    return null;
  }

  const minConfidence =
    options?.minDropConfidence ?? DEFAULT_MIN_DROP_CONFIDENCE;

  const selectedServerIds: string[] = [];
  const excludedServerIds: string[] = [];
  let answered = 0;

  servers.forEach((server, index) => {
    const verdict = gateDecisionBoolean(
      result.answers,
      decisionKey(SERVER_NAMESPACE, index),
      { minConfidence },
    );
    if (verdict !== undefined) {
      answered += 1;
    }
    // Only a confident `false` drops a server. `undefined` (unanswered, wrong
    // type, or too close to a coin flip) and `true` both keep it.
    if (verdict === false) {
      excludedServerIds.push(server.id);
    } else {
      selectedServerIds.push(server.id);
    }
  });

  // Servers past the cap were never asked about, so they are kept — a server
  // that was not offered to the model must never be dropped by its silence.
  for (const server of routableServers.slice(MAX_SERVERS)) {
    selectedServerIds.push(server.id);
  }

  if (answered === 0) {
    logger.debug("[ToolRouting] Decision router returned no usable answers", {
      routableServerCount: routableServers.length,
    });
    return null;
  }

  if (excludedServerIds.length === 0) {
    // Nothing to exclude is indistinguishable from routing being off, and
    // reporting it as "applied" would make the telemetry claim a narrowing
    // that did not happen.
    return null;
  }

  const excludedSet = new Set(excludedServerIds);
  const excludedToolNames = routableServers
    .filter((server) => excludedSet.has(server.id))
    .flatMap((server) => server.toolNames);

  logger.debug("[ToolRouting] Decision router applied", {
    model: result.model,
    latencyMs: result.latencyMs,
    askedServerCount: servers.length,
    answeredCount: answered,
    keptServerCount: selectedServerIds.length,
    excludedServerCount: excludedServerIds.length,
    excludedToolCount: excludedToolNames.length,
  });

  return {
    selectedServerIds,
    excludedServerIds,
    excludedToolNames,
    answeredCount: answered,
    model: result.model,
    latencyMs: result.latencyMs,
  };
}

/**
 * One line describing what a server is for. Falls back to naming its tools
 * when the host declared no description, since a bare id ("fs", "gh") carries
 * almost no signal and the tool names usually carry a great deal.
 */
function describeServer(server: ToolRoutingCatalogEntry): string {
  if (server.description && server.description.trim().length > 0) {
    return server.description;
  }
  const names = server.toolNames
    .map((name) => name.slice(server.id.length + 1))
    .filter((name) => name.length > 0)
    .slice(0, 12);
  return names.length > 0
    ? `provides the tools: ${names.join(", ")}`
    : `the "${server.id}" server`;
}
