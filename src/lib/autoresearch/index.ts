/**
 * NeuroLink AutoResearch — Autonomous Experiment Engine
 *
 * An autonomous experiment loop that proposes code changes, executes
 * experiments, evaluates results against a deterministic metric, and
 * keeps or discards each change — running unattended for hours.
 *
 * @example
 * ```typescript
 * import { resolveConfig, validateConfig, ResearchStateStore, RepoPolicy, ExperimentRunner, ResultRecorder } from "@juspay/neurolink/autoresearch";
 * ```
 */

// Imported on its own, this entry starts tracing at its first span, as the
// main entry does. The import sits here rather than in the shared tracers so
// that the client entry stays free of the OpenTelemetry Node SDK.
import "../services/server/ai/observability/instrumentation.js";

// Configuration
export { resolveConfig, validateConfig } from "./config.js";

// State management
export { ResearchStateStore } from "./stateStore.js";

// Policy enforcement
export { RepoPolicy } from "./repoPolicy.js";

// Experiment execution
export { ExperimentRunner } from "./runner.js";

// Result tracking
export { ResultRecorder } from "./resultRecorder.js";

// Log parsing
export { parseExperimentSummary } from "./summaryParser.js";

// Phase policy
export { getPhaseToolPolicy, getAllResearchToolNames } from "./phasePolicy.js";

// Prompt compilation
export { PromptCompiler } from "./promptCompiler.js";

// Research tools
export { createResearchTools } from "./tools.js";

// Worker orchestrator
export { ResearchWorker } from "./worker.js";

// Errors
export { AutoresearchError, AutoresearchErrorCodes } from "./errors.js";
