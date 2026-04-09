/**
 * Phase-based tool access policy for the autoresearch experiment loop.
 */

import type {
  ExperimentPhase,
  PhaseToolPolicy,
} from "../types/autoresearchTypes.js";

const PHASE_POLICIES: Record<ExperimentPhase, PhaseToolPolicy> = {
  bootstrap: {
    activeTools: [
      "research_get_context",
      "research_read_file",
      "research_checkpoint",
    ],
    forcedTool: "research_get_context",
  },
  baseline: {
    activeTools: [
      "research_run_experiment",
      "research_parse_log",
      "research_record",
      "research_accept",
      "research_checkpoint",
    ],
    forcedTool: "research_run_experiment",
  },
  propose: {
    activeTools: ["research_get_context", "research_read_file"],
    forcedTool: "research_get_context",
  },
  edit: {
    activeTools: [
      "research_read_file",
      "research_write_candidate",
      "research_diff",
    ],
  },
  commit: {
    activeTools: ["research_commit_candidate"],
    forcedTool: "research_commit_candidate",
  },
  run: {
    activeTools: ["research_run_experiment"],
    forcedTool: "research_run_experiment",
  },
  evaluate: {
    activeTools: ["research_parse_log", "research_inspect_failure"],
    forcedTool: "research_parse_log",
  },
  record: {
    activeTools: ["research_record", "research_checkpoint"],
    forcedTool: "research_record",
  },
  accept_or_revert: {
    activeTools: ["research_accept", "research_revert", "research_checkpoint"],
  },
};

export function getPhaseToolPolicy(phase: ExperimentPhase): PhaseToolPolicy {
  const p = PHASE_POLICIES[phase];
  return { activeTools: [...p.activeTools], forcedTool: p.forcedTool };
}

/**
 * Returns all research tool names across all phases.
 */
export function getAllResearchToolNames(): string[] {
  const names = new Set<string>();
  for (const policy of Object.values(PHASE_POLICIES)) {
    for (const tool of policy.activeTools) {
      names.add(tool);
    }
  }
  return [...names];
}
