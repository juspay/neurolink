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
 * attempt injection. Ids are never read back off the wire — answers are matched
 * by position — so an injected query cannot name a tool that was not already
 * registered, and the result is only a denylist appended to `excludeTools`. It
 * can still steer a verdict: a confident `false` drops that server's tools for
 * the turn. The reach is bounded, not zero. An unbounded state would also be
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
 * The server capability already exists once in structured state. Referencing
 * that indexed field avoids copying the same long description into the
 * instruction and both criteria while still binding each question to one
 * concrete server.
 */
function serverQuestion(
  server: ToolRoutingCatalogEntry,
  index: number,
): DecisionQuestion {
  return {
    type: "boolean",
    instructions: `Does the request need the "${server.id}" server? Read available_servers[${index}].does.`,
    criteria: {
      true: "Needed.",
      false: "Not needed.",
    },
  };
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
    questions[decisionKey(SERVER_NAMESPACE, index)] = serverQuestion(
      server,
      index,
    );
  });

  const result = await decide({
    site: "toolRouting",
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
