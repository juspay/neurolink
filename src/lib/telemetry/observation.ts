import {
  createObservationAttributes,
  createTraceAttributes,
  LangfuseOtelSpanAttributes,
} from "@langfuse/tracing";
import type { Span } from "@opentelemetry/api";
import { WARNING_FINISH_REASONS } from "../constants/telemetry.js";
import type {
  GenerationRecord,
  ObservationAttributes,
  ObservationLevel,
  ObservationType,
  RawUsageObject,
  TraceContent,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { calculateCost, hasPricing } from "../utils/pricing.js";
import { extractTokenUsage } from "../utils/tokenUtils.js";
import {
  ATTR,
  isFinishedAttribute,
  recordsSpanContent,
  recordsSpanInputs,
  spanContentAttribute,
  spanModelRequestAttribute,
} from "./attributes.js";
import { assistantMessages, withoutToolArguments } from "./chatMessages.js";
import { inTurnlessTree, isNestedOperation } from "./tracers.js";

// Recording must never fail the call it describes: a field that cannot be
// built is dropped and logged, and the rest of the record is still written.
function attempt<T>(what: string, compute: () => T, fallback: T): T {
  try {
    return compute();
  } catch (error) {
    logger.debug(`[telemetry] Could not record ${what}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

function contentAttribute(value: unknown): string {
  return typeof value === "string" && isFinishedAttribute(value)
    ? value
    : spanContentAttribute(value);
}

function redactedIO<T extends Pick<TraceContent, "input" | "output">>(
  attrs: T,
): T {
  return {
    ...attrs,
    input:
      attrs.input !== undefined && recordsSpanInputs()
        ? contentAttribute(attrs.input)
        : undefined,
    output:
      attrs.output !== undefined && recordsSpanContent()
        ? contentAttribute(attrs.output)
        : undefined,
  };
}

/**
 * @description Stamps Langfuse observation attributes on a span, plus a `gen_ai.observation.type` marker so the exporter pipeline recognizes it whatever its tracer scope. Input and output are credential-masked and capped at `SPAN_ATTRIBUTE_MAX_CHARS` before serialization, and the status message is recorded as given; an attribute that `spanContentAttribute` or `spanModelRequestAttribute` already produced is not masked again, and input is left out when `NEUROLINK_RECORD_INPUTS=false`. Nothing is built when the span is not recording.
 * @param span {Span} - Span to describe.
 * @param type {ObservationType} - Observation type Langfuse renders the span as.
 * @param attrs {ObservationAttributes} - Input, output, model, parameters, usage, cost, level and metadata to record.
 * @returns {void} Nothing.
 */
export function observe(
  span: Span,
  type: ObservationType,
  attrs: ObservationAttributes,
): void {
  if (!span.isRecording()) {
    return;
  }
  attempt(
    "observation",
    () =>
      span.setAttributes({
        ...createObservationAttributes(type, {
          ...redactedIO(attrs),
          ...(attrs.statusMessage !== undefined && {
            statusMessage: attrs.statusMessage,
          }),
        }),
        [ATTR.GEN_AI_OBSERVATION]: type,
      }),
    undefined,
  );
}

/**
 * @description Sets the trace-level input, output and metadata on a span, credential-masked and capped like `observe`, with input left out when `NEUROLINK_RECORD_INPUTS=false` and nothing built when the span is not recording. Each metadata entry is written as its own `langfuse.trace.metadata.<key>` attribute, redacted like input and output.
 * @param span {Span} - Span whose trace is described.
 * @param io {TraceContent} - Trace input, output and metadata.
 * @returns {void} Nothing.
 */
export function observeTrace(span: Span, io: TraceContent): void {
  if (!span.isRecording()) {
    return;
  }
  attempt(
    "trace",
    () => {
      const { metadata, ...content } = io;
      span.setAttributes(createTraceAttributes(redactedIO(content)));
      for (const [key, value] of Object.entries(metadata ?? {})) {
        if (value !== undefined) {
          span.setAttribute(
            `${LangfuseOtelSpanAttributes.TRACE_METADATA}.${key}`,
            spanContentAttribute(value),
          );
        }
      }
    },
    undefined,
  );
}

/**
 * @description Maps any provider's token usage onto Langfuse usage-detail keys.
 * @param usage {RawUsageObject | undefined | null} - Token usage in any naming convention NeuroLink normalizes.
 * @returns {Record<string, number>} `input`, `output` and `total`, plus `cache_read_input_tokens`, `cache_creation_input_tokens` and `reasoning` when reported.
 */
export function usageDetails(
  usage: RawUsageObject | undefined | null,
): Record<string, number> {
  const tokens = extractTokenUsage(usage, { calculateCacheSavings: false });
  const details: Record<string, number> = {
    input: tokens.input,
    output: tokens.output,
    total: tokens.total,
  };
  if (tokens.cacheReadTokens !== undefined) {
    details.cache_read_input_tokens = tokens.cacheReadTokens;
  }
  if (tokens.cacheCreationTokens !== undefined) {
    details.cache_creation_input_tokens = tokens.cacheCreationTokens;
  }
  if (tokens.reasoning !== undefined) {
    details.reasoning = tokens.reasoning;
  }
  return details;
}

// ai@6 reports `{ unified, raw }` where other providers report a string; any
// other shape carries no reason worth recording.
function finishReasonText(finishReason: unknown): string | undefined {
  if (typeof finishReason === "string") {
    return finishReason;
  }
  if (typeof finishReason !== "object" || finishReason === null) {
    return undefined;
  }
  if ("unified" in finishReason && typeof finishReason.unified === "string") {
    return finishReason.unified;
  }
  return "raw" in finishReason && typeof finishReason.raw === "string"
    ? finishReason.raw
    : undefined;
}

/**
 * @description Picks the Langfuse level for a model call that finished without throwing.
 * @param finishReason {unknown} - Provider finish reason: a string in any casing, or an ai@6 `{ unified, raw }` object; any other value is ignored.
 * @param aborted {boolean | undefined} - Whether the caller aborted or closed the call early.
 * @returns {ObservationLevel | undefined} `"WARNING"` for truncated, filtered, aborted or empty output, otherwise `undefined`.
 */
export function observationLevel(
  finishReason?: unknown,
  aborted?: boolean,
): ObservationLevel | undefined {
  if (
    aborted ||
    WARNING_FINISH_REASONS.has(
      finishReasonText(finishReason)?.toLowerCase() ?? "",
    )
  ) {
    return "WARNING";
  }
  return undefined;
}

// The model that answered sets the price. A served model without one (an
// alias, a router's own name) falls back to the model that was requested.
function pricedModel(call: GenerationRecord): string | undefined {
  const { provider, model, responseModel } = call;
  return provider && responseModel && hasPricing(provider, responseModel)
    ? responseModel
    : (model ?? responseModel);
}

function generationCost(call: GenerationRecord): number {
  const model = pricedModel(call);
  return call.usage && call.provider && model
    ? calculateCost(
        call.provider,
        model,
        extractTokenUsage(call.usage, { calculateCacheSavings: false }),
      )
    : 0;
}

function recordGeneration(span: Span, call: GenerationRecord): void {
  const parameters: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(call.modelParameters ?? {})) {
    if (value !== undefined) {
      parameters[key] = value;
    }
  }
  const cost = attempt("generation cost", () => generationCost(call), 0);
  const request = call.input;
  const input =
    request === undefined || !recordsSpanInputs()
      ? undefined
      : attempt(
          "generation input",
          () => spanModelRequestAttribute(request),
          undefined,
        );
  const output = attempt(
    "generation output",
    () => {
      const messages = assistantMessages(call.output);
      if (messages === undefined) {
        return undefined;
      }
      // A tool call's arguments are the tool's input, so they follow the
      // inputs setting even though they arrive in the model's output.
      return spanContentAttribute(
        recordsSpanInputs() ? messages : withoutToolArguments(messages),
      );
    },
    undefined,
  );
  const finishReason = finishReasonText(call.finishReason);
  observe(span, "generation", {
    model: call.responseModel ?? call.model,
    modelParameters:
      Object.keys(parameters).length > 0 ? parameters : undefined,
    input,
    output,
    usageDetails: call.usage ? usageDetails(call.usage) : undefined,
    costDetails: cost > 0 ? { total: cost } : undefined,
    completionStartTime: call.completionStartTime,
    level: observationLevel(finishReason, call.aborted),
    metadata:
      call.provider || finishReason
        ? {
            ...(call.provider && { provider: call.provider }),
            ...(finishReason && { finishReason }),
          }
        : undefined,
  });
  // Inside a NeuroLink turn the turn owns the trace's input and output, and
  // under a host span the host does. Only a direct loop that opened its own
  // root has nothing above it, so only its generations write them.
  if (!isNestedOperation(span) && inTurnlessTree(span)) {
    observeTrace(span, { input, output });
  }
}

/**
 * @description Records a model request on its span as a Langfuse generation: model, defined parameters, input, output, usage, cost and level. Safe to call once with the request and again with the response; unset fields leave earlier values in place. The request is redacted once, input and the arguments of the tool calls in the output are left out when `NEUROLINK_RECORD_INPUTS=false`, and nothing is built when the span is not recording. Cost is priced on the response model when it has a price, otherwise on the requested model. A field that cannot be built is left out; this never throws into the model call.
 * @param span {Span} - Span of one model request.
 * @param call {GenerationRecord} - What was sent and what came back.
 * @returns {void} Nothing.
 */
export function observeGeneration(span: Span, call: GenerationRecord): void {
  if (!span.isRecording()) {
    return;
  }
  attempt("generation", () => recordGeneration(span, call), undefined);
}
