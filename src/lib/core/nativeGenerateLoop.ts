/**
 * The multi-step tool loop that the ai package's `generateText` used to supply.
 *
 * It deliberately loops over a provider's own `doGenerate` rather than over any
 * streaming machinery. That is the whole lesson of the reverted first attempt:
 * `doGenerate` is where the JSON-versus-SSE wire choice lives, along with the
 * 400 retry, the context-overflow refit and the provider's own structured-output
 * handling. Looping around the streaming path instead silently changed
 * generate() to send `stream: true` and broke ten providers against a
 * non-streaming body.
 *
 * Every provider whose delegating model exposes a v3-shaped `doGenerate` can
 * share this: the v3 result shape (`content` parts, `finishReason`, `usage`) is
 * the same across Anthropic, the OpenAI-compatible family and SageMaker.
 */

import { logger } from "../utils/logger.js";
import type {
  FinishReason,
  NativeGenerateLoopArgs,
  NativeGenerateLoopResult,
  StepResult,
  StepToolChoiceInput,
  Tool,
  ToolExecutionSummaryInternal,
} from "../types/index.js";
import { guardToolExecutor } from "./toolExecutionGuards.js";

const DEFAULT_TOOL_CHOICE_STEPS = 1;

/**
 * A choice that compels a tool call: `"required"` or a named tool, in either
 * the NeuroLink string/object shape or the v3 `{ type }` object shape.
 * `"auto"` and `"none"` leave the model free (or forbidden) and are never
 * time-limited.
 */
const isForcedToolChoice = (choice: unknown): boolean => {
  if (choice === "required") {
    return true;
  }
  if (typeof choice === "object" && choice !== null) {
    const type = (choice as { type?: unknown }).type;
    return type === "required" || type === "tool" || type === "any";
  }
  return false;
};

/**
 * `toolChoiceSteps` is a count of leading steps, so anything but a
 * non-negative integer is meaningless. Fall back to the default with a WARN
 * rather than throw: a bad knob should not fail a turn that would otherwise
 * complete, but it must not be silent either.
 */
const normalizeToolChoiceSteps = (value: number | undefined): number => {
  if (value === undefined) {
    return DEFAULT_TOOL_CHOICE_STEPS;
  }
  if (Number.isInteger(value) && value >= 0) {
    return value;
  }
  logger.warn(
    `toolChoiceSteps must be a non-negative integer; got ${String(value)} — using ${DEFAULT_TOOL_CHOICE_STEPS}`,
  );
  return DEFAULT_TOOL_CHOICE_STEPS;
};

/**
 * Fields of a `prepareStep` result that the former AI-SDK loop honoured and
 * the native loops do not. Their presence is reported once per process: a
 * hook written for the old loop that hides a destructive tool through
 * `experimental_activeTools` would otherwise fail open in silence.
 */
const IGNORED_PREPARE_STEP_FIELDS = [
  "model",
  "activeTools",
  "experimental_activeTools",
] as const;
let warnedIgnoredPrepareStepFields = false;

const warnIgnoredPrepareStepFields = (prepared: unknown): void => {
  if (
    warnedIgnoredPrepareStepFields ||
    !prepared ||
    typeof prepared !== "object"
  ) {
    return;
  }
  const present = IGNORED_PREPARE_STEP_FIELDS.filter(
    (field) => (prepared as Record<string, unknown>)[field] !== undefined,
  );
  if (present.length === 0) {
    return;
  }
  warnedIgnoredPrepareStepFields = true;
  logger.warn(
    `prepareStep returned ${present.join(", ")}, which the native loops ignore — only toolChoice is honoured. Use toolFilter / excludeTools for tool visibility and set the model on the request. (reported once)`,
  );
};

/**
 * Await the caller's hook without letting it outlive the turn: a hook that
 * stalls (a remote policy service that never answers) parked the loop past
 * every deadline, because nothing observed the abort signal while the hook
 * was pending. An abort rejects with the signal's reason so the loop's
 * cancellation path handles it like any other abort.
 */
const awaitPrepareStep = <T>(
  pending: PromiseLike<T>,
  abortSignal: AbortSignal | undefined,
): Promise<T> => {
  if (!abortSignal) {
    return Promise.resolve(pending);
  }
  if (abortSignal.aborted) {
    // The hook has already been invoked. Its promise is abandoned here, so
    // a rejection it settles with later must have a handler: without one it
    // is an unhandled rejection, which terminates Node by default.
    void Promise.resolve(pending).catch(() => undefined);
    return Promise.reject(abortReason(abortSignal));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(abortReason(abortSignal));
    abortSignal.addEventListener("abort", onAbort, { once: true });
    // Both handlers stay attached after an abort wins the race, so a hook
    // that rejects afterwards is observed (the second `reject` is a no-op).
    Promise.resolve(pending).then(
      (value) => {
        abortSignal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        abortSignal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
};

const abortReason = (signal: AbortSignal): unknown => {
  if (signal.reason instanceof Error) {
    return signal.reason;
  }
  const error = new Error(
    typeof signal.reason === "string" ? signal.reason : "Request was aborted.",
  );
  error.name = "AbortError";
  return error;
};

/**
 * Decide the tool choice for ONE step of a multi-step loop.
 *
 * A forced choice held on every step compels a tool call on every step, so
 * the loop could only end when `maxSteps` ran out — which is exactly what
 * happened before this existed. The rule: a forced choice applies while
 * `step < toolChoiceSteps` (default 1), after which the model chooses
 * (`"auto"`). `"auto"` and `"none"` pass through unchanged on every step.
 *
 * A `prepareStep` hook, when supplied, runs first and its `toolChoice` wins
 * for the step — including a forced choice past `toolChoiceSteps`, which is
 * how a caller forces a tool on step 3 only. A hook that returns no
 * `toolChoice` defers to the rule. Nothing else on the hook's result is read.
 *
 * A hook that THROWS is logged and treated as "no override": the steps
 * already billed are kept and the rule decides. An abort of the turn while
 * the hook is pending is not a hook failure and is re-thrown. The two are
 * told apart by the LOOP's signal, never by the error's name: a hook that
 * rejects with its own `AbortError` (its policy service timed out) has
 * failed, and must not end a turn the caller never cancelled.
 */
export async function resolveStepToolChoice(
  input: StepToolChoiceInput,
): Promise<unknown> {
  if (input.prepareStep) {
    let prepared: Awaited<
      ReturnType<NonNullable<StepToolChoiceInput["prepareStep"]>>
    >;
    try {
      prepared = await awaitPrepareStep(
        input.prepareStep({
          steps: input.steps,
          stepNumber: input.step,
          maxSteps: input.maxSteps,
          model: input.model,
        }),
        input.abortSignal,
      );
    } catch (hookError) {
      if (input.abortSignal?.aborted) {
        throw abortReason(input.abortSignal);
      }
      logger.warn(
        `prepareStep threw at step ${input.step}; using the default tool choice for this step`,
        {
          error:
            hookError instanceof Error ? hookError.message : String(hookError),
        },
      );
      prepared = undefined;
    }
    warnIgnoredPrepareStepFields(prepared);
    if (prepared?.toolChoice !== undefined) {
      return prepared.toolChoice;
    }
  }
  if (input.base === undefined) {
    return undefined;
  }
  if (
    !isForcedToolChoice(input.base) ||
    input.step < normalizeToolChoiceSteps(input.toolChoiceSteps)
  ) {
    return input.base;
  }
  return "auto";
}

/**
 * Translate a NeuroLink-shape tool choice (`"auto"` / `"none"` /
 * `"required"` / `{ type: "tool", toolName }`) into the v3 call-option
 * OBJECT every `doGenerate` converter switches on. The bare strings were
 * being handed straight to `doGenerate`; Anthropic's converter normalises
 * them, but the OpenAI-compatible one reads `.type` off the value and
 * silently dropped every string form. An already-object value passes
 * through untouched.
 */
export const toV3ToolChoice = (
  choice: unknown,
): Record<string, unknown> | undefined => {
  if (choice === undefined || choice === null) {
    return undefined;
  }
  if (typeof choice === "string") {
    return choice === "auto" || choice === "none" || choice === "required"
      ? { type: choice }
      : undefined;
  }
  if (typeof choice === "object") {
    return choice as Record<string, unknown>;
  }
  return undefined;
};

const KNOWN_FINISH_REASONS: ReadonlySet<string> = new Set([
  "stop",
  "length",
  "content-filter",
  "tool-calls",
  "error",
  "other",
]);

const toFinishReason = (value: string): FinishReason =>
  KNOWN_FINISH_REASONS.has(value) ? (value as FinishReason) : "other";

/**
 * The record of one completed step that `prepareStep` receives in `steps`.
 * Built the same way by every native loop so a hook sees one shape.
 */
export const toPrepareStepRecord = (step: {
  stepNumber: number;
  content: Array<Record<string, unknown>>;
  text: string;
  toolCalls: Array<{ toolName: string; toolCallId: string; input: unknown }>;
  toolResults: Array<{
    toolName: string;
    toolCallId: string;
    output: unknown;
  }>;
  finishReason: string;
  inputTokens: number;
  outputTokens: number;
  /** Prompt-cache tokens for the step, when the provider reports them. */
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}): StepResult<Record<string, Tool>> => {
  const hasCacheDetail =
    step.cacheReadTokens !== undefined || step.cacheWriteTokens !== undefined;
  return {
    stepNumber: step.stepNumber,
    content: step.content as Array<{ type: string } & Record<string, unknown>>,
    text: step.text,
    toolCalls: step.toolCalls,
    toolResults: step.toolResults,
    finishReason: toFinishReason(step.finishReason),
    usage: {
      inputTokens: step.inputTokens,
      outputTokens: step.outputTokens,
      totalTokens: step.inputTokens + step.outputTokens,
      ...(hasCacheDetail
        ? {
            inputTokenDetails: {
              noCacheTokens: step.inputTokens,
              cacheReadTokens: step.cacheReadTokens ?? 0,
              cacheWriteTokens: step.cacheWriteTokens ?? 0,
            },
            cachedInputTokens: step.cacheReadTokens ?? 0,
          }
        : {}),
    },
  };
};

/**
 * Narrow a model handle to the delegating shape this loop drives.
 * `LanguageModel` is a union that includes a bare string id, and a double
 * assertion through unknown is banned by Critical Rule 14.
 */
export const hasNativeDoGenerate = (
  value: unknown,
): value is {
  doGenerate: (
    options: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
} =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { doGenerate?: unknown }).doGenerate === "function";

const asParts = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];

const readTotal = (value: unknown): number =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { total?: unknown }).total === "number"
    ? (value as { total: number }).total
    : 0;

/**
 * Parse a tool call's arguments, distinguishing "no arguments" from "the model
 * emitted something that is not JSON". Silently substituting `{}` for the
 * second case ran the tool with empty input and reported success, so a
 * malformed call looked identical to a legitimate no-arg one.
 */
const parseToolInput = (raw: unknown): { input: unknown; error?: string } => {
  if (typeof raw !== "string") {
    return { input: raw ?? {} };
  }
  if (raw.trim() === "") {
    return { input: {} };
  }
  try {
    return { input: JSON.parse(raw) };
  } catch {
    return { input: {}, error: "arguments were not valid JSON" };
  }
};

/**
 * Validate parsed input against the tool's own schema when it exposes one.
 *
 * `generateText` validated tool input before dispatch; the native loop did
 * not, so a call whose shape the tool rejects reached `execute` and failed
 * inside user code — or worse, did not fail. A Zod schema is detected by
 * `safeParse`; anything else is passed through, since a JSON Schema needs a
 * validator this loop has no business carrying.
 */
const validateToolInput = (
  tool: { inputSchema?: unknown } | undefined,
  input: unknown,
): string | undefined => {
  const schema = tool?.inputSchema as
    | { safeParse?: (v: unknown) => { success: boolean; error?: unknown } }
    | undefined;
  if (typeof schema?.safeParse !== "function") {
    return undefined;
  }
  const result = schema.safeParse(input);
  if (result.success) {
    return undefined;
  }
  const detail =
    result.error instanceof Error ? result.error.message : "schema mismatch";
  return `input did not match the tool's schema: ${detail}`;
};

/**
 * Spell a JSON Schema into the conversation's system turn.
 *
 * The structured-output fallback for vendors that reject or ignore
 * `response_format`. Merged into an existing trailing system message rather
 * than appended as a second one: several self-hosted OpenAI-compatible stacks
 * honour only the first system message, so a second would be dropped and the
 * fallback would silently do nothing.
 */
export const appendJsonSchemaInstruction = (
  conversation: Array<Record<string, unknown>>,
  schema: unknown,
): Array<Record<string, unknown>> => {
  // "value", not "object": a ValidationSchema also accepts array and scalar
  // roots (z.array(...), z.string()), and demanding an object told a
  // compliant model to emit something those roots can never satisfy — so the
  // fallback silently produced nothing for them however well the model
  // complied. The generate path's own re-ask prompt was corrected for this
  // reason; this shared helper, used by both paths, was missed.
  const instruction =
    "When you give your final answer, respond with only a single JSON value " +
    "that conforms to the following JSON Schema. No prose before or after it, " +
    `and no markdown code fence. JSON Schema: ${JSON.stringify(schema)}`;
  const lastSystemIndex = conversation.reduce(
    (found, message, index) => (message.role === "system" ? index : found),
    -1,
  );
  if (lastSystemIndex === -1) {
    return [{ role: "system", content: instruction }, ...conversation];
  }
  const existing = conversation[lastSystemIndex];
  const content =
    typeof existing.content === "string"
      ? `${existing.content}\n\n${instruction}`
      : instruction;
  return conversation.map((message, index) =>
    index === lastSystemIndex ? { ...message, content } : message,
  );
};

export async function runNativeGenerateLoop(
  args: NativeGenerateLoopArgs,
  toolExecutionSummaries: ToolExecutionSummaryInternal[],
): Promise<NativeGenerateLoopResult> {
  const toolsUsed: string[] = [];
  let text = "";
  let reasoning = "";
  let finishReason = "stop";
  let rawFinishReason: string | undefined;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  let steps = 0;
  // One bounded recovery re-ask per turn; see the empty-tool-calls branch.
  let reasked = false;
  // True only while the NEXT step is the recovery re-ask. `reasked` stays set
  // for the rest of the turn, so it cannot distinguish "this step is the
  // re-ask" from "the re-ask already happened" — and degrading a later,
  // unrelated failure would swallow a real error.
  let reaskPending = false;
  // The turn as it stood before the re-ask. The re-ask is a bonus request on
  // top of a call that already produced a result, so if it fails the honest
  // answer is that result — not a thrown turn.
  let preReask:
    | { text: string; finishReason: string; rawFinishReason?: string }
    | undefined;
  const hasTools = Boolean(args.tools && args.tools.length > 0);
  // Completed-step records for `prepareStep`; one per step that returned.
  const stepRecords: StepResult<Record<string, Tool>>[] = [];

  for (let step = 0; step < args.maxSteps; step++) {
    steps = step + 1;
    // The forced-choice window and the caller's hook are resolved BEFORE the
    // re-ask override below: the re-ask has to win, since its whole point is
    // a request with tools disabled.
    // A request with no tools declares no tool_choice either: a hook that
    // forces a tool on a tool-less request (the schema reformat pass starts
    // every pass at step 0) would be a 400 on OpenAI-compatible backends.
    const stepToolChoice = hasTools
      ? await resolveStepToolChoice({
          base: args.toolChoice,
          step,
          toolChoiceSteps: args.toolChoiceSteps,
          prepareStep: args.prepareStep,
          steps: stepRecords,
          maxSteps: args.maxSteps,
          model: args.modelId,
          ...(args.abortSignal ? { abortSignal: args.abortSignal } : {}),
        })
      : undefined;
    const wireToolChoice = toV3ToolChoice(stepToolChoice);
    // Per-step context reclaim. The pre-dispatch budget check runs ONCE and
    // never sees the assistant turns and tool results this loop appends, which
    // is how a long agentic run overflows the model window mid-loop and loses
    // every completed step to a provider 400. The streaming paths have guarded
    // this for a while; generate() did not, so the identical turn reclaimed on
    // stream() and overflowed on generate().
    //
    // The provider supplies the guard because only it knows its wire shape.
    // Returning undefined leaves the conversation byte-identical, so a turn
    // that fits never pays a prompt-cache invalidation.
    const guarded = args.guardConversation?.(args.conversation);
    if (guarded) {
      args.conversation.splice(0, args.conversation.length, ...guarded);
    }
    const runThisStep = () =>
      args.runStep(() =>
        args.doGenerate({
          prompt: args.conversation,
          ...(args.tools && args.tools.length > 0 ? { tools: args.tools } : {}),
          // The v3 call option is an OBJECT — `{ type: "none" }`. Passing the
          // bare string "none" type-checks against `unknown` and is then
          // dropped by every converter that switches on `choice.type`, so the
          // re-ask silently went out unchanged. Caught by the stand-in asserting
          // the wire body, not by any live provider. The same applied to the
          // caller's own string-form choice, hence `toV3ToolChoice` above.
          ...(reasked
            ? { toolChoice: { type: "none" } }
            : wireToolChoice !== undefined
              ? { toolChoice: wireToolChoice }
              : {}),
          ...(args.responseFormat
            ? { responseFormat: args.responseFormat }
            : {}),
          ...(args.providerOptions
            ? { providerOptions: args.providerOptions }
            : {}),
          ...(args.maxOutputTokens
            ? { maxOutputTokens: args.maxOutputTokens }
            : {}),
          ...(args.temperature !== undefined
            ? { temperature: args.temperature }
            : {}),
          ...(args.abortSignal ? { abortSignal: args.abortSignal } : {}),
        }),
      );

    let res: Awaited<ReturnType<typeof args.doGenerate>>;
    try {
      res = await runThisStep();
    } catch (stepError) {
      // Ported from GenerationHandler.recoverEmptyToolCallsFinish's catch: a
      // failed re-ask hands back the turn that already succeeded rather than
      // turning a degraded turn into a thrown one. The native port made the
      // re-ask a `continue`, so the failure surfaced from the NEXT step's
      // doGenerate and propagated instead.
      if (reaskPending && preReask) {
        logger.warn(
          "toolChoice: none re-ask failed; returning the original result",
          {
            error:
              stepError instanceof Error
                ? stepError.message
                : String(stepError),
          },
        );
        text = preReask.text;
        finishReason = preReask.finishReason;
        rawFinishReason = preReask.rawFinishReason;
        break;
      }
      throw stepError;
    }
    reaskPending = false;

    args.observeUsage?.(res.usage);

    const parts = asParts(res.content);
    // Each step REPLACES the text rather than appending: the final step's
    // answer is the turn's answer, matching what generateText reported.
    text = parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("");
    // Reasoner models (DeepSeek `reasoning_content`, gateway `reasoning`,
    // OpenAI o-series) emit reasoning as its own V3 content part.
    //
    // Unlike `text`, this ACCUMULATES across steps. Each step's answer
    // supersedes the last, but each step's reasoning is its own thought:
    // replacing meant a tool loop reported only whatever the final step
    // happened to think, which is usually the shortest part and frequently
    // empty once the model just answers from the tool result. Concatenating
    // with nothing between them is what a stream() consumer accumulates from
    // the per-step reasoning chunks, so both surfaces agree on the turn.
    reasoning += parts
      .filter((p) => p.type === "reasoning" && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("");

    const fr = res.finishReason;
    if (typeof fr === "string") {
      finishReason = fr;
    } else if (typeof fr === "object" && fr !== null) {
      const shaped = fr as { unified?: string; raw?: string };
      finishReason = shaped.unified ?? finishReason;
      rawFinishReason = shaped.raw ?? rawFinishReason;
    }

    const usage = res.usage as
      | { inputTokens?: unknown; outputTokens?: unknown }
      | undefined;
    outputTokens += readTotal(usage?.outputTokens);
    const inShaped = usage?.inputTokens as
      | {
          total?: number;
          noCache?: number;
          cacheRead?: number;
          cacheWrite?: number;
        }
      | undefined;
    // `total` on the shaped input-tokens object is cache-INCLUSIVE (noCache +
    // cacheRead + cacheWrite). Accumulating it into `inputTokens` — while ALSO
    // accumulating cacheRead/cacheWrite below — double-billed every cached
    // token: once folded into `input`, once again as the flat cache fields
    // `calculateCost` prices separately. `noCache` is the disjoint figure
    // `calculateCost` expects; fall back to the inclusive total only when a
    // provider hasn't populated `noCache` (i.e. it never reports cache usage).
    inputTokens +=
      typeof inShaped?.noCache === "number"
        ? inShaped.noCache
        : readTotal(usage?.inputTokens);
    cacheReadTokens += inShaped?.cacheRead ?? 0;
    cacheWriteTokens += inShaped?.cacheWrite ?? 0;

    const calls = parts.filter((p) => p.type === "tool-call");
    const stepInputTokens =
      typeof inShaped?.noCache === "number"
        ? inShaped.noCache
        : readTotal(usage?.inputTokens);
    const stepOutputTokens = readTotal(usage?.outputTokens);
    // `input` is the PARSED object, as the stream loops record it: the v3
    // part carries the raw JSON string, and a hook reading
    // `steps.at(-1)?.toolCalls[0]?.input?.orderId` got undefined on
    // generate() while the same hook worked on stream().
    const stepToolCalls = calls.map((call) => ({
      toolName: String(call.toolName ?? ""),
      toolCallId: String(call.toolCallId ?? ""),
      input: parseToolInput(call.input).input,
    }));
    // Pushed now with empty results and filled in below once the tools have
    // run, so a hook consulted on the next step sees this step's outputs.
    const stepRecord = toPrepareStepRecord({
      stepNumber: step,
      content: parts,
      text,
      toolCalls: stepToolCalls,
      toolResults: [],
      finishReason,
      inputTokens: stepInputTokens,
      outputTokens: stepOutputTokens,
      ...(inShaped?.cacheRead !== undefined ||
      inShaped?.cacheWrite !== undefined
        ? {
            cacheReadTokens: inShaped?.cacheRead ?? 0,
            cacheWriteTokens: inShaped?.cacheWrite ?? 0,
          }
        : {}),
    });
    stepRecords.push(stepRecord);
    if (calls.length === 0) {
      // io.net's Llama endpoint ends a tool loop on `finish_reason:
      // tool_calls` carrying neither a tool call nor any text: the model's
      // JSON-shaped answer trips the vendor's tool-call parser, which drops it
      // and reports `content: null` with no `tool_calls`. There is nothing to
      // execute, so the loop would stop and hand the caller an empty turn even
      // though the tool ran. Replaying the request once with
      // `toolChoice: "none"` returns the answer.
      //
      // Ported from GenerationHandler.recoverEmptyToolCallsFinish, which runs
      // this on the ai-package path. That path is unreachable for every
      // provider driven by this loop — io.net among them, since it is a
      // Tier-2 catalog provider on the OpenAI-compatible base — so without
      // this the recovery would simply not happen for the provider it was
      // written for.
      const emptyToolCallsFinish =
        finishReason === "tool-calls" &&
        text.trim() === "" &&
        hasTools &&
        !reasked &&
        step + 1 < args.maxSteps;
      if (emptyToolCallsFinish) {
        reasked = true;
        reaskPending = true;
        preReask = { text, finishReason, rawFinishReason };
        args.conversation.push({ role: "assistant", content: parts });
        continue;
      }
      break;
    }

    // Tool turns go back in the message-builder shape each provider's own
    // conversion already round-trips: an assistant message of tool-call parts,
    // then one tool message of tool-result parts.
    args.conversation.push({ role: "assistant", content: parts });
    const resultParts: Array<Record<string, unknown>> = [];
    for (const call of calls) {
      const name = String(call.toolName ?? "");
      const id = String(call.toolCallId ?? "");
      const startTime = new Date();
      const parsed = parseToolInput(call.input);
      const input = parsed.input;
      const tool = args.toolsRecord[name] as
        | {
            execute?: (a: unknown, c: unknown) => Promise<unknown>;
            inputSchema?: unknown;
          }
        | undefined;

      let output: unknown;
      let failure: string | undefined;
      const rejection =
        parsed.error ??
        (typeof tool?.execute === "function"
          ? validateToolInput(tool, input)
          : undefined);
      if (typeof tool?.execute !== "function") {
        failure = `Tool not found: ${name}`;
        output = { error: failure };
        args.onRejectedToolCall?.(name, failure, id);
      } else if (rejection) {
        // An error tool-result rather than a throw: the model gets to see what
        // was wrong and correct it on the next step, which is what the SDK's
        // own validation did.
        failure = `Tool ${name}: ${rejection}`;
        output = { error: failure };
        args.onRejectedToolCall?.(name, failure, id);
      } else {
        try {
          // The turn's abort signal and the per-tool cap have to reach the
          // tool, or a wedged tool parks the loop inside `await execute` and
          // outlives the deadline that withTurnTimeout composed. Reuses the
          // guard every other native loop already applies.
          const guarded = guardToolExecutor(name, tool.execute, {
            ...(args.abortSignal ? { abortSignal: args.abortSignal } : {}),
            ...(args.toolTimeoutMs !== undefined
              ? { toolTimeoutMs: args.toolTimeoutMs }
              : {}),
          });
          output = await guarded(input as Record<string, unknown>, {
            toolCallId: id,
            messages: [],
            ...(args.abortSignal ? { abortSignal: args.abortSignal } : {}),
          });
          toolsUsed.push(name);
        } catch (err) {
          failure = err instanceof Error ? err.message : String(err);
          output = { error: failure };
        }
      }

      toolExecutionSummaries.push({
        toolCallId: id,
        toolName: name,
        input,
        ...(failure ? { error: failure } : { output }),
        startTime,
        endTime: new Date(),
        stepIndex: step,
      });
      resultParts.push({ type: "tool-result", toolCallId: id, output });
      stepRecord.toolResults.push({ toolName: name, toolCallId: id, output });
    }
    args.conversation.push({ role: "tool", content: resultParts });
  }

  return {
    text,
    ...(reasoning ? { reasoning } : {}),
    finishReason,
    ...(rawFinishReason ? { rawFinishReason } : {}),
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    toolsUsed,
    steps,
  };
}
