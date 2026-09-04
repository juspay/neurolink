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
  NativeGenerateLoopArgs,
  NativeGenerateLoopResult,
  ToolExecutionSummaryInternal,
} from "../types/index.js";
import { guardToolExecutor } from "./toolExecutionGuards.js";

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
  const instruction =
    "When you give your final answer, respond with only a single JSON object " +
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

  for (let step = 0; step < args.maxSteps; step++) {
    steps = step + 1;
    const runThisStep = () =>
      args.runStep(() =>
        args.doGenerate({
          prompt: args.conversation,
          ...(args.tools && args.tools.length > 0 ? { tools: args.tools } : {}),
          // The v3 call option is an OBJECT — `{ type: "none" }`. Passing the
          // bare string "none" type-checks against `unknown` and is then
          // dropped by every converter that switches on `choice.type`, so the
          // re-ask silently went out unchanged. Caught by the stand-in asserting
          // the wire body, not by any live provider.
          ...(reasked
            ? { toolChoice: { type: "none" } }
            : args.toolChoice !== undefined
              ? { toolChoice: args.toolChoice }
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

    const parts = asParts(res.content);
    // Each step REPLACES the text rather than appending: the final step's
    // answer is the turn's answer, matching what generateText reported.
    text = parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
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
    inputTokens += readTotal(usage?.inputTokens);
    outputTokens += readTotal(usage?.outputTokens);
    const inShaped = usage?.inputTokens as
      | { cacheRead?: number; cacheWrite?: number }
      | undefined;
    cacheReadTokens += inShaped?.cacheRead ?? 0;
    cacheWriteTokens += inShaped?.cacheWrite ?? 0;

    const calls = parts.filter((p) => p.type === "tool-call");
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
      } else if (rejection) {
        // An error tool-result rather than a throw: the model gets to see what
        // was wrong and correct it on the next step, which is what the SDK's
        // own validation did.
        failure = `Tool ${name}: ${rejection}`;
        output = { error: failure };
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
      });
      resultParts.push({ type: "tool-result", toolCallId: id, output });
    }
    args.conversation.push({ role: "tool", content: resultParts });
  }

  return {
    text,
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
