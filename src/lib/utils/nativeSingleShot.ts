/** One no-tool turn against a provider's delegating model, without ai's loop. */
import type { SingleShotRequest, SingleShotResult } from "../types/index.js";

const hasDoGenerate = (
  value: unknown,
): value is {
  doGenerate: (options: Record<string, unknown>) => Promise<unknown>;
} =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { doGenerate?: unknown }).doGenerate === "function";

/**
 * v3 reports `inputTokens` / `outputTokens` as objects carrying a `total`,
 * while `SingleShotResult` — and `extractTokenUsage` downstream — accept only
 * numbers. Passing the nested shape straight through recorded 0/0/0 for every
 * caller of this helper, which is the whole of the video-frame formatting
 * path's usage accounting.
 */
const readCount = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { total?: unknown }).total === "number"
  ) {
    return (value as { total: number }).total;
  }
  return undefined;
};

const normalizeUsage = (usage: unknown): SingleShotResult["usage"] => {
  if (typeof usage !== "object" || usage === null) {
    return undefined;
  }
  const shaped = usage as { inputTokens?: unknown; outputTokens?: unknown };
  const input = readCount(shaped.inputTokens);
  const output = readCount(shaped.outputTokens);
  if (input === undefined && output === undefined) {
    return undefined;
  }
  return {
    inputTokens: input ?? 0,
    outputTokens: output ?? 0,
    totalTokens: (input ?? 0) + (output ?? 0),
  };
};

const textFromContent = (content: unknown): string =>
  Array.isArray(content)
    ? content
        .filter(
          (part): part is { type: "text"; text: string } =>
            typeof part === "object" &&
            part !== null &&
            (part as { type?: unknown }).type === "text" &&
            typeof (part as { text?: unknown }).text === "string",
        )
        .map((part) => part.text)
        .join("")
    : typeof content === "string"
      ? content
      : "";

export async function generateOnceNative(
  model: unknown,
  request: SingleShotRequest,
): Promise<SingleShotResult> {
  if (!hasDoGenerate(model)) {
    throw new Error("generateOnceNative: model handle exposes no doGenerate()");
  }
  const prompt: Array<Record<string, unknown>> = [];
  if (request.system) {
    prompt.push({ role: "system", content: request.system });
  }
  prompt.push({
    role: "user",
    content: [{ type: "text", text: request.prompt }],
  });
  const raw = await model.doGenerate({
    prompt,
    ...(request.maxOutputTokens
      ? { maxOutputTokens: request.maxOutputTokens }
      : {}),
    ...(request.temperature !== undefined
      ? { temperature: request.temperature }
      : {}),
    ...(request.abortSignal ? { abortSignal: request.abortSignal } : {}),
  });
  const shaped = raw as {
    content?: unknown;
    text?: unknown;
    usage?: SingleShotResult["usage"];
    finishReason?: unknown;
  };
  return {
    text:
      typeof shaped.text === "string"
        ? shaped.text
        : textFromContent(shaped.content),
    ...(normalizeUsage(shaped.usage)
      ? { usage: normalizeUsage(shaped.usage) }
      : {}),
    ...(typeof shaped.finishReason === "string"
      ? { finishReason: shaped.finishReason }
      : {}),
  };
}
