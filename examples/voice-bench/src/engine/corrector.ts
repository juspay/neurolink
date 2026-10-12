// dictionary candidates → one System One call (per candidate: term or literal?) → LLM rewrite.
import { base, cfg, INDIC_RE } from "./config";
import { getState } from "./store";
import type { Decision, DictEntry } from "./types";

const REWRITE_TIMEOUT_MS = 12000,
  DECIDE_TIMEOUT_MS = 4000;

const dict = () => getState().dictionary;
const ctxText = () => getState().context;

export function dictionaryBlock() {
  const d = dict();
  if (!d.length) return "";
  return (
    "Dictionary (term | also heard as | meaning):\n" +
    d
      .map(
        (e) => `${e.term} | ${e.heard.join(", ") || "-"} | ${e.meaning || "-"}`,
      )
      .join("\n")
  );
}

// The dictionary doubles as the ASR's context prompt (Qwen3-ASR's contextual biasing).
export function asrContextPrompt() {
  const terms = dict().map((e) =>
    e.meaning ? `${e.term} (${e.meaning})` : e.term,
  );
  const ctx = ctxText().trim();
  return [
    ctx,
    terms.length ? "Names and terms used: " + terms.join(", ") + "." : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 1800);
}

const CORRECT_SYSTEM = () =>
  "You are a post-editor for speech transcripts of speakers who mix an Indian language (Hindi, Tamil, Telugu, " +
  "Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, …) with English, or speak only one of them.\n" +
  "Input: an ASR transcript, possibly in an Indic script (that ASR writes English words phonetically in the " +
  "Indic script), and possibly a second transcript of the same audio from an English-oriented ASR.\n" +
  "Output the sentence as the speaker said it, written the way Indians type on phones:\n" +
  "- Indian-language words stay in that language but are ALWAYS written in Latin letters the way people type on " +
  "phones (Hinglish / Tanglish / Kanglish style): मेरा नाम → mera naam; भेज देना → bhej dena; நாளைக்கு மீட்டிங் " +
  "இருக்கு → naalaikku meeting irukku; ಇವತ್ತು → ivattu. No Devanagari, Tamil, Telugu, Kannada or other Indic " +
  "script may remain in the output. NEVER translate them into English.\n" +
  "- English words get their correct English spelling (before, please, client, deployment, meeting, PM). Never " +
  "leave an English word phonetic.\n" +
  "- Use the dictionary: a word that sounds like an entry's 'also heard as' is written as the term exactly.\n" +
  "- Add natural punctuation and capitalization; numbers as digits; keep fillers.\n" +
  "- Keep every word; never summarize, add, reorder or translate. With two transcripts, take Indian-language " +
  "words from the Indic-script one and English words from the English one.\n" +
  "Output only the corrected sentence, nothing else.\n\n" +
  dictionaryBlock();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Candidate = { entry: DictEntry; heard: string; re: RegExp };

export function dictionaryCandidates(text: string): Candidate[] {
  const out: Candidate[] = [];
  for (const e of dict())
    for (const h of e.heard) {
      if (!h || (INDIC_RE.test(h) && !INDIC_RE.test(text))) continue;
      const re = new RegExp(`(^|[^\\p{L}])${escapeRe(h)}(?=$|[^\\p{L}])`, "iu");
      if (
        re.test(text) &&
        !new RegExp(
          `(^|[^\\p{L}])${escapeRe(e.term)}(?=$|[^\\p{L}])`,
          "iu",
        ).test(text)
      )
        out.push({ entry: e, heard: h, re });
    }
  return out;
}

type SystemOneAnswer = {
  choice?: "term" | "literal";
  probabilities?: { term?: number };
  confidence?: number;
};

async function decideCandidates(
  text: string,
  cands: Candidate[],
): Promise<Decision[]> {
  const asIs = (why: string): Decision[] =>
    cands.map((c) => ({
      heard: c.heard,
      term: c.entry.term,
      choice: "term",
      pTerm: null,
      confidence: null,
      note: why,
    }));
  if (!cands.length) return [];
  if (!cfg.decisionBaseUrl || !cfg.decisionModel)
    return asIs("no decision model configured");
  const questions: Record<string, unknown> = {};
  cands.forEach((c, i) => {
    questions["c" + i] = {
      type: "choice",
      instructions: `The speech recognizer wrote "${c.heard}". Which did the speaker mean?`,
      criteria: {
        term: `the term "${c.entry.term}"${c.entry.meaning ? ": " + c.entry.meaning : ""}`,
        literal: `"${c.heard}" as an ordinary word or other name, meant literally`,
      },
    };
  });
  try {
    const r = await fetch(cfg.decisionBaseUrl + "/v1/systemone", {
      method: "POST",
      signal: AbortSignal.timeout(DECIDE_TIMEOUT_MS),
      headers: {
        Authorization: "Bearer " + cfg.decisionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.decisionModel,
        state: {
          transcript: text,
          context:
            ctxText() ||
            "Speech transcript; names and product terms are often misheard",
        },
        questions,
      }),
    });
    if (!r.ok) throw new Error(`systemone ${r.status}`);
    const d = (await r.json()) as { answers?: Record<string, SystemOneAnswer> };
    return cands.map((c, i) => {
      const a = d.answers?.["c" + i] ?? {};
      return {
        heard: c.heard,
        term: c.entry.term,
        choice: a.choice ?? "term",
        pTerm: a.probabilities?.term ?? null,
        confidence: a.confidence ?? null,
      };
    });
  } catch (e) {
    console.warn(
      "decision guard unavailable, applying dictionary as-is:",
      e instanceof Error ? e.message : e,
    );
    return asIs(
      e instanceof Error && e.name === "TimeoutError"
        ? "decision model timed out"
        : "decision model unavailable",
    );
  }
}

let warmedAt = 0;
export function warmCorrector() {
  // a hosted corrector may cold-start (~10 s seen), then answer in <1 s
  if (!getState().flags.correct || Date.now() - warmedAt < 120000) return;
  warmedAt = Date.now();
  fetch((cfg.correctorBaseUrl || base) + "/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + (cfg.correctorKey || cfg.apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.correctorModel || cfg.romanizeModel,
      max_tokens: 1,
      messages: [{ role: "user", content: "ok" }],
    }),
  }).catch(() => {});
}

// Streams the rewrite so the sentence can be replaced as tokens arrive; a timeout or error keeps the
// dictionary-applied text — the corrector may be slow or down, it may never cost words.
async function rewriteStream(
  system: string,
  user: string,
  opts: {
    signal: AbortSignal;
    onPartial?: (t: string) => void;
    maxTokens: number;
  },
) {
  const base_ = cfg.correctorBaseUrl || base,
    key_ = cfg.correctorKey || cfg.apiKey,
    model_ =
      cfg.correctorModel || cfg.romanizeModel || "deepseek-v4-flash-fast";
  const r = await fetch(base_ + "/v1/chat/completions", {
    method: "POST",
    signal: opts.signal,
    headers: {
      Authorization: "Bearer " + key_,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model_,
      temperature: 0,
      max_tokens: opts.maxTokens,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok || !r.body) throw new Error(`corrector HTTP ${r.status}`);
  const reader = r.body.getReader(),
    dec = new TextDecoder();
  let buf = "",
    content = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const delta = (
          JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }
        ).choices?.[0]?.delta?.content;
        if (delta) {
          content += delta;
          opts.onPartial?.(content);
        }
      } catch {
        /* partial SSE line */
      }
    }
  }
  return { content, model: model_ };
}

export async function correctText(
  text: string,
  altText: string | null,
  opts: { signal?: AbortSignal; onPartial?: (t: string) => void } = {},
) {
  const { signal, onPartial } = opts;
  const t0 = performance.now();
  const steps: string[] = [];
  let out = text;
  const cands = dictionaryCandidates(out);
  const decisions = await decideCandidates(out, cands);
  if (cands.length) {
    cands.forEach((c, i) => {
      if (decisions[i].choice === "term")
        out = out.replace(c.re, (_m, pre: string) => pre + c.entry.term);
    });
    steps.push(
      `dictionary ${decisions.filter((d) => d.choice === "term").length}/${cands.length} (${Math.round(performance.now() - t0)} ms)`,
    );
  }
  const t1 = performance.now();
  const user = altText
    ? `Transcript 1 (Indic-script ASR): ${out}\nTranscript 2 (English ASR): ${altText}`
    : `Transcript: ${out}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REWRITE_TIMEOUT_MS);
  signal?.addEventListener("abort", () => ctl.abort());
  try {
    const maxTokens = Math.round(
      Math.min(1200, 60 + 1.5 * (out.length + (altText || "").length)),
    );
    const { content, model } = await rewriteStream(CORRECT_SYSTEM(), user, {
      signal: ctl.signal,
      onPartial,
      maxTokens,
    });
    const fixed = content.trim().split("\n").filter(Boolean).pop() || out;
    steps.push(`${model} ${Math.round(performance.now() - t1)} ms`);
    return { text: fixed, steps, decisions };
  } catch (e) {
    steps.push(
      ctl.signal.aborted && !signal?.aborted
        ? `rewrite timed out after ${REWRITE_TIMEOUT_MS / 1000} s · kept text`
        : `rewrite failed (${e instanceof Error ? e.message : e}) · kept text`,
    );
    return { text: out, steps, decisions };
  } finally {
    clearTimeout(timer);
  }
}
