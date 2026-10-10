import { trace } from "@opentelemetry/api";
import {
  JEV_ROUTING_AUDIT_OBSERVATION_NAME,
  JEV_ROUTING_AUDIT_PROVIDER,
  JEV_ROUTING_AUDIT_SCHEMA_VERSION,
} from "../core/constants.js";
import type {
  JevRoutingAuditEvidence,
  ToolRoutingCatalogEntry,
  ToolRoutingDecision,
} from "../types/index.js";
import {
  buildJevRoutingAuditSelection,
  logJevRoutingAuditFailure,
} from "../utils/jevRoutingAudit.js";
import { tracers } from "./tracers.js";

/** Create a native child only after the actual routing exclusions are applied. */
export const recordJevRoutingAudit = (
  evidence: JevRoutingAuditEvidence | null,
  decision: ToolRoutingDecision | undefined,
  catalog: ToolRoutingCatalogEntry[],
  finalExcludedTools: string[],
  preExistingExcludedTools: string[] = [],
): void => {
  try {
    if (evidence === null || evidence.provider !== JEV_ROUTING_AUDIT_PROVIDER) {
      return;
    }
    if (decision === undefined) {
      return;
    }
    const serverRoutingWasApplied =
      decision.strategy === "decision" &&
      decision.outcome === "applied" &&
      decision.granularity !== "tool";
    if (!serverRoutingWasApplied) {
      return;
    }
    const parent = trace.getActiveSpan();
    if (!parent?.isRecording()) {
      return;
    }
    const selection = buildJevRoutingAuditSelection(
      evidence.input.candidateServers,
      catalog,
      finalExcludedTools,
      preExistingExcludedTools,
    );
    let evaluable = false;
    if (evidence.input.evidenceComplete && selection.selectionComplete) {
      evaluable = true;
    }
    const output = {
      retainedServers: selection.retainedServers,
      excludedServers: selection.excludedServers,
      routingStrategy: decision.strategy,
      outcome: decision.outcome,
      evaluable: evaluable,
      excludedToolCount: selection.excludedToolCount,
    };
    const span = tracers.decision.startSpan(
      JEV_ROUTING_AUDIT_OBSERVATION_NAME,
      {
        attributes: {
          "langfuse.observation.type": "span",
          "langfuse.observation.input": JSON.stringify(evidence.input),
          "langfuse.observation.output": JSON.stringify(output),
          "jev.audit.schema_version": JEV_ROUTING_AUDIT_SCHEMA_VERSION,
          "jev.audit.evaluable": evaluable,
          "jev.audit.provider": evidence.provider,
          "jev.audit.model": evidence.model,
          "jev.audit.decision_succeeded": true,
          "jev.audit.source_span_id": parent.spanContext().spanId,
        },
      },
    );
    span.end();
  } catch (error: unknown) {
    logJevRoutingAuditFailure(error);
  }
};
