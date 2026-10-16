/**
 * Output languages: the transcript rendered in other languages and scripts.
 *
 * One structured model call renders every requested target for a batch of
 * lines (an utterance, or up to 20 segments of a recording), from the
 * native-script engine text plus its corrected form, with earlier lines and
 * their renderings as context. Targets that are the transcript's own
 * language and script need no call at all.
 *
 * A rendering is never allowed to cost the transcript anything: it runs
 * after the text is settled, fails open, and reports what happened in its
 * `status`. The guards refuse an answer that is empty, in the wrong script
 * for its tag, or the source handed back untranslated; a refused target gets
 * one retry on its own.
 *
 * @module voice/output/render
 */

import { z } from "zod";
import { TimeoutError, withTimeout } from "../../utils/async/withTimeout.js";
import {
  describeOutputTag,
  dominantScript,
  normalizeLanguageCode,
  parseOutputTag,
  scriptShare,
} from "../languages.js";
import type {
  ParsedOutputTag,
  STTCorrectionDeps,
  STTOutputOptions,
  STTOutputBatchOutcome,
  STTOutputRenderInput,
  STTOutputRendering,
  STTOutputStatus,
} from "../../types/index.js";

/** Most targets one request renders; more are split into parallel requests. */
const TARGETS_PER_CALL = 4;
/** Most lines one request renders. */
const LINES_PER_CALL = 20;
/** Requests in flight at once for one transcript. */
const RENDER_CONCURRENCY = 4;
/** Distinct targets accepted per request. */
export const MAX_OUTPUT_LANGUAGES = 8;
const DEFAULT_RENDER_TIMEOUT_MS = 15_000;
const MAX_RENDER_TOKENS = 8192;
/** A rendering whose letters are less than this share in the tag's script is refused. */
const MIN_SCRIPT_SHARE = 0.5;

/** The tag that means "the transcript as it is". */
export const SOURCE_OUTPUT = "source";

/**
 * The output languages in effect right now: read from a live source when
 * one was given, trimmed, de-duplicated (case-insensitively) and capped.
 */
export function outputLanguagesOf(
  output: STTOutputOptions | undefined,
): string[] {
  if (!output) {
    return [];
  }
  let raw: readonly string[];
  try {
    raw = Array.isArray(output.languages)
      ? (output.languages as readonly string[])
      : (output.languages as { current(): readonly string[] }).current();
  } catch {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    const tag = typeof entry === "string" ? entry.trim() : "";
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      out.push(tag);
    }
    if (out.length >= MAX_OUTPUT_LANGUAGES) {
      break;
    }
  }
  return out;
}

function words(text: string): number {
  return text.split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function comparable(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Why a rendered line is refused, or `undefined` when it is accepted. */
function refuseLine(
  rendered: string,
  sourceLine: string,
  correctedLine: string,
  target: ParsedOutputTag,
  spoken: string | undefined,
): string | undefined {
  if (!rendered.trim()) {
    return "empty";
  }
  const letters = rendered.replace(/[^\p{L}]/gu, "").length;
  if (letters >= 3 && scriptShare(rendered, target.script) < MIN_SCRIPT_SHARE) {
    return `not in ${target.script} script`;
  }
  // The source handed back unchanged is not a translation. Only judged when
  // the spoken language is known to differ and the line is a real sentence:
  // a name or "OK" reads the same in every language.
  if (
    spoken &&
    spoken !== target.language &&
    words(sourceLine) >= 3 &&
    (comparable(rendered) === comparable(sourceLine) ||
      comparable(rendered) === comparable(correctedLine))
  ) {
    return "untranslated";
  }
  return undefined;
}

function buildSystemPrompt(
  glossary: readonly string[],
  multiline: boolean,
): string {
  const rules = [
    "- Translate the meaning faithfully and completely: never summarize, explain, add or leave anything out. " +
      "Keep the speaker's tone and register.",
    "- An output in the language that was spoken is not a translation: keep the speaker's words and only " +
      "write them in the requested writing system.",
    '- An output named "<language> (Latin script)" is that language written in Latin letters the way people ' +
      'type it on phones (Hinglish: "mera naam", "kal milte hain"), never English. When the speaker ' +
      "spoke another language (English included), translate into that language first: the sentence must " +
      "read as that language, keeping only names, terms and the few English words its speakers use as is.",
    "- Code-mixed speech is rendered entirely in the output language, except names, brands and glossary terms.",
    "- Keep names, numbers (as digits), units, emails, URLs and code exactly.",
    "- The lines come from speech recognition and can hold mis-heard words: render what the speaker most " +
      "plausibly meant, using the cleaned version when one is given.",
  ];
  if (glossary.length) {
    rules.push(
      `- Keep these terms exactly as written, in every output: ${glossary.map((t) => `"${t}"`).join(", ")}.`,
    );
  }
  rules.push(
    multiline
      ? "- For every output return one string per input line, in the same order, as many strings as there are lines."
      : "- For every output return a list with exactly one string: the rendered line.",
  );
  return [
    "You are a professional interpreter writing out live speech in other languages.",
    "For every requested output, render the speaker's lines in that language and writing system:",
    ...rules,
    "Answer with a JSON object whose keys are the output tags, each holding the list of rendered lines.",
  ].join("\n");
}

function buildUserPrompt(
  source: readonly string[],
  corrected: readonly string[] | undefined,
  spoken: string | undefined,
  targets: readonly ParsedOutputTag[],
  previous: STTOutputRenderInput["previous"],
): string {
  const parts: string[] = [
    `Spoken language: ${spoken ? `${describeOutputTag(spoken)} (${spoken})` : "not identified"}`,
    "Outputs:",
    ...targets.map((t) => `- ${t.tag}: ${describeOutputTag(t.tag)}`),
  ];
  const context = (previous ?? []).filter((p) => p.text.trim());
  if (context.length) {
    parts.push(
      "",
      "Earlier in the conversation (context only, do not render these):",
      ...context.map((p, i) => {
        const known = targets
          .map((t) =>
            p.outputs[t.tag] ? ` | ${t.tag}: ${p.outputs[t.tag]}` : "",
          )
          .join("");
        return `${i + 1}. ${p.text}${known}`;
      }),
    );
  }
  parts.push(
    "",
    "Lines to render (as recognized):",
    ...source.map((line, i) => `${i + 1}. ${line}`),
  );
  const cleaned = corrected?.some((line, i) => line !== source[i]);
  if (corrected && cleaned) {
    parts.push(
      "",
      "Cleaned version of the same lines:",
      ...corrected.map((line, i) => `${i + 1}. ${line}`),
    );
  }
  return parts.join("\n");
}

function maxTokensFor(lines: readonly string[], targets: number): number {
  const chars = lines.reduce((n, line) => n + line.length, 0);
  return Math.min(
    MAX_RENDER_TOKENS,
    Math.ceil(120 + targets * (40 + 2.5 * chars)),
  );
}

/** The object a render call returned, as lines per tag; `undefined` entries were missing or malformed. */
function readAnswer(
  answer: unknown,
  tags: readonly string[],
  lines: number,
): Map<string, string[] | undefined> {
  let value = answer;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      value = undefined;
    }
  }
  const out = new Map<string, string[] | undefined>();
  const record =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  for (const tag of tags) {
    const entry = record[tag];
    const list = Array.isArray(entry)
      ? entry.map((v) => (typeof v === "string" ? v.trim() : ""))
      : typeof entry === "string" && lines === 1
        ? [entry.trim()]
        : undefined;
    out.set(tag, list && list.length === lines ? list : undefined);
  }
  return out;
}

/** One request: some lines, some targets. Never throws. */
async function renderBatch(
  input: STTOutputRenderInput,
  range: { from: number; to: number },
  targets: readonly ParsedOutputTag[],
  render: NonNullable<STTCorrectionDeps["render"]>,
  spoken: string | undefined,
  /** Set on a retry: why the first answer was refused. The retry goes without context, which is what misled it. */
  refused?: string,
): Promise<Map<string, STTOutputBatchOutcome>> {
  const source = input.source.slice(range.from, range.to);
  const corrected = input.corrected?.slice(range.from, range.to);
  const glossary =
    input.options?.glossary === false
      ? []
      : [
          ...new Set(
            (input.dictionary ?? []).map((d) => d.term.trim()).filter(Boolean),
          ),
        ];
  const tags = targets.map((t) => t.tag);
  const shape: Record<string, z.ZodArray<z.ZodString>> = {};
  for (const tag of tags) {
    shape[tag] = z.array(z.string());
  }
  const timeoutMs =
    input.options?.timeoutMs && input.options.timeoutMs > 0
      ? input.options.timeoutMs
      : DEFAULT_RENDER_TIMEOUT_MS;
  const out = new Map<string, STTOutputBatchOutcome>();
  let answer: unknown;
  try {
    answer = await withTimeout(
      render({
        system: buildSystemPrompt(glossary, source.length > 1),
        user:
          buildUserPrompt(
            source,
            corrected,
            spoken,
            targets,
            refused ? undefined : input.previous,
          ) +
          (refused
            ? `\n\nYour previous answer for ${targets.map((t) => t.tag).join(", ")} was refused (${refused}). ` +
              (refused === "untranslated"
                ? `It repeated the lines instead of rendering them in ${targets.map((t) => describeOutputTag(t.tag)).join(", ")}.`
                : "Answer again following every rule.")
            : ""),
        schema: z.object(shape),
        ...(input.options?.provider
          ? { provider: input.options.provider }
          : {}),
        ...(input.options?.model ? { model: input.options.model } : {}),
        maxTokens: maxTokensFor(source, targets.length),
        timeoutMs,
      }),
      timeoutMs,
    );
  } catch (error) {
    const status: STTOutputStatus =
      error instanceof TimeoutError ? "timeout" : "error";
    for (const tag of tags) {
      out.set(tag, {
        status,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    return out;
  }
  const parsed = readAnswer(answer, tags, source.length);
  for (const target of targets) {
    const lines = parsed.get(target.tag);
    if (!lines) {
      out.set(target.tag, {
        status: "rejected",
        reason: "missing or malformed in the answer",
      });
      continue;
    }
    let reason: string | undefined;
    for (let i = 0; i < source.length && !reason; i++) {
      if (!source[i].trim()) {
        continue;
      }
      reason = refuseLine(
        lines[i],
        source[i],
        corrected?.[i] ?? source[i],
        target,
        spoken,
      );
    }
    out.set(
      target.tag,
      reason ? { status: "rejected", reason } : { lines, status: "ok" },
    );
  }
  return out;
}

async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

/**
 * Render one transcript (one or more lines) into every requested language.
 * Returns one entry per requested tag, keyed by the tag as given. Never throws.
 */
export async function renderOutputs(
  input: STTOutputRenderInput,
  deps: Pick<STTCorrectionDeps, "render">,
): Promise<Record<string, STTOutputRendering>> {
  const started = Date.now();
  const result: Record<string, STTOutputRendering> = {};
  const lineCount = input.source.length;
  const base = input.source.map(
    (line, i) => input.corrected?.[i]?.trim() || line,
  );
  const baseText = base.filter((l) => l.trim()).join(" ");
  const spoken = normalizeLanguageCode(input.language);
  const multi = lineCount > 1;
  const finish = (
    tag: string,
    status: STTOutputStatus,
    lines?: string[],
    reason?: string,
  ): void => {
    const text = (lines ?? []).filter((l) => l.trim()).join(" ");
    result[tag] = {
      language: tag,
      text,
      status,
      ms: Date.now() - started,
      ...(multi && lines
        ? { segments: lines.map((t, index) => ({ index, text: t })) }
        : {}),
      ...(reason ? { reason } : {}),
    };
  };

  const pending: ParsedOutputTag[] = [];
  for (const tag of input.languages) {
    if (tag.toLowerCase() === SOURCE_OUTPUT) {
      finish(tag, "same-language", base);
      continue;
    }
    const parsed = parseOutputTag(tag);
    if (!parsed) {
      finish(tag, "error", undefined, "not a BCP-47 language tag");
      continue;
    }
    if (!baseText.trim()) {
      finish(tag, "same-language", base);
      continue;
    }
    // The transcript's own language in its own script: nothing to render.
    if (
      spoken === parsed.language &&
      dominantScript(baseText) !== undefined &&
      scriptShare(baseText, parsed.script) >= 0.8
    ) {
      finish(tag, "same-language", base);
      continue;
    }
    pending.push(parsed);
  }
  if (pending.length === 0) {
    return result;
  }
  if (!deps.render) {
    for (const t of pending) {
      finish(t.tag, "error", undefined, "no rendering model is wired");
    }
    return result;
  }
  const render = deps.render;

  const ranges: Array<{ from: number; to: number }> = [];
  for (let from = 0; from < lineCount; from += LINES_PER_CALL) {
    ranges.push({ from, to: Math.min(lineCount, from + LINES_PER_CALL) });
  }
  const groups: ParsedOutputTag[][] = [];
  for (let i = 0; i < pending.length; i += TARGETS_PER_CALL) {
    groups.push(pending.slice(i, i + TARGETS_PER_CALL));
  }
  const jobs = ranges.flatMap((range) =>
    groups.map((group) => ({ range, group })),
  );
  const outcomes = await mapLimited(jobs, RENDER_CONCURRENCY, async (job) => {
    const first = await renderBatch(
      input,
      job.range,
      job.group,
      render,
      spoken,
    );
    // A refused or malformed target gets one more try on its own.
    const retry = job.group.filter(
      (t) => first.get(t.tag)?.status === "rejected",
    );
    for (const target of retry) {
      const again = await renderBatch(
        input,
        job.range,
        [target],
        render,
        spoken,
        first.get(target.tag)?.reason ?? "rejected",
      );
      const outcome = again.get(target.tag);
      if (outcome?.status === "ok") {
        first.set(target.tag, outcome);
      }
    }
    return { range: job.range, outcomes: first };
  });

  for (const target of pending) {
    const lines: string[] = new Array(lineCount).fill("");
    let ok = 0;
    let failure: STTOutputBatchOutcome | undefined;
    for (const { range, outcomes: byTag } of outcomes) {
      const outcome = byTag.get(target.tag);
      if (outcome?.status === "ok" && outcome.lines) {
        ok++;
        outcome.lines.forEach((line, k) => {
          lines[range.from + k] = line;
        });
      } else {
        failure ??= outcome;
      }
    }
    if (ok === ranges.length) {
      finish(target.tag, "ok", lines);
    } else if (ok > 0) {
      finish(target.tag, "partial", lines, failure?.reason);
    } else {
      finish(
        target.tag,
        failure?.status ?? "error",
        undefined,
        failure?.reason,
      );
    }
  }
  return result;
}
