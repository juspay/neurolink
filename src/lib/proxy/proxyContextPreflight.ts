import {
  getRuntimeContextWindow,
  getRuntimeOutputCeiling,
} from "../constants/contextWindows.js";
import {
  estimateTokens,
  IMAGE_TOKEN_ESTIMATE,
} from "../utils/tokenEstimation.js";
import { truncateHistoryForBudget } from "./proxyHistoryTruncation.js";
import type {
  ProxyContextPolicy,
  ProxyContextEvidence,
  ProxyPreparedContext,
} from "../types/index.js";

/** Local refusal before spending a provider request; never silently truncates. */
export class ProxyContextPreflightError extends Error {
  readonly status = 400;
  readonly retryable = false;
  constructor(
    readonly code: string,
    message: string,
    readonly evidence?: ProxyContextEvidence,
  ) {
    super(message);
    this.name = "ProxyContextPreflightError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function positive(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/** An invalid configured budget must not silently disable protection. */
export function parseProxyContextPolicy(
  raw: string | undefined,
): ProxyContextPolicy {
  if (!raw?.trim()) {
    return {};
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new ProxyContextPreflightError(
      "invalid_context_policy",
      "NEUROLINK_PROXY_CONTEXT_POLICY must contain a JSON object",
    );
  }
  if (!record(value)) {
    throw new ProxyContextPreflightError(
      "invalid_context_policy",
      "Proxy context policy must be an object",
    );
  }
  for (const key of Object.keys(value)) {
    if (
      ![
        "maxInputTokens",
        "outputReserveTokens",
        "enforceDiscoveredLimits",
        "toolAllowlist",
        "models",
      ].includes(key)
    ) {
      throw new ProxyContextPreflightError(
        "invalid_context_policy",
        `Unknown context policy field: ${key}`,
      );
    }
  }
  for (const key of ["maxInputTokens", "outputReserveTokens"] as const) {
    if (value[key] !== undefined && !positive(value[key])) {
      throw new ProxyContextPreflightError(
        "invalid_context_policy",
        `${key} must be a positive safe integer`,
      );
    }
  }
  if (
    value.enforceDiscoveredLimits !== undefined &&
    typeof value.enforceDiscoveredLimits !== "boolean"
  ) {
    throw new ProxyContextPreflightError(
      "invalid_context_policy",
      "enforceDiscoveredLimits must be boolean",
    );
  }
  if (
    value.toolAllowlist !== undefined &&
    (!Array.isArray(value.toolAllowlist) ||
      value.toolAllowlist.length > 4096 ||
      !value.toolAllowlist.every(
        (name) =>
          typeof name === "string" && name.length > 0 && name.length <= 256,
      ))
  ) {
    throw new ProxyContextPreflightError(
      "invalid_context_policy",
      "toolAllowlist must be a bounded array of tool names",
    );
  }
  if (value.models !== undefined) {
    if (!record(value.models) || Object.keys(value.models).length > 1024) {
      throw new ProxyContextPreflightError(
        "invalid_context_policy",
        "models must be a bounded map of provider/model limits",
      );
    }
    for (const [key, limit] of Object.entries(value.models)) {
      // Read each budget into a local before comparing: narrowing from the
      // `positive` predicate does not survive several `||` operands when it is
      // applied to a property access, and the looser compiler flags used by the
      // package build then see `unknown` on one side of `>=`.
      const contextWindow = record(limit) ? limit.contextWindow : undefined;
      const maxOutputTokens = record(limit) ? limit.maxOutputTokens : undefined;
      const compactAt = record(limit) ? limit.compactAtTokens : undefined;
      const compactTo = record(limit) ? limit.compactToTokens : undefined;
      if (
        !key.includes("/") ||
        !record(limit) ||
        !positive(contextWindow) ||
        (maxOutputTokens !== undefined && !positive(maxOutputTokens)) ||
        (compactAt !== undefined &&
          (!positive(compactAt) || compactAt >= contextWindow)) ||
        (compactTo !== undefined &&
          (!positive(compactTo) ||
            !positive(compactAt) ||
            compactTo >= compactAt)) ||
        (compactAt !== undefined && compactTo === undefined) ||
        Object.keys(limit).some(
          (k) =>
            ![
              "contextWindow",
              "maxOutputTokens",
              "compactAtTokens",
              "compactToTokens",
            ].includes(k),
        )
      ) {
        throw new ProxyContextPreflightError(
          "invalid_context_policy",
          "Each model needs an explicit provider/model key, a positive contextWindow/output limit, and a compaction target below its trigger",
        );
      }
    }
  }
  return value as ProxyContextPolicy;
}
let lastPolicyText: string | undefined;
let lastPolicy: ProxyContextPolicy | undefined;
export function getProxyContextPolicy(): ProxyContextPolicy {
  const raw = process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
  if (!lastPolicy || raw !== lastPolicyText) {
    lastPolicy = parseProxyContextPolicy(raw);
    lastPolicyText = raw;
  }
  return lastPolicy;
}

/** Collect referenced tools so selection never strands a historical call/result. */
function referencedTools(
  value: unknown,
  names: Set<string>,
  seen = new WeakSet<object>(),
  depth = 0,
): void {
  if (!value || typeof value !== "object" || depth > 128 || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      referencedTools(item, names, seen, depth + 1);
    }
    return;
  }
  const item = value as Record<string, unknown>;
  if (
    ["tool_use", "function_call", "tool_call", "function"].includes(
      String(item.type),
    )
  ) {
    const name = item.name ?? item.toolName;
    if (typeof name === "string") {
      names.add(name);
    }
    if (record(item.function) && typeof item.function.name === "string") {
      names.add(item.function.name);
    }
  }
  if (typeof item.toolName === "string") {
    names.add(item.toolName);
  }
  if (record(item.functionCall) && typeof item.functionCall.name === "string") {
    names.add(item.functionCall.name);
  }
  for (const [key, child] of Object.entries(item)) {
    if (key !== "tools") {
      referencedTools(child, names, seen, depth + 1);
    }
  }
}
function toolName(tool: unknown): string | undefined {
  if (!record(tool)) {
    return undefined;
  }
  if (typeof tool.name === "string") {
    return tool.name;
  }
  return record(tool.function) && typeof tool.function.name === "string"
    ? tool.function.name
    : undefined;
}
function toolCount(value: unknown): number {
  return Array.isArray(value)
    ? value.length
    : record(value)
      ? Object.keys(value).length
      : 0;
}

/** Estimate without copying binary payloads or building another giant JSON string. */
function estimateValue(
  value: unknown,
  provider: string,
  state: { multimodal: boolean },
  seen = new WeakSet<object>(),
  depth = 0,
): number {
  if (typeof value === "string") {
    return estimateTokens(value, provider) + 1;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return 1;
  }
  if (!value || typeof value !== "object") {
    return 0;
  }
  if (depth > 128) {
    throw new ProxyContextPreflightError(
      "context_structure_too_deep",
      "Request context nesting exceeds the supported limit",
    );
  }
  if (seen.has(value)) {
    return 0;
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.reduce<number>(
        (sum, item) =>
          sum + estimateValue(item, provider, state, seen, depth + 1) + 4,
        0,
      );
    }
    const item = value as Record<string, unknown>;
    if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
      state.multimodal = true;
      return IMAGE_TOKEN_ESTIMATE;
    }
    if (typeof item.text === "string" && Array.isArray(item.images)) {
      state.multimodal = item.images.length > 0 || state.multimodal;
      return (
        estimateTokens(item.text, provider) +
        item.images.length * IMAGE_TOKEN_ESTIMATE
      );
    }
    if (
      [
        "input_image",
        "image",
        "image_url",
        "input_audio",
        "audio",
        "file",
        "input_file",
        "document",
      ].includes(String(item.type)) ||
      item.inlineData !== undefined ||
      item.fileData !== undefined
    ) {
      state.multimodal = true;
      return IMAGE_TOKEN_ESTIMATE;
    }
    return Object.entries(item).reduce(
      (sum, [key, child]) =>
        sum +
        estimateTokens(key, provider) +
        estimateValue(child, provider, state, seen, depth + 1),
      0,
    );
  } finally {
    seen.delete(value);
  }
}

/**
 * Preserve history, instructions and tool-call pairs. Tool reduction is explicit
 * opt-in; discovered/configured context limits never use a guessed model default.
 */
export function prepareProxyRequestContext<T extends object>(args: {
  provider: string;
  model: string;
  body: T;
  /** Original protocol body before an adapter flattens historical tool calls. */
  toolReferenceBody?: unknown;
  maxOutputTokens?: number;
  policy?: ProxyContextPolicy;
}): ProxyPreparedContext<T> {
  const policy = args.policy ?? getProxyContextPolicy();
  const original = args.body as Record<string, unknown>;
  let body = args.body;
  const tools = original.tools;
  if (policy.toolAllowlist) {
    const keep = new Set(policy.toolAllowlist);
    referencedTools(original, keep);
    referencedTools(args.toolReferenceBody, keep);
    const choice = original.tool_choice;
    if (record(choice)) {
      if (typeof choice.name === "string") {
        keep.add(choice.name);
      }
      if (record(choice.function) && typeof choice.function.name === "string") {
        keep.add(choice.function.name);
      }
    }
    const selected = Array.isArray(tools)
      ? tools.filter((tool) => {
          const name = toolName(tool);
          return name === undefined || keep.has(name);
        })
      : record(tools)
        ? Object.fromEntries(
            Object.entries(tools).filter(([name]) => keep.has(name)),
          )
        : tools;
    body = {
      ...args.body,
      tools: selected,
      ...(Array.isArray(original.toolFilter)
        ? {
            toolFilter: original.toolFilter.filter(
              (name) => typeof name !== "string" || keep.has(name),
            ),
          }
        : {}),
    };
  }
  let wire = body as Record<string, unknown>;
  // Fixed cost and history are tracked separately: truncation can remove the
  // only image in a request, and a sticky flag would then keep the ceiling
  // check disabled for a request that no longer carries any media.
  const fixedState = { multimodal: false };
  let historyState = { multimodal: false };
  const isMultimodal = (): boolean =>
    fixedState.multimodal || historyState.multimodal;
  const provider = args.provider === "codex" ? "openai" : args.provider;
  const toolsTokensEstimate = estimateValue(wire.tools, provider, fixedState);
  const instructionsTokensEstimate = [
    wire.instructions,
    wire.system,
    wire.systemPrompt,
    wire.systemInstruction,
  ].reduce<number>(
    (sum, value) => sum + estimateValue(value, provider, fixedState),
    0,
  );
  const schemaTokensEstimate = [
    wire.response_format,
    wire.output_config,
    wire.structuredOutput,
    wire.schema,
    record(wire.text) ? wire.text.format : undefined,
    record(wire.generationConfig)
      ? wire.generationConfig.responseSchema
      : undefined,
    record(wire.generationConfig)
      ? wire.generationConfig.responseJsonSchema
      : undefined,
  ].reduce<number>(
    (sum, value) => sum + estimateValue(value, provider, fixedState),
    0,
  );
  const estimate = (value: unknown): number =>
    estimateValue(value, provider, historyState);
  const fixedTokensEstimate =
    24 +
    schemaTokensEstimate +
    toolsTokensEstimate +
    instructionsTokensEstimate;
  const historyTokensEstimate = (): number =>
    [
      wire.messages,
      wire.input,
      wire.contents,
      wire.conversationMessages,
      wire.prompt,
    ].reduce<number>((sum, value) => sum + estimate(value), 0);
  let inputTokensEstimate = fixedTokensEstimate + historyTokensEstimate();
  const configured = policy.models?.[`${args.provider}/${args.model}`];
  // Cost control: reduce history before the refusal checks below, so those see
  // the reduced estimate and a bounded request is dispatched instead of a
  // rejected one. Runs on every dispatch path because every path lands here.
  let historyModified = false;
  let historyUnitsRemoved = 0;
  const inputTokensBeforeTruncation = inputTokensEstimate;
  if (
    configured?.compactAtTokens !== undefined &&
    configured.compactToTokens !== undefined &&
    inputTokensEstimate > configured.compactAtTokens
  ) {
    const truncated = truncateHistoryForBudget({
      body,
      inputTokensEstimate,
      targetTokens: configured.compactToTokens,
      estimate,
    });
    if (truncated.historyModified) {
      body = truncated.body;
      wire = body as Record<string, unknown>;
      historyModified = true;
      historyUnitsRemoved = truncated.unitsRemoved;
      historyState = { multimodal: false };
      inputTokensEstimate = fixedTokensEstimate + historyTokensEstimate();
    }
    // The design requires a typed local failure rather than a silent dispatch
    // above the configured bound: fixed context alone, or the one unit that
    // must be retained, can exceed the target with nothing left to remove.
    if (inputTokensEstimate > configured.compactToTokens) {
      throw new ProxyContextPreflightError(
        "proxy_context_compaction_failed",
        `Compaction could not bring ${args.provider}/${args.model} within ` +
          `${configured.compactToTokens} tokens; ${inputTokensEstimate} remain ` +
          `after removing every removable unit`,
      );
    }
  }
  const discovered = getRuntimeContextWindow(args.provider, args.model);
  const contextWindow = configured?.contextWindow ?? discovered;
  const outputCeiling =
    configured?.maxOutputTokens ??
    getRuntimeOutputCeiling(args.provider, args.model);
  const requestedOutput =
    args.maxOutputTokens ??
    wire.max_tokens ??
    wire.max_output_tokens ??
    wire.maxTokens ??
    (record(wire.generationConfig)
      ? wire.generationConfig.maxOutputTokens
      : undefined);
  if (requestedOutput !== undefined && !positive(requestedOutput)) {
    throw new ProxyContextPreflightError(
      "invalid_output_budget",
      "Requested output tokens must be a positive safe integer",
    );
  }
  // Codex rejects max_output_tokens; its model-owned ceiling, not Claude's
  // requested max_tokens, must be reserved when bridging to that transport.
  const outputTokensReserve =
    args.provider === "codex"
      ? (outputCeiling ?? policy.outputReserveTokens ?? 32768)
      : positive(requestedOutput)
        ? requestedOutput
        : (outputCeiling ?? policy.outputReserveTokens ?? 32768);
  const evidence: ProxyContextEvidence = {
    provider: args.provider,
    model: args.model,
    inputTokensEstimate,
    toolsTokensEstimate,
    instructionsTokensEstimate,
    schemaTokensEstimate,
    outputTokensReserve,
    reasoningIncludedInOutputReserve: true,
    ...(contextWindow ? { contextWindow } : {}),
    contextLimitSource: configured
      ? "configured"
      : discovered
        ? "discovered"
        : "unknown",
    tokenCountSource: "estimated",
    multimodalEstimate: isMultimodal(),
    originalToolCount: toolCount(tools),
    retainedToolCount: toolCount(wire.tools),
    historyModified,
    ...(historyModified
      ? { historyUnitsRemoved, inputTokensBeforeTruncation }
      : {}),
  };
  if (
    policy.maxInputTokens !== undefined &&
    inputTokensEstimate > policy.maxInputTokens
  ) {
    throw new ProxyContextPreflightError(
      "proxy_input_budget_exceeded",
      "Estimated input exceeds the configured proxy token budget; reduce context or tools before retrying",
      evidence,
    );
  }
  if (
    outputCeiling !== undefined &&
    positive(requestedOutput) &&
    args.provider !== "codex" &&
    requestedOutput > outputCeiling
  ) {
    throw new ProxyContextPreflightError(
      "proxy_output_budget_exceeded",
      "Requested output exceeds the serving model's known output limit",
      evidence,
    );
  }
  if (
    contextWindow !== undefined &&
    policy.enforceDiscoveredLimits !== false &&
    !isMultimodal() &&
    inputTokensEstimate + outputTokensReserve > contextWindow
  ) {
    throw new ProxyContextPreflightError(
      "proxy_context_window_exceeded",
      `Estimated input plus output/reasoning reserve exceeds the serving model context window; ${historyModified ? "history was truncated and still does not fit" : "no history was truncated"}`,
      evidence,
    );
  }
  return {
    body,
    inputTokensEstimate,
    outputTokensReserve,
    totalTokensReservation: inputTokensEstimate + outputTokensReserve,
    evidence,
  };
}
