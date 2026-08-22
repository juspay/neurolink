/**
 * Google `generateContent` wire format.
 *
 * The Gemini CLI honours `GOOGLE_GEMINI_BASE_URL`, so it can be pointed at this
 * proxy with no vendor cooperation — verified live: with the variable set the
 * CLI reached the proxy and failed with `ModelNotFoundError: 404`, which is the
 * right answer from a proxy that had no route to answer it. This module is the
 * missing half.
 *
 * Three differences from the Claude and OpenAI shapes drive everything here:
 *
 * - Roles are `user` / `model`, not `user` / `assistant`.
 * - The system prompt is a sibling `systemInstruction`, not a turn.
 * - Generation settings nest under `generationConfig`.
 *
 * Token counts also have their own names — `promptTokenCount`,
 * `candidatesTokenCount`, `totalTokenCount` — and the CLI reads them to render
 * its own usage line, so getting them wrong is visible to the user rather than
 * merely wrong in a log.
 */

import type {
  ParsedGeminiRequest,
  ProxyGeminiContent,
  ProxyGeminiPart,
  StreamSerializerAdapter,
} from "../types/index.js";

/** Google's role for assistant turns. */
const MODEL_ROLE = "model";

function partsToText(parts: ProxyGeminiPart[] | undefined): string {
  if (!Array.isArray(parts)) {
    return "";
  }
  return parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .filter(Boolean)
    .join("");
}

function partsToImages(parts: ProxyGeminiPart[] | undefined): string[] {
  if (!Array.isArray(parts)) {
    return [];
  }
  return parts
    .map((p) => p?.inlineData?.data)
    .filter((d): d is string => typeof d === "string" && d.length > 0);
}

/**
 * Parse a `generateContent` body into the shape the translation engine takes.
 *
 * The final user turn becomes `prompt`, with Google's `model` role mapped to
 * `assistant` so downstream providers see a role they understand.
 *
 * `conversationMessages` carries EVERY turn, the final one included. That
 * looks redundant next to `prompt`, and it is the contract the shared engine
 * expects: `buildTranslationOptions` does `conversationMessages.slice(0, -1)`
 * to derive history, because the final turn is already being sent as `prompt`.
 * `claudeFormat` and `openaiFormat` both push unconditionally for that reason.
 * Excluding the last turn here — the intuitive reading of "history" — made the
 * engine's slice eat one real turn instead, so every multi-turn Gemini request
 * silently lost its most recent message.
 */
export function parseGeminiRequest(
  model: string,
  body: Record<string, unknown>,
  stream: boolean,
): ParsedGeminiRequest {
  const contents = Array.isArray(body.contents)
    ? (body.contents as ProxyGeminiContent[])
    : [];
  const generationConfig = (body.generationConfig ?? {}) as Record<
    string,
    unknown
  >;

  const systemInstruction = body.systemInstruction as
    | ProxyGeminiContent
    | undefined;
  const systemPrompt = systemInstruction
    ? partsToText(systemInstruction.parts)
    : undefined;

  const turns = contents.map((c) => ({
    role: c?.role === MODEL_ROLE ? "assistant" : "user",
    content: partsToText(c?.parts),
    images: partsToImages(c?.parts),
  }));

  // The last user turn is the prompt. A request whose final turn is a model
  // turn (the CLI does this when continuing) leaves an empty prompt rather
  // than replaying the assistant's own words as input.
  let prompt = "";
  let images: string[] = [];
  const conversationMessages: Array<{ role: string; content: string }> = [];
  for (let i = 0; i < turns.length; i += 1) {
    const isLast = i === turns.length - 1;
    if (isLast && turns[i].role === "user") {
      prompt = turns[i].content;
      images = turns[i].images;
    }
    // Unconditional — see the slice-contract note on this function.
    conversationMessages.push({
      role: turns[i].role,
      content: turns[i].content,
    });
  }

  // The engine's `slice(0, -1)` drops the LAST entry on the assumption that it
  // is the turn already being sent as `prompt`. That holds only when the
  // request ends with a user turn. The Gemini CLI also continues from a model
  // turn, and there the last entry is a real assistant reply — so the slice ate
  // it, which is the same lost-turn bug one case further along.
  //
  // A terminal placeholder restores the invariant: the slice removes this
  // instead of the model turn. It is never sent anywhere — `prompt` is
  // independently "" in exactly this case, so the placeholder only exists to be
  // consumed by the slice.
  if (turns.length > 0 && turns[turns.length - 1].role !== "user") {
    conversationMessages.push({ role: "user", content: "" });
  }

  const numeric = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined;

  const stops = generationConfig.stopSequences;

  return {
    model,
    maxTokens: numeric(generationConfig.maxOutputTokens),
    temperature: numeric(generationConfig.temperature),
    topP: numeric(generationConfig.topP),
    systemPrompt: systemPrompt || undefined,
    stream,
    prompt,
    images,
    conversationMessages,
    tools: {},
    stopSequences: Array.isArray(stops)
      ? stops.filter((x): x is string => typeof x === "string")
      : undefined,
  };
}

/** Google's finishReason vocabulary. */
function toGeminiFinishReason(reason: string): string {
  switch (reason) {
    case "length":
    case "max_tokens":
      return "MAX_TOKENS";
    case "content_filter":
      return "SAFETY";
    default:
      return "STOP";
  }
}

function usageMetadata(usage: {
  input: number;
  output: number;
  total: number;
}): Record<string, number> {
  return {
    promptTokenCount: usage.input,
    candidatesTokenCount: usage.output,
    totalTokenCount: usage.total || usage.input + usage.output,
  };
}

/** Build a complete `generateContent` response body. */
/**
 * Render a tool call as text.
 *
 * The proxy does not forward tool calls in Google's `functionCall` part shape:
 * the CLI drives tools locally, so a `functionCall` it never asked for would be
 * an unresolvable pending call. Text is what it can act on. Both the streaming
 * serializer and the non-streaming builder go through here so the two paths
 * cannot drift.
 */
export function renderGeminiToolUse(name: string, input: unknown): string {
  return `\n[tool: ${name} ${JSON.stringify(input)}]\n`;
}

export function buildGeminiResponse(
  text: string,
  finishReason: string,
  usage: { input: number; output: number; total: number },
  modelVersion: string,
  toolCalls?: ReadonlyArray<{
    toolName: string;
    args: Record<string, unknown>;
  }>,
): Record<string, unknown> {
  // A translated result can legitimately carry tool calls and no text — the
  // engine's hasTranslatedOutput() accepts that. Rendering only `text` there
  // handed the client parts[0].text === "" with finishReason STOP, which reads
  // as "the model answered nothing" rather than "the model wants a tool".
  const rendered = (toolCalls ?? [])
    .map((call) => renderGeminiToolUse(call.toolName, call.args))
    .join("");
  const body = `${text}${rendered}`;
  return {
    candidates: [
      {
        content: { role: MODEL_ROLE, parts: [{ text: body }] },
        finishReason: toGeminiFinishReason(finishReason),
        index: 0,
      },
    ],
    usageMetadata: usageMetadata(usage),
    modelVersion,
  };
}

/** Google's error envelope, which the CLI parses to classify failures. */
export function buildGeminiErrorResponse(
  status: number,
  message: string,
  statusText = "INVALID_ARGUMENT",
): Response {
  return new Response(
    JSON.stringify({ error: { code: status, message, status: statusText } }),
    { status, headers: { "content-type": "application/json" } },
  );
}

/**
 * SSE serializer for `streamGenerateContent?alt=sse`.
 *
 * Google streams whole `GenerateContentResponse` objects, one per `data:`
 * frame, rather than the deltas Claude and OpenAI send. Each frame therefore
 * carries a complete `candidates[0].content.parts[0].text` holding only that
 * chunk's text — the CLI concatenates them — and the final frame is the one
 * that carries `finishReason` and `usageMetadata`.
 */
export class GeminiStreamSerializer {
  private readonly model: string;

  constructor(model: string) {
    this.model = model;
  }

  private frame(payload: Record<string, unknown>): string {
    return `data: ${JSON.stringify(payload)}\n\n`;
  }

  /** Google sends no preamble frame; the first delta is the first frame. */
  start(): string[] {
    return [];
  }

  pushDelta(text: string): string[] {
    if (!text) {
      return [];
    }
    return [
      this.frame({
        candidates: [
          { content: { role: MODEL_ROLE, parts: [{ text }] }, index: 0 },
        ],
        modelVersion: this.model,
      }),
    ];
  }

  /**
   * Tool calls are surfaced as text.
   *
   * The translation engine can emit a tool call, but the Gemini CLI drives its
   * own tools locally and does not expect `functionCall` parts from a plain
   * `generateContent`. Emitting one would make the CLI wait for a tool result
   * that is never coming; rendering it as text keeps the turn terminating.
   */
  pushToolUse(_id: string, name: string, input: unknown): string[] {
    return this.pushDelta(renderGeminiToolUse(name, input));
  }

  finish(
    finishReason: string,
    usage: { input: number; output: number; total: number },
  ): string[] {
    return [
      this.frame({
        candidates: [
          {
            content: { role: MODEL_ROLE, parts: [{ text: "" }] },
            finishReason: toGeminiFinishReason(finishReason),
            index: 0,
          },
        ],
        usageMetadata: usageMetadata(usage),
        modelVersion: this.model,
      }),
    ];
  }

  /**
   * Errors ride the stream as a Google error object.
   *
   * Once headers are sent the status code is spent, so the CLI can only learn
   * about a mid-stream failure from the body.
   */
  emitError(message: string): string[] {
    return [
      this.frame({
        error: { code: 500, message, status: "INTERNAL" },
      }),
    ];
  }
}

/** Adapter so the translation engine can drive this like the other two. */
export function createGeminiSerializerAdapter(
  model: string,
): StreamSerializerAdapter {
  const s = new GeminiStreamSerializer(model);
  return {
    start: () => s.start(),
    pushDelta: (text: string) => s.pushDelta(text),
    pushToolUse: (id: string, name: string, input: unknown) =>
      s.pushToolUse(id, name, input),
    finish: (
      finishReason: string,
      usage: { input: number; output: number; total: number },
    ) => s.finish(finishReason, usage),
    emitError: (message: string) => s.emitError(message),
  };
}
