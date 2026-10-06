/**
 * Transcript correction: dictionary candidates → decision-model guard → LLM
 * rewrite.
 *
 * Every layer fails open and none may lose words. With no decision provider,
 * on a guard timeout or error, the dictionary is applied as is; on a rewrite
 * timeout or error, or a rewrite that drops too many words, the
 * dictionary-applied text is kept. The result's `steps` say which of those
 * happened, so a silently degraded path is still visible to the caller.
 *
 * @module voice/correction
 */

import {
  applyDictionary,
  dictionaryBlock,
  dictionaryVocabulary,
  findDictionaryCandidates,
} from "./dictionary.js";
import { DEFAULT_DECIDE_TIMEOUT_MS, decideCandidates } from "./guard.js";
import {
  buildRewriteSystemPrompt,
  buildRewriteUserPrompt,
  rewriteLines,
  rewriteTranscript,
} from "./rewrite.js";
import type {
  STTCorrectionDeps,
  STTCorrectionInput,
  STTCorrectionOptions,
  STTCorrectionOutput,
  STTDecisionRecord,
  STTDictionaryEntry,
} from "../../types/index.js";

export {
  applyDictionary,
  buildRewriteSystemPrompt,
  buildRewriteUserPrompt,
  decideCandidates,
  dictionaryBlock,
  dictionaryVocabulary,
  findDictionaryCandidates,
  rewriteLines,
  rewriteTranscript,
};

/** Correction is on when asked for, or by default when a dictionary or a rewrite is configured. */
export function isCorrectionEnabled(
  dictionary: readonly STTDictionaryEntry[] | undefined,
  options: STTCorrectionOptions | undefined,
): boolean {
  if (options?.enabled !== undefined) {
    return options.enabled;
  }
  // A `correction` object of any kind is a request for correction (its
  // transliterate/punctuate settings would be dead otherwise); only
  // `rewrite: false` without a dictionary leaves nothing to do.
  return (
    Boolean(dictionary?.length) ||
    (options !== undefined && options.rewrite !== false)
  );
}

/** Run the guard (or skip it) and apply the dictionary to `text`. */
async function guardAndApply(
  text: string,
  dictionary: readonly STTDictionaryEntry[] | undefined,
  options: STTCorrectionOptions | undefined,
  deps: STTCorrectionDeps,
): Promise<{
  text: string;
  decisions: STTDecisionRecord[];
  step?: string;
  decideMs?: number;
}> {
  const candidates = findDictionaryCandidates(text, dictionary);
  if (candidates.length === 0) {
    return { text, decisions: [] };
  }
  const started = Date.now();
  const decisions =
    options?.guard === "none"
      ? candidates.map(
          (candidate): STTDecisionRecord => ({
            heard: candidate.heard,
            term: candidate.entry.term.trim(),
            choice: "term",
            note: "guard off",
          }),
        )
      : await decideCandidates(text, candidates, deps.decide, {
          context: options?.context,
          timeoutMs: options?.decideTimeoutMs ?? DEFAULT_DECIDE_TIMEOUT_MS,
        });
  const ms = Date.now() - started;
  const applied = decisions.filter((d) => d.choice === "term").length;
  return {
    text: applyDictionary(text, candidates, decisions),
    decisions,
    step: `dictionary ${applied}/${candidates.length} (${ms} ms)`,
    decideMs: options?.guard === "none" ? undefined : ms,
  };
}

/**
 * Correct one transcript (a whole short recording, or one final utterance
 * when streaming). Never throws on a layer's failure and never returns empty
 * text when either transcript had words.
 *
 * When the primary engine reported a low language score
 * (`languageDetected === false`) and a second opinion exists, the second
 * opinion leads: an Indic engine on English speech produces confident-looking
 * nonsense, and the English-oriented engine's text is the better base. The
 * engine text then goes to the rewrite as the secondary transcript, so
 * Indian-language words it did catch are not lost.
 */
export async function correctTranscript(
  input: STTCorrectionInput,
  deps: STTCorrectionDeps,
): Promise<STTCorrectionOutput> {
  const started = Date.now();
  const { dictionary, options } = input;
  const steps: string[] = [];
  const timings: STTCorrectionOutput["timings"] = {};

  const engineText = input.text ?? "";
  const second = input.secondOpinion?.trim() ? input.secondOpinion : undefined;
  let lead = engineText;
  let secondary = second;
  let secondLed = false;
  if (second && input.languageDetected === false) {
    lead = second;
    secondary = engineText.trim() ? engineText : undefined;
    secondLed = true;
    steps.push("second opinion led (primary unsure)");
  } else if (second && !engineText.trim()) {
    lead = second;
    secondary = undefined;
    secondLed = true;
    steps.push("second opinion led (primary empty)");
  }

  if (!isCorrectionEnabled(dictionary, options) || !lead.trim()) {
    return {
      text: lead,
      decisions: [],
      steps,
      timings: { correctionMs: Date.now() - started },
    };
  }

  const guarded = await guardAndApply(lead, dictionary, options, deps);
  let text = guarded.text;
  if (guarded.step) {
    steps.push(guarded.step);
  }
  if (guarded.decideMs !== undefined) {
    timings.decideMs = guarded.decideMs;
  }

  if (options?.rewrite !== false) {
    const outcome = await rewriteTranscript(
      {
        primary: text,
        secondOpinion: secondary,
        dictionary,
        options,
        labels: secondLed
          ? {
              primary: "second engine",
              secondary: "primary engine, unsure of the language",
            }
          : undefined,
        literal: guarded.decisions
          .filter((d) => d.choice === "literal")
          .map((d) => d.heard),
        onPartial: input.onPartial,
      },
      deps.rewrite,
    );
    timings.rewriteMs = outcome.ms;
    switch (outcome.status) {
      case "ok":
        text = outcome.text;
        steps.push(`rewrite ${outcome.ms} ms`);
        break;
      case "timeout":
        steps.push("rewrite timed out · kept text");
        break;
      case "error":
        steps.push(`rewrite failed (${outcome.error ?? "error"}) · kept text`);
        break;
      case "empty":
        steps.push("rewrite returned nothing · kept text");
        break;
      case "dropped":
        steps.push(
          `rewrite dropped ${Math.round((outcome.dropRatio ?? 0) * 100)}% of words · kept text`,
        );
        break;
    }
  }

  timings.correctionMs = Date.now() - started;
  return {
    text: text.trim() ? text : lead,
    decisions: guarded.decisions,
    steps,
    timings,
  };
}

/**
 * Correct a long transcript line by line (file transcription, diarized
 * turns). With the rewrite on, lines go to the model in numbered batches of
 * 25 and the dictionary travels in the prompt — the model sees each alias in
 * its sentence, which is the context the guard would otherwise supply. With
 * `rewrite: false`, each line with candidates gets its own guard call (up to
 * four at a time) and the dictionary is applied per line. The result always
 * has exactly as many lines as the input.
 */
export async function correctTranscriptLines(
  lines: readonly string[],
  dictionary: readonly STTDictionaryEntry[] | undefined,
  options: STTCorrectionOptions | undefined,
  deps: STTCorrectionDeps,
): Promise<{
  lines: string[];
  decisions: STTDecisionRecord[];
  steps: string[];
  timings: STTCorrectionOutput["timings"];
}> {
  const started = Date.now();
  if (!isCorrectionEnabled(dictionary, options) || lines.length === 0) {
    return { lines: [...lines], decisions: [], steps: [], timings: {} };
  }

  if (options?.rewrite !== false) {
    const outcome = await rewriteLines(lines, deps.rewrite, {
      dictionary,
      correction: options,
    });
    const steps = [
      `rewrite ${outcome.batchesOk}/${outcome.batches} batches (${outcome.ms} ms)`,
    ];
    if (outcome.batchesOk < outcome.batches) {
      steps.push(
        `${outcome.batches - outcome.batchesOk} batch(es) failed · kept their lines`,
      );
    }
    if (outcome.linesKept > 0) {
      steps.push(
        `${outcome.linesKept} line(s) dropped words · kept their text`,
      );
    }
    return {
      lines: outcome.lines,
      decisions: [],
      steps,
      timings: { rewriteMs: outcome.ms, correctionMs: Date.now() - started },
    };
  }

  const out = [...lines];
  // Per line, so the flattened decisions follow line order whatever finishes first.
  const perLine: STTDecisionRecord[][] = lines.map(() => []);
  let candidatesSeen = 0;
  let applied = 0;
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < lines.length) {
      const index = next++;
      const guarded = await guardAndApply(
        lines[index],
        dictionary,
        options,
        deps,
      );
      out[index] = guarded.text;
      perLine[index] = guarded.decisions;
      candidatesSeen += guarded.decisions.length;
      applied += guarded.decisions.filter((d) => d.choice === "term").length;
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(4, lines.length) }, () => worker()),
  );
  const ms = Date.now() - started;
  return {
    lines: out,
    decisions: perLine.flat(),
    steps: candidatesSeen
      ? [`dictionary ${applied}/${candidatesSeen} (${ms} ms)`]
      : [],
    timings: { decideMs: ms, correctionMs: ms },
  };
}
