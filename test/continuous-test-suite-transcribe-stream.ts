#!/usr/bin/env tsx
/**
 * Continuous Test Suite: the streaming half of `transcribe` — the chunked
 * adapter (energy-gated endpointer + rolling re-transcription +
 * LocalAgreement) and the stream orchestration around it.
 *
 * ## Determinism exception (CLAUDE.md rule 15)
 *
 * This suite sits outside the end-to-end rule on purpose, and is listed in the
 * `allow` list of `neurolink/e2e-tests-only` in eslint.config.js. What
 * determinism buys: the endpointer and LocalAgreement are pure functions of
 * the PCM they are fed. Driving them with a generated 16 kHz signal — shaped
 * noise bursts at known offsets, separated by near-silence at about -60 dBFS —
 * and a scripted engine pins down utterance count, that committed text never
 * shrinks, the never-shrink final (an empty or collapsed final pass keeps the
 * live text), `silence` for an utterance no engine read, the language
 * takeover rule (two unsure passes after 3 s of audio and 1.5 s of speech) and
 * event ordering. No live engine could be made to emit those sequences on
 * demand: a real recogniser decides for itself when it is unsure, what it
 * hears on a second pass, and how long it takes.
 *
 * `chunkedTranscribeStream` and `runTranscribeStream` are not exported from
 * the package root, so — one module graph per suite — everything here comes
 * from `src`. The public path (`neurolink.transcribeStream()` over a stub
 * engine) is covered in `continuous-test-suite-transcribe.ts` against `dist`.
 *
 * Assertion messages never quote engine text or event payloads (see
 * CLAUDE.md, "Keep payloads out of assertion messages").
 *
 * Run: pnpm run test:transcribe:stream
 */
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import {
  chunkedTranscribeStream,
  ENGINE_TAIL_PAD_MS,
} from "../src/lib/voice/streaming/chunkedStreamAdapter.js";
import { runTranscribeStream } from "../src/lib/voice/transcribeStream.js";
import { runTranscribe } from "../src/lib/voice/transcribe.js";
import { TranscriptionSession } from "../src/lib/voice/session/transcriptionSession.js";
import { createWavFile } from "../src/lib/voice/audio-utils.js";
import type {
  STTChunkedPassOptions,
  STTHandler,
  STTOptions,
  STTResult,
  STTSpeechDetector,
  TranscribeDeps,
  TranscribeStreamEvent,
  TranscribeStreamOptions,
  TranscriptionSegment,
  TranscriptionSessionEvent,
} from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Transcribe stream (chunked adapter)", {
  offline: true,
});

const RATE = 16000;

// The signal below is white noise, which a real speech detector rightly scores
// as not-speech. These tests drive the energy gate; the detector tests inject
// a scripted detector of their own.
process.env.NEUROLINK_STT_VAD = "energy";

// ---------------------------------------------------------------------------
// Signal
// ---------------------------------------------------------------------------

/** Seeded LCG noise in [-0.5, 0.5), so every run feeds identical samples. */
function noise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000 - 0.5;
  };
}

/**
 * Lead-in silence, then one burst per entry of `bursts` (seconds), each
 * followed by `gapSeconds` of near-silence. Bursts are white noise under a
 * 50 ms attack/release envelope: enough for an energy gate, which is all the
 * endpointer measures.
 */
function signal(bursts: number[], gapSeconds = 1.2): Float32Array {
  const rand = noise(11);
  const out: number[] = [];
  const quiet = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds * RATE); i++) {
      out.push(rand() * 0.002);
    }
  };
  quiet(0.5);
  for (const seconds of bursts) {
    const n = Math.round(seconds * RATE);
    const ramp = 0.05 * RATE;
    for (let i = 0; i < n; i++) {
      out.push(rand() * 0.6 * Math.min(1, i / ramp, (n - i) / ramp));
    }
    quiet(gapSeconds);
  }
  return Float32Array.from(out);
}

/** `seconds` of near-silence at the signal generator's noise floor. */
function pause(seconds: number): Float32Array {
  const rand = noise(5);
  return Float32Array.from(
    { length: Math.round(seconds * RATE) },
    () => rand() * 0.002,
  );
}

/** Float samples → PCM16LE, yielded in 100 ms frames with a macrotask between frames. */
async function* frames(samples: Float32Array): AsyncGenerator<Buffer> {
  const pcm = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    pcm.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767),
      i * 2,
    );
  }
  const frameBytes = (RATE / 10) * 2;
  for (let at = 0; at < pcm.length; at += frameBytes) {
    yield pcm.subarray(at, Math.min(pcm.length, at + frameBytes));
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

// ---------------------------------------------------------------------------
// Scripted engine
// ---------------------------------------------------------------------------

type Pass = STTChunkedPassOptions & { samples: number; tail: Float32Array };

/** What the scripted engine answers: an `STTResult` without the fields it has no use for. */
type ScriptResult = Omit<Partial<STTResult>, "metadata"> & {
  text: string;
  metadata?: Record<string, unknown>;
};

/** Fills the fields `STTResult` requires (confidence, metadata.latency). */
function asResult(answer: ScriptResult): STTResult {
  return {
    confidence: 1,
    ...answer,
    metadata: { latency: 0, ...answer.metadata },
  };
}

/** `u<utterance>w1 … u<utterance>wK`, K growing with the audio heard (two words a second). */
function wordsFor(utterance: number, seconds: number): string {
  const k = Math.max(1, Math.floor(seconds * 2));
  return Array.from({ length: k }, (_, i) => `u${utterance}w${i + 1}`).join(
    " ",
  );
}

/** A `run` that answers from `script`, recording every pass it was asked for. */
function scripted(
  script: (pass: Pass) => ScriptResult | Promise<ScriptResult>,
): {
  run: (
    pcm: Float32Array,
    options: STTChunkedPassOptions,
  ) => Promise<STTResult>;
  passes: Pass[];
} {
  const passes: Pass[] = [];
  return {
    passes,
    run: async (pcm, options) => {
      const pass = {
        ...options,
        samples: pcm.length,
        // The last 300 ms of what the engine got, for the silence-pad check.
        tail: pcm.slice(Math.max(0, pcm.length - 4800)),
      };
      passes.push(pass);
      return asResult(await script(pass));
    },
  };
}

async function collect(
  stream: AsyncIterable<TranscribeStreamEvent>,
): Promise<TranscribeStreamEvent[]> {
  const events: TranscribeStreamEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

type Final = Extract<TranscribeStreamEvent, { type: "final" }>;
type Interim = Extract<TranscribeStreamEvent, { type: "interim" }>;

const finalsOf = (events: TranscribeStreamEvent[]): Final[] =>
  events.filter((e): e is Final => e.type === "final");
const interimsOf = (events: TranscribeStreamEvent[], u: number): Interim[] =>
  events.filter((e): e is Interim => e.type === "interim" && e.utterance === u);
const words = (text: string): string[] => text.split(/\s+/).filter(Boolean);

// ===========================================================================
// Chunked adapter
// ===========================================================================

await test("three bursts make three utterances, each finalized once, in order, with every event of one before the next", async () => {
  const engine = scripted((p) => ({
    text: wordsFor(p.utterance, p.seconds),
    language: "en",
    metadata: { languageDetected: true },
  }));
  const events = await collect(
    chunkedTranscribeStream(frames(signal([3, 3, 3])), engine.run, {
      engineLabel: "primary-engine",
    }),
  );
  const finals = finalsOf(events);
  assertEqual(finals.length, 3, "three bursts must yield three finals");
  assertEqual(
    finals.map((f) => f.utterance).join(","),
    "1,2,3",
    "utterances must be numbered 1, 2, 3",
  );
  assert(
    events.every((e) => e.type !== "silence" && e.type !== "error"),
    "a clean signal must yield neither silence nor errors",
  );
  // Event ordering: no event of utterance N+1 before the last event of N.
  const order = events
    .filter((e) => "utterance" in e && typeof e.utterance === "number")
    .map((e) => (e as { utterance: number }).utterance);
  assert(
    order.every((u, i) => i === 0 || u >= order[i - 1]),
    "events of an utterance must all precede the next utterance's",
  );
  for (const f of finals) {
    const interims = interimsOf(events, f.utterance);
    assert(
      interims.length >= 2,
      `utterance ${f.utterance} must show live text before its final`,
    );
    const firstInterim = events.indexOf(interims[0]);
    const language = events.findIndex(
      (e) => e.type === "language" && e.utterance === f.utterance,
    );
    assert(
      language >= 0 && language < firstInterim,
      `utterance ${f.utterance} must report its language before its first interim`,
    );
    assert(
      events.indexOf(interims[interims.length - 1]) < events.indexOf(f),
      `utterance ${f.utterance} must finalize after its interims`,
    );
    assertEqual(
      f.engine,
      "primary-engine",
      "events must carry the engine label",
    );
    assert(
      words(f.text).length >= words(interims[interims.length - 1].text).length,
      `utterance ${f.utterance}'s final must hold at least the live words`,
    );
    assert(
      f.seconds > 2.5 && f.seconds < 5,
      `utterance ${f.utterance}'s length must cover its burst`,
    );
    assertEqual(f.segment.isFinal, true, "the final segment must be final");
    assertEqual(
      f.languageDetected,
      true,
      "the final must carry languageDetected",
    );
  }
  const starts = finals.map((f) => f.segment.startTime ?? -1);
  assert(
    starts[0] > 0 && starts[1] > starts[0] + 3 && starts[2] > starts[1] + 3,
    "segment start times must sit on the stream clock",
  );
  assert(
    engine.passes.every((p) => p.engine === "primary"),
    "with no fallback configured every pass must run on the primary",
  );
});

await test("committed text never shrinks within an utterance, and is always a prefix of the shown text", async () => {
  const engine = scripted((p) => ({ text: wordsFor(p.utterance, p.seconds) }));
  const events = await collect(
    chunkedTranscribeStream(frames(signal([5, 4])), engine.run),
  );
  for (const u of [1, 2]) {
    const interims = interimsOf(events, u);
    assert(interims.length >= 3, `utterance ${u} must have several interims`);
    let previous: string[] = [];
    for (const ev of interims) {
      const committed = words(ev.committed);
      const shown = words(ev.text);
      assert(
        committed.length >= previous.length &&
          previous.every((w, i) => committed[i] === w),
        `utterance ${u}: the committed prefix must only grow`,
      );
      assert(
        committed.every((w, i) => shown[i] === w),
        `utterance ${u}: committed must be a prefix of the shown text`,
      );
      assertEqual(
        [...committed, ...words(ev.tail)].join(" "),
        shown.join(" "),
        `utterance ${u}: committed plus tail must equal the shown text`,
      );
      previous = committed;
    }
    assert(previous.length > 0, `utterance ${u} must commit some words`);
  }
});

await test("an empty final pass keeps the live text, and so does a final that collapses below half the shown words", async () => {
  // One 4 s burst per case, with endSilenceMs 400: the utterance ends before
  // an interim pass covers its trailing silence, so a final pass over new
  // audio runs (the precondition below proves it did).
  const cases: Array<{ name: string; final: string }> = [
    { name: "an empty final", final: "" },
    { name: "a collapsed final", final: "u1w1" },
  ];
  for (const c of cases) {
    const engine = scripted((p) =>
      p.final
        ? { text: c.final, words: [{ word: "u1w1", start: 0, end: 0.3 }] }
        : { text: wordsFor(p.utterance, p.seconds) },
    );
    const events = await collect(
      chunkedTranscribeStream(frames(signal([4])), engine.run, {
        endSilenceMs: 400,
      }),
    );
    assert(
      engine.passes.some((p) => p.final),
      `precondition: a final pass must have run for ${c.name}`,
    );
    const interims = interimsOf(events, 1);
    assert(
      interims.length >= 2,
      `precondition: live text must exist before ${c.name}`,
    );
    const final = finalsOf(events)[0];
    assert(final !== undefined, `${c.name} must still yield a final`);
    assertEqual(
      final?.text,
      interims[interims.length - 1]?.text,
      `${c.name} must keep the last live text`,
    );
    assert(
      final?.words === undefined,
      `${c.name}'s kept text must not carry the discarded pass's word times`,
    );
  }
});

await test("an utterance no pass could read becomes a `silence` event with its length; its neighbours are unaffected", async () => {
  const engine = scripted((p) =>
    p.utterance === 2
      ? { text: "" }
      : { text: wordsFor(p.utterance, p.seconds) },
  );
  const events = await collect(
    chunkedTranscribeStream(frames(signal([3, 3, 3])), engine.run),
  );
  assert(
    engine.passes.filter((p) => p.utterance === 2).length >= 2,
    "precondition: the unreadable utterance must have been tried more than once",
  );
  const silences = events.filter(
    (e): e is Extract<TranscribeStreamEvent, { type: "silence" }> =>
      e.type === "silence",
  );
  assertEqual(
    silences.length,
    1,
    "exactly one utterance must be reported silent",
  );
  assertEqual(
    silences[0]?.utterance,
    2,
    "the silent utterance must be the unreadable one",
  );
  assert(
    (silences[0]?.seconds ?? 0) > 2.5,
    "the silence event must report the audio length that went unread",
  );
  assertEqual(
    finalsOf(events)
      .map((f) => f.utterance)
      .join(","),
    "1,3",
    "the readable neighbours must still be finalized",
  );
  assertEqual(
    interimsOf(events, 2).length,
    0,
    "an unread utterance must show no live text",
  );
});

await test("a short click the engine hears nothing in is dropped as a cough without any event, and ids skip over it", async () => {
  // 0.1 s of noise is under the 250 ms minimum speech. Its pre-roll and
  // trailing silence still reach the 0.8 s an interim pass needs, so the
  // engine is asked once — and, like a real one on a click, hears nothing.
  const engine = scripted((p) =>
    p.utterance === 1
      ? { text: "" }
      : { text: wordsFor(p.utterance, p.seconds) },
  );
  const events = await collect(
    chunkedTranscribeStream(frames(signal([0.1, 3])), engine.run),
  );
  const finals = finalsOf(events);
  assertEqual(finals.length, 1, "only the real utterance must be finalized");
  assertEqual(
    finals[0]?.utterance,
    2,
    "the dropped click must consume utterance id 1",
  );
  assert(
    engine.passes.every((p) => p.utterance === 2 || !p.final),
    "a dropped click must never get a final pass",
  );
  assert(
    events.every((e) => e.type !== "silence"),
    "a dropped click is not an unread utterance and must not be reported as silence",
  );
});

await test("a short click the engine did hear words in is finalized, never dropped", async () => {
  const engine = scripted((p) => ({ text: wordsFor(p.utterance, p.seconds) }));
  const events = await collect(
    chunkedTranscribeStream(frames(signal([0.1, 3])), engine.run),
  );
  assert(
    engine.passes.some((p) => p.utterance === 1),
    "precondition: a pass must have run on the click",
  );
  assertEqual(
    finalsOf(events)
      .map((f) => f.utterance)
      .join(","),
    "1,2",
    "an utterance that produced words must be finalized however little speech it had",
  );
});

await test("language takeover (probe off): two unsure passes after 3 s hand the utterance to the fallback for good", async () => {
  const engine = scripted((p) =>
    p.engine === "fallback"
      ? {
          text: `fb ${wordsFor(p.utterance, p.seconds)}`,
          language: "ta",
          metadata: { languageDetected: true },
        }
      : {
          text: wordsFor(p.utterance, p.seconds),
          language: "en",
          metadata: { languageDetected: false },
        },
  );
  const events = await collect(
    chunkedTranscribeStream(frames(signal([6])), engine.run, {
      engineLabel: "primary-engine",
      fallback: { label: "fallback-engine" },
      routing: { probe: false },
    }),
  );
  const firstFallback = engine.passes.findIndex((p) => p.engine === "fallback");
  assert(firstFallback >= 0, "the fallback must have taken over");
  const unsureBefore = engine.passes
    .slice(0, firstFallback)
    .filter((p) => p.engine === "primary");
  assert(
    unsureBefore.length >= 2,
    "the takeover must wait for at least two unsure primary passes",
  );
  assert(
    engine.passes[firstFallback].seconds >= 3,
    "the takeover must not happen before 3 s of audio",
  );
  assert(
    engine.passes.slice(firstFallback).every((p) => p.engine === "fallback"),
    "once taken over, every later pass must stay on the fallback",
  );
  const finals = finalsOf(events);
  assertEqual(finals.length, 1, "one burst must yield one final");
  assertEqual(
    finals[0]?.fallbackUsed,
    true,
    "the final must be marked fallbackUsed",
  );
  assertEqual(
    finals[0]?.engine,
    "fallback-engine",
    "the final must carry the fallback's label",
  );
  assert(
    (finals[0]?.text ?? "").startsWith("fb "),
    "the final text must be the fallback's",
  );
  const languages = events.filter(
    (e): e is Extract<TranscribeStreamEvent, { type: "language" }> =>
      e.type === "language",
  );
  assert(
    languages.length >= 2 &&
      languages[0].detected === false &&
      languages[languages.length - 1].detected === true,
    "language events must report the unsure primary, then the confident fallback",
  );
  const lastPrimaryInterim = events.findIndex(
    (e) => e.type === "interim" && e.engine === "fallback-engine",
  );
  assert(
    lastPrimaryInterim >= 0,
    "the live caption must switch to the fallback without going blank",
  );
});

await test("language takeover (probe off): two confident primary passes rule it out, one only delays it, and a short utterance never switches", async () => {
  // The first two passes confident, every later pass unsure: the primary keeps the utterance.
  const steady = scripted((p) => ({
    text: wordsFor(p.utterance, p.seconds),
    language: "en",
    metadata: { languageDetected: p.seconds < 2.4 },
  }));
  const steadyEvents = await collect(
    chunkedTranscribeStream(frames(signal([6])), steady.run, {
      fallback: { label: "fallback-engine" },
      routing: { probe: false },
    }),
  );
  assert(
    steady.passes.filter((p) => p.seconds < 2.4).length >= 2 &&
      steady.passes.some((p) => p.seconds >= 3),
    "precondition: two passes under 2.4 s, and passes after 3 s",
  );
  assert(
    steady.passes.every((p) => p.engine === "primary"),
    "two confident passes on the utterance must rule the takeover out",
  );
  assert(
    finalsOf(steadyEvents)[0]?.fallbackUsed === undefined,
    "the final must not be marked fallbackUsed",
  );

  // One confident pass, then unsure for good: a language score on a second
  // of audio jitters, so one verdict only delays the hand-off.
  const flaky = scripted((p) => ({
    text: wordsFor(p.utterance, p.seconds),
    language: "en",
    metadata: { languageDetected: p.seconds < 1.5 },
  }));
  const flakyEvents = await collect(
    chunkedTranscribeStream(frames(signal([6])), flaky.run, {
      fallback: { label: "fallback-engine" },
      routing: { probe: false },
    }),
  );
  assertEqual(
    finalsOf(flakyEvents)[0]?.fallbackUsed,
    true,
    "one confident pass followed by unsure ones must still hand over",
  );

  // Always unsure, but 1.6 s of noise plus pre-roll and trailing silence is
  // still under the 3 s floor.
  const short = scripted((p) => ({
    text: wordsFor(p.utterance, p.seconds),
    metadata: { languageDetected: false },
  }));
  await collect(
    chunkedTranscribeStream(frames(signal([1.6])), short.run, {
      fallback: { label: "fallback-engine" },
      routing: { probe: false },
    }),
  );
  assert(
    short.passes.length >= 2 && short.passes.every((p) => p.seconds < 3),
    "precondition: several unsure passes, all under 3 s of audio",
  );
  assert(
    short.passes.every((p) => p.engine === "primary"),
    "an utterance under 3 s must never switch engines",
  );
});

await test("probe (default with a fallback): the first pass runs both engines and the fallback leads at once when the primary is unsure", async () => {
  // A fallback that names no language: the primary's own verdict decides.
  const engine = scripted((p) =>
    p.engine === "fallback"
      ? { text: `fb ${wordsFor(p.utterance, p.seconds)}` }
      : {
          text: `देव ${wordsFor(p.utterance, p.seconds)}`,
          language: "hi",
          metadata: { languageDetected: false },
        },
  );
  const events = await collect(
    chunkedTranscribeStream(frames(signal([6])), engine.run, {
      engineLabel: "primary-engine",
      fallback: { label: "fallback-engine" },
    }),
  );
  const firstProbe = engine.passes.findIndex((p) => p.seconds >= 0.8);
  assert(firstProbe >= 0, "precondition: a pass with at least 0.8 s of audio");
  const probeSeconds = engine.passes[firstProbe].seconds;
  const atProbe = engine.passes.filter((p) => p.seconds === probeSeconds);
  assert(
    atProbe.some((p) => p.engine === "primary") &&
      atProbe.some((p) => p.engine === "fallback"),
    "the probe pass must run the primary and the fallback on the same audio",
  );
  // The default probes twice: the second probe pass may still hand the
  // utterance back to a primary that turned confident. Here it never does,
  // so from the second probe on every pass stays on the fallback.
  const probeTimes = [
    ...new Set(
      engine.passes
        .filter((p) => p.engine === "primary" && p.seconds >= 0.8)
        .map((p) => p.seconds),
    ),
  ];
  assertEqual(
    probeTimes.length,
    2,
    "the primary must run on exactly two probe passes",
  );
  assert(
    engine.passes
      .filter((p) => p.seconds > probeTimes[1])
      .every((p) => p.engine === "fallback"),
    "after the second probe every pass must stay on the fallback (locked)",
  );
  const firstFallbackPass = engine.passes.find((p) => p.engine === "fallback");
  assert(
    firstFallbackPass !== undefined && firstFallbackPass.seconds < 3,
    "the hand-off must happen well before the 3 s takeover floor",
  );
  const interims = interimsOf(events, 1);
  assert(
    interims.some((e) => e.engine === "fallback-engine" && e.seconds < 3),
    "a fallback caption must be shown before 3 s",
  );
  const final = finalsOf(events)[0];
  assertEqual(
    final?.fallbackUsed,
    true,
    "the final must be marked fallbackUsed",
  );
  assert(
    (final?.text ?? "").startsWith("fb "),
    "the final text must be the fallback's",
  );
});

await test("probe: a confident primary locks the utterance after two consistent probes, and a fallback that answers in the primary's script does not take over", async () => {
  const confident = scripted((p) =>
    p.engine === "fallback"
      ? { text: `fb ${wordsFor(p.utterance, p.seconds)}` }
      : {
          text: wordsFor(p.utterance, p.seconds),
          language: "ta",
          metadata: { languageDetected: true },
        },
  );
  const events = await collect(
    chunkedTranscribeStream(frames(signal([6])), confident.run, {
      fallback: { label: "fallback-engine" },
    }),
  );
  const fallbackCalls = confident.passes.filter((p) => p.engine === "fallback");
  assertEqual(
    fallbackCalls.length,
    2,
    "a confident primary locks on the second consistent probe: the fallback runs exactly twice",
  );
  assert(
    confident.passes.filter((p) => p.engine === "primary").length >= 3,
    "the primary must keep every later pass",
  );
  assertEqual(finalsOf(events)[0]?.fallbackUsed, undefined, "no takeover");

  // Primary unsure, but the fallback answers in a non-Latin script: no hand-off from the probe.
  const sameScript = scripted((p) =>
    p.engine === "fallback"
      ? { text: `देव ${wordsFor(p.utterance, p.seconds)}` }
      : {
          text: `देव ${wordsFor(p.utterance, p.seconds)}`,
          metadata: { languageDetected: false },
        },
  );
  const sameEvents = await collect(
    chunkedTranscribeStream(frames(signal([2.4])), sameScript.run, {
      fallback: { label: "fallback-engine" },
    }),
  );
  assert(
    interimsOf(sameEvents, 1)[0]?.engine !== "fallback-engine",
    "the probe must not hand over to a fallback that cannot read the language either",
  );
});

await test("probe with a fallback that names its language: English heard and the primary unsure settles at once, pinned to English", async () => {
  const engine = scripted((p) =>
    p.engine === "fallback"
      ? {
          text: `fb ${wordsFor(p.utterance, p.seconds)}`,
          language: p.languageHint ?? "en",
        }
      : {
          text: `देव ${wordsFor(p.utterance, p.seconds)}`,
          language: "hi",
          metadata: { languageDetected: false },
        },
  );
  const events = await collect(
    chunkedTranscribeStream(frames(signal([6])), engine.run, {
      engineLabel: "primary-engine",
      fallback: { label: "fallback-engine" },
    }),
  );
  // Agreeing verdicts are provisional below 2.5 s of audio, then settle:
  // the primary stops running and the fallback is pinned to English.
  const primaryPasses = engine.passes.filter((p) => p.engine === "primary");
  const settledAt = Math.max(...primaryPasses.map((p) => p.seconds));
  assert(
    settledAt >= 2.5 && settledAt < 4,
    "the primary must keep probing until 2.5 s, then stop",
  );
  assert(
    !primaryPasses.some((p) => p.final),
    "a settled utterance's final needs no second look",
  );
  const later = engine.passes.filter(
    (p) => p.engine === "fallback" && p.seconds > settledAt,
  );
  assert(
    later.length > 0 && later.every((p) => p.languageHint === "en"),
    "the fallback must be pinned to English once settled",
  );
  assert(
    engine.passes
      .filter((p) => p.engine === "fallback" && p.seconds <= settledAt)
      .every((p) => p.languageHint === undefined),
    "provisional passes must not pin the fallback",
  );
  const f = finalsOf(events)[0];
  assertEqual(
    f?.engine,
    "fallback-engine",
    "the fallback must write the utterance",
  );
  assertEqual(
    f?.language,
    "en",
    "the label must be the language the fallback heard, never the primary's unsure guess",
  );
  assert(
    interimsOf(events, f?.utterance ?? -1).every((i) => !/[ऀ-ॿ]/u.test(i.text)),
    "no interim may show the primary's Devanagari",
  );
});

await test("probe with a fallback that names its language: a confident primary and English heard is mixed speech; the primary leads and the final looks again", async () => {
  const engine = scripted((p) =>
    p.engine === "fallback"
      ? { text: `fb ${wordsFor(p.utterance, p.seconds)}`, language: "en" }
      : {
          text: `देव ${wordsFor(p.utterance, p.seconds)}`,
          language: "hi",
          metadata: { languageDetected: true },
        },
  );
  const events = await collect(
    chunkedTranscribeStream(frames(signal([6])), engine.run, {
      fallback: { label: "fallback-engine" },
    }),
  );
  const f = finalsOf(events)[0];
  assertEqual(f?.engine, "primary", "the confident primary leads mixed speech");
  assertEqual(
    f?.language,
    "hi",
    "the label is the primary's confident language",
  );
  assert(
    engine.passes.some((p) => p.final && p.engine === "fallback") &&
      engine.passes.some((p) => p.final && p.engine === "primary"),
    "the final pass must run both engines when they disagreed",
  );
});

await test("probe: an Indic verdict from the fallback in an English stream on audio the primary cannot place is asked again in English", async () => {
  // The first utterance makes the stream English; on the second, the
  // fallback drifts into Devanagari unless it is asked in English.
  let firstUtterance: number | undefined;
  const engine = scripted((p) => {
    firstUtterance ??= p.utterance;
    if (p.engine === "fallback") {
      if (p.languageHint === "en") {
        return {
          text: `as an ${wordsFor(p.utterance, p.seconds)}`,
          language: "en",
        };
      }
      if (p.utterance !== firstUtterance) {
        return { text: "एज़न", language: "hi" };
      }
      return {
        text: `english ${wordsFor(p.utterance, p.seconds)}`,
        language: "en",
      };
    }
    return { text: "", language: "hi", metadata: { languageDetected: false } };
  });
  const events = await collect(
    chunkedTranscribeStream(frames(signal([3, 3])), engine.run, {
      fallback: { label: "fallback-engine" },
    }),
  );
  const finals = finalsOf(events);
  assertEqual(finals.length, 2, "precondition: two utterances");
  assert(
    events.every(
      (e) =>
        !(e.type === "interim" || e.type === "final") || !/[ऀ-ॿ]/u.test(e.text),
    ),
    "the second utterance must never show the fallback's Devanagari drift",
  );
  assert(
    engine.passes.some(
      (p) =>
        p.engine === "fallback" &&
        p.languageHint === "en" &&
        p.utterance === finals[1]?.utterance,
    ),
    "the fallback must be asked again in English",
  );
});

await test('secondOpinion "auto": on an utterance the engines disagreed about, the losing reading travels with the final and is reconciled with a word alignment', async () => {
  const d = modelDeps(
    {
      primary: () => ({
        text: "खाल मीटिंग है एट थ्री पी एम प्लीज़ रिपोर्ट भेज देना",
        language: "hi",
        metadata: {
          languageDetected: true,
          languageScores: [{ language: "hi", score: -0.15 }],
        },
      }),
      spark: () => ({
        text: "Call meeting here at three p.m. Please report page dinner",
        language: "en",
      }),
    },
    () => ({}),
  );
  const events = await collect(
    runTranscribeStream(
      {
        audio: frames(signal([4])),
        fallback: { provider: "spark" },
        correction: { secondOpinion: "auto", rewrite: { mode: "always" } },
      },
      d,
    ),
  );
  const f = finalsOf(events)[0];
  assert(
    f?.alternative !== undefined,
    "a disagreed-on final must carry the other engine's reading",
  );
  const prompt = d.rewrites.at(-1)?.user ?? "";
  assert(prompt.includes("Transcript 2"), "the rewrite must get both readings");
  assert(
    prompt.includes("Word alignment"),
    "the rewrite must get the word alignment",
  );
  assert(
    prompt.includes("मीटिंग ≈ meeting"),
    "same-sounding words must be paired",
  );
  const corrected = events.find((e) => e.type === "corrected");
  assert(
    corrected?.type === "corrected" &&
      corrected.steps.some((st) => st.startsWith("reconciled with")),
    "the steps must say which reading was reconciled",
  );
});

await test("probe: a primary that states no language confidence keeps the lead when the fallback names a language", async () => {
  const engine = scripted((p) =>
    p.engine === "fallback"
      ? { text: `fb ${wordsFor(p.utterance, p.seconds)}`, language: "en" }
      : { text: `primary ${wordsFor(p.utterance, p.seconds)}`, language: "en" },
  );
  const events = await collect(
    chunkedTranscribeStream(frames(signal([4])), engine.run, {
      engineLabel: "deepgram",
      fallback: { label: "whisper" },
    }),
  );
  assertEqual(
    finalsOf(events)[0]?.engine,
    "deepgram",
    "the primary must keep the utterance",
  );
  assert(
    engine.passes.every((p) => p.languageHint === undefined),
    "no pass may be pinned to a language",
  );
});

await test("probe: a Spanish utterance on a non-Indic primary is never re-asked in English", async () => {
  const engine = scripted((p) =>
    p.engine === "fallback"
      ? {
          text:
            p.languageHint === "en" ? "see clear tomorrow" : "sí claro mañana",
          language: p.languageHint ?? "es",
        }
      : { text: "", language: "es", metadata: { languageDetected: false } },
  );
  const events = await collect(
    chunkedTranscribeStream(frames(signal([1.8])), engine.run, {
      fallback: { label: "whisper" },
    }),
  );
  assert(
    engine.passes.every((p) => p.languageHint !== "en"),
    "the fallback must not be forced into English",
  );
  assert(
    finalsOf(events).every((f) => !f.text.includes("see clear")),
    "the Spanish reading must stand",
  );
});

await test("probe: one confident verdict after an unsure one does not lock; a third probe decides, by what it says", async () => {
  // The primary's verdicts on its passes: the first interim is already a
  // probe, so the probes see unsure, confident, and the deciding one.
  const flipFlop = (third: boolean) => {
    let primaryPasses = 0;
    return scripted((p) => {
      if (p.engine === "fallback") {
        return { text: `fb ${wordsFor(p.utterance, p.seconds)}` };
      }
      primaryPasses++;
      const verdict =
        primaryPasses <= 1 ? false : primaryPasses === 2 ? true : third;
      return {
        text: `देव ${wordsFor(p.utterance, p.seconds)}`,
        language: "hi",
        metadata: { languageDetected: verdict },
      };
    });
  };
  const wobble = flipFlop(false);
  const wobbleEvents = await collect(
    chunkedTranscribeStream(frames(signal([6])), wobble.run, {
      fallback: { label: "fallback-engine" },
    }),
  );
  assert(
    wobble.passes.filter((p) => p.engine === "fallback").length >= 3,
    "disagreeing verdicts must buy a third probe",
  );
  assertEqual(
    finalsOf(wobbleEvents)[0]?.engine,
    "fallback-engine",
    "unsure, confident, unsure must end with the fallback",
  );
  const settles = flipFlop(true);
  const settleEvents = await collect(
    chunkedTranscribeStream(frames(signal([6])), settles.run, {
      fallback: { label: "fallback-engine" },
    }),
  );
  assertEqual(
    finalsOf(settleEvents)[0]?.engine,
    "primary",
    "unsure, confident, confident must end with the primary",
  );
  assertEqual(
    finalsOf(settleEvents)[0]?.fallbackUsed,
    undefined,
    "a primary that confirmed itself is not a takeover",
  );
});

await test("prior: the last confident language is carried into the next utterance's primary passes, unless routing.prior is none", async () => {
  const engine = scripted((p) => ({
    text: wordsFor(p.utterance, p.seconds),
    language: "ta",
    metadata: { languageDetected: true },
  }));
  await collect(
    chunkedTranscribeStream(frames(signal([3, 3])), engine.run, {
      fallback: { label: "fallback-engine" },
    }),
  );
  const second = engine.passes.filter(
    (p) => p.utterance === 2 && p.engine === "primary",
  );
  assert(
    second.length > 0,
    "precondition: the second utterance ran primary passes",
  );
  assert(
    second.every((p) => p.languagePrior === "ta"),
    "every primary pass of the second utterance must carry the prior from the first",
  );
  assert(
    engine.passes
      .filter((p) => p.engine === "fallback")
      .every((p) => p.languagePrior === undefined),
    "the prior is never sent to the fallback engine",
  );

  const cold = scripted((p) => ({
    text: wordsFor(p.utterance, p.seconds),
    language: "ta",
    metadata: { languageDetected: true },
  }));
  await collect(
    chunkedTranscribeStream(frames(signal([3, 3])), cold.run, {
      fallback: { label: "fallback-engine" },
      routing: { prior: "none" },
    }),
  );
  assert(
    cold.passes.every((p) => p.languagePrior === undefined),
    "with routing.prior none, no pass carries a prior",
  );
});

await test("near-silence guard: a mostly-pause utterance whose only output is a filler in a foreign script is reported as silence; real speech in that script is kept", async () => {
  // A 3 s burst of English, then a long quiet tail that still clears the
  // onset gate briefly: the engine answers the pause with one Devanagari word.
  const engine = scripted((p) =>
    p.utterance === 1
      ? { text: "the quick brown fox jumps over the lazy dog", language: "en" }
      : { text: "हाँ", language: "hi" },
  );
  const audio = Float32Array.from([
    ...signal([3]),
    ...pause(0.6),
    ...signal([0.3], 2.5),
  ]);
  const events = await collect(
    chunkedTranscribeStream(frames(audio), engine.run),
  );
  const finals = finalsOf(events);
  assert(
    finals.length >= 1 && finals[0].text.startsWith("the quick"),
    "the speech utterance must be final text",
  );
  const silences = events.filter((e) => e.type === "silence");
  assert(
    silences.length >= 1 && !finals.some((f) => f.text === "हाँ"),
    "the pause's one-word foreign output must be reported as silence, not text",
  );

  // The same one-word output in the session's own script is kept.
  const sameScript = scripted((p) =>
    p.utterance === 1
      ? { text: "the quick brown fox jumps over the lazy dog", language: "en" }
      : { text: "yes", language: "en" },
  );
  const kept = await collect(
    chunkedTranscribeStream(frames(audio), sameScript.run),
  );
  assert(
    finalsOf(kept).some((f) => f.text === "yes"),
    "a short answer in the session's script is kept",
  );
});

await test("a failed interim pass is a recoverable error and the utterance still finalizes", async () => {
  let failed = false;
  const engine = scripted((p) => {
    if (!p.final && !failed) {
      failed = true;
      throw new Error("engine hiccup");
    }
    return { text: wordsFor(p.utterance, p.seconds) };
  });
  const events = await collect(
    chunkedTranscribeStream(frames(signal([3])), engine.run),
  );
  const errors = events.filter(
    (e): e is Extract<TranscribeStreamEvent, { type: "error" }> =>
      e.type === "error",
  );
  assertEqual(errors.length, 1, "the failed pass must be reported once");
  assertEqual(
    errors[0]?.recoverable,
    true,
    "a failed pass must be recoverable",
  );
  assertEqual(errors[0]?.utterance, 1, "the error must name its utterance");
  assertEqual(
    finalsOf(events).length,
    1,
    "the utterance must still be finalized",
  );
});

await test("audio at another input rate reaches the engine resampled to 16 kHz", async () => {
  const engine = scripted((p) => ({ text: wordsFor(p.utterance, p.seconds) }));
  // The same 3 s burst at 48 kHz: repeat each 16 kHz sample three times.
  const base = signal([3]);
  const upsampled = new Float32Array(base.length * 3);
  for (let i = 0; i < upsampled.length; i++) {
    upsampled[i] = base[Math.floor(i / 3)];
  }
  const pcm = Buffer.alloc(upsampled.length * 2);
  upsampled.forEach((s, i) => pcm.writeInt16LE(Math.round(s * 32767), i * 2));
  async function* at48k(): AsyncGenerator<Buffer> {
    for (let at = 0; at < pcm.length; at += 9600) {
      yield pcm.subarray(at, at + 9600);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }
  const events = await collect(
    chunkedTranscribeStream(at48k(), engine.run, { sampleRate: 48000 }),
  );
  const finals = finalsOf(events);
  assertEqual(finals.length, 1, "a 48 kHz burst must still make one utterance");
  assert(engine.passes.length >= 2, "precondition: passes must have run");
  assert(
    engine.passes.every(
      (p) =>
        Math.abs(
          p.samples -
            (ENGINE_TAIL_PAD_MS / 1000) * 16000 -
            Math.floor(p.seconds * 16000),
        ) <= 16,
    ),
    "every pass must receive the utterance at 16 kHz",
  );
  assert(
    (finals[0]?.seconds ?? 0) > 3 && (finals[0]?.seconds ?? 0) < 5,
    "utterance seconds must be measured at the input rate",
  );
});

// ---------------------------------------------------------------------------
// Speech detector
// ---------------------------------------------------------------------------

/**
 * A detector that calls a frame speech when its RMS is above `threshold`:
 * the energy rule wearing a detector's interface, so the gate's behaviour
 * under a detector is pinned on the same deterministic signal.
 */
function energyDetector(
  name = "scripted",
  threshold = 0.05,
): STTSpeechDetector & { frames: number; resets: number } {
  const detector = {
    name,
    frameSamples: 512,
    frames: 0,
    resets: 0,
    score(frame: Float32Array): number {
      detector.frames++;
      let sum = 0;
      for (const v of frame) {
        sum += v * v;
      }
      return Math.sqrt(sum / frame.length) > threshold ? 0.95 : 0.02;
    },
    reset(): void {
      detector.resets++;
    },
  };
  return detector;
}

await test("speech detector: the gate follows the detector — three bursts make three finals that name it and count their speech; a detector that hears no speech yields no utterance and no engine pass", async () => {
  const engine = scripted((p) => ({ text: wordsFor(p.utterance, p.seconds) }));
  const detector = energyDetector();
  const events = await collect(
    chunkedTranscribeStream(frames(signal([3, 3, 3])), engine.run, {
      speechDetector: detector,
    }),
  );
  const finals = finalsOf(events);
  assertEqual(finals.length, 3, "three bursts must yield three finals");
  assertEqual(
    detector.resets,
    1,
    "the detector must be reset once, at the start of the stream",
  );
  assert(detector.frames > 200, "every frame of the stream must be scored");
  assert(
    finals.every((f) => f.vad === "scripted"),
    "finals must name the detector that found them",
  );
  assert(
    finals.every(
      (f) => (f.speechSeconds ?? 0) > 2.5 && (f.speechSeconds ?? 0) < 3.4,
    ),
    "speechSeconds must count the burst, not the closing pause",
  );
  assert(
    finals.every((f) => f.seconds > f.speechSeconds!),
    "the utterance's span must be longer than its speech",
  );

  const deaf: STTSpeechDetector = {
    name: "deaf",
    frameSamples: 512,
    score: () => 0,
    reset: () => undefined,
  };
  const idle = scripted((p) => ({ text: wordsFor(p.utterance, p.seconds) }));
  const nothing = await collect(
    chunkedTranscribeStream(frames(signal([3, 3, 3])), idle.run, {
      speechDetector: deaf,
    }),
  );
  assertEqual(
    nothing.filter((e) => e.type === "final" || e.type === "silence").length,
    0,
    "a detector that hears no speech must open no utterance",
  );
  assertEqual(
    idle.passes.length,
    0,
    "the engine must never be called when nothing is speech",
  );
  assert(
    nothing.every((e) => e.type !== "error"),
    "a silent stream is not an error",
  );
});

await test("speech detector: the onset confirmation is kept by the pre-roll, and the engine gets the utterance without its closing pause", async () => {
  const engine = scripted((p) => ({ text: wordsFor(p.utterance, p.seconds) }));
  const events = await collect(
    chunkedTranscribeStream(frames(signal([2])), engine.run, {
      speechDetector: energyDetector(),
      vad: { startMs: 200 },
      // One interim early, then nothing until the final: the final pass must run and is what is measured.
      intervalMs: 5000,
    }),
  );
  const finals = finalsOf(events);
  assertEqual(finals.length, 1, "one burst must yield one final");
  const finalPass = engine.passes.filter((p) => p.final).at(-1);
  if (finalPass === undefined) {
    throw new Error("a final pass must have run");
  }
  // The utterance holds some pre-roll, the 2 s burst and 750 ms of closing
  // pause; the engine must get the whole burst (confirmation included) but
  // not the pause — only the silence pad after it.
  const pad = (ENGINE_TAIL_PAD_MS / 1000) * RATE;
  assert(
    finalPass.samples >= 2.0 * RATE + pad,
    "the burst must reach the engine in full, the onset confirmation included",
  );
  assert(
    finalPass.samples < 2.6 * RATE + pad,
    "the closing pause must be trimmed from what the engine gets",
  );
  assert(
    finalPass.tail.every((v) => v === 0),
    "what the engine gets must end in digital silence, not the recorded pause",
  );
  assert(
    finals[0].seconds > 2.8,
    "the utterance itself must keep its full span",
  );
  assert(
    finals[0].segment.endTime! - finals[0].segment.startTime! > 2.8,
    "segment times must span the whole utterance",
  );
});

await test("speech detector: one that breaks mid-stream hands the gate to the energy rule, and the utterances still arrive, labelled energy", async () => {
  let calls = 0;
  const flaky: STTSpeechDetector = {
    name: "flaky",
    frameSamples: 512,
    score: () => {
      calls++;
      if (calls > 10) {
        throw new Error("detector broke");
      }
      return 0.02;
    },
    reset: () => undefined,
  };
  const engine = scripted((p) => ({ text: wordsFor(p.utterance, p.seconds) }));
  const events = await collect(
    chunkedTranscribeStream(frames(signal([3, 3])), engine.run, {
      speechDetector: flaky,
    }),
  );
  const finals = finalsOf(events);
  assertEqual(finals.length, 2, "both bursts must still be finalized");
  assert(
    finals.every((f) => f.vad === "energy"),
    "finals after the failure must say the energy gate found them",
  );
  assert(
    events.every((e) => e.type !== "error"),
    "a detector failure is handled, not reported as a stream error",
  );
  assertEqual(calls, 11, "the detector must not be asked again once it broke");
});

await test("speech detector: a short utterance cannot hold more words than its speech allows — reported as silence; the same words on enough speech are kept", async () => {
  const chatty = scripted(() => ({ text: "w1 w2 w3 w4 w5 w6 w7 w8" }));
  const short = await collect(
    chunkedTranscribeStream(frames(signal([0.4])), chatty.run, {
      speechDetector: energyDetector(),
    }),
  );
  assertEqual(
    finalsOf(short).length,
    0,
    "eight words on 0.4 s of speech must not become a final",
  );
  const silence = short.find((e) => e.type === "silence");
  if (silence === undefined) {
    throw new Error("the utterance must be reported as silence");
  }
  assert(
    silence.type === "silence" &&
      silence.vad === "scripted" &&
      (silence.speechSeconds ?? 1) < 0.6,
    "the silence event must carry the detector and its speech count",
  );
  const spoken = scripted(() => ({ text: "w1 w2 w3 w4 w5 w6 w7 w8" }));
  const long = await collect(
    chunkedTranscribeStream(frames(signal([2])), spoken.run, {
      speechDetector: energyDetector(),
    }),
  );
  assertEqual(
    finalsOf(long).length,
    1,
    "eight words on 2 s of speech are a sentence and must be kept",
  );
});

// ===========================================================================
// Stream orchestration (runTranscribeStream)
// ===========================================================================

type DepsLog = {
  calls: Array<{ provider: string; options: STTOptions; seconds: number }>;
};

/** Hand-built deps: a batch engine per provider name, no decision provider, no rewrite model. */
function deps(
  engines: Record<string, (seconds: number, n: number) => ScriptResult>,
  handlers: Record<string, STTHandler> = {},
): TranscribeDeps & DepsLog {
  const calls: DepsLog["calls"] = [];
  return {
    calls,
    transcribe: async (audio, provider, options) => {
      const seconds = (audio.length - 44) / (2 * 16000);
      calls.push({ provider, options, seconds });
      const engine = engines[provider];
      if (!engine) {
        throw new Error("no such engine");
      }
      return asResult(
        engine(seconds, calls.filter((c) => c.provider === provider).length),
      );
    },
    resolveProvider: (name) => {
      const value = name?.trim() || "primary";
      if (!(value in engines) && !(value in handlers)) {
        throw new Error("unknown provider");
      }
      return value;
    },
    getHandler: (name) => handlers[name],
    decide: async () => null,
    rewrite: async () => {
      throw new Error("no rewrite model in this suite");
    },
  };
}

await test("runTranscribeStream: each final is followed by one corrected event; the dictionary applies and the guard fails open", async () => {
  const d = deps({
    primary: (s) => ({ text: `please ask jasper ${wordsFor(1, s)}` }),
  });
  const events = await collect(
    runTranscribeStream(
      {
        audio: frames(signal([3, 3])),
        language: "auto",
        dictionary: [{ term: "Jaspr", heardAs: ["jasper"] }],
        correction: { rewrite: false },
      },
      d,
    ),
  );
  const finals = finalsOf(events);
  assertEqual(finals.length, 2, "two bursts must yield two finals");
  const corrected = events.filter(
    (e): e is Extract<TranscribeStreamEvent, { type: "corrected" }> =>
      e.type === "corrected",
  );
  assertEqual(corrected.length, 2, "every final must get one corrected event");
  for (const f of finals) {
    const c = corrected.find((x) => x.utterance === f.utterance);
    assert(c !== undefined, `utterance ${f.utterance} must be corrected`);
    assert(
      events.indexOf(c as TranscribeStreamEvent) > events.indexOf(f),
      `utterance ${f.utterance}'s correction must follow its final`,
    );
    assertEqual(c?.raw, f.text, "corrected.raw must be the final's text");
    assert(
      (c?.text ?? "").includes("Jaspr") && !(c?.text ?? "").includes("jasper"),
      "the dictionary must be applied to the final",
    );
    assertEqual(
      c?.decisions[0]?.choice,
      "term",
      "fail-open must apply the term",
    );
    assert(
      typeof c?.decisions[0]?.note === "string",
      "a fail-open decision must say why no model decided",
    );
    assert(
      typeof c?.timings.totalMs === "number",
      "the correction must report its timings",
    );
  }
  assert(
    d.calls.every(
      (c) =>
        c.options.language === undefined &&
        c.options.format === "wav" &&
        (c.options.vocabulary ?? []).includes("Jaspr") &&
        ((c.options as { prompt?: string }).prompt ?? "").includes("Jaspr"),
    ),
    "every pass must carry the dictionary as vocabulary and prompt, and no auto language",
  );
});

await test("runTranscribeStream: without correction no corrected event is emitted", async () => {
  const d = deps({ primary: (s) => ({ text: wordsFor(1, s) }) });
  const events = await collect(
    runTranscribeStream({ audio: frames(signal([3])) }, d),
  );
  assertEqual(finalsOf(events).length, 1, "one burst must yield one final");
  assert(
    events.every((e) => e.type !== "corrected" && e.type !== "correcting"),
    "no correction events without a dictionary or correction options",
  );
});

await test("runTranscribeStream: when the primary hears nothing, the second opinion's text becomes the final instead of silence", async () => {
  const d = deps({
    primary: () => ({ text: "" }),
    second: (s) => ({ text: `second ${wordsFor(1, s)}` }),
  });
  const events = await collect(
    runTranscribeStream(
      {
        audio: frames(signal([3])),
        correction: { rewrite: false, secondOpinion: { provider: "second" } },
        dictionary: [{ term: "Nothing", heardAs: ["nada"] }],
      },
      d,
    ),
  );
  assert(
    d.calls.some((c) => c.provider === "second"),
    "precondition: the second opinion must have run",
  );
  const finals = finalsOf(events);
  assertEqual(
    finals.length,
    1,
    "the utterance must be finalized from the second opinion",
  );
  assertEqual(
    finals[0]?.engine,
    "second",
    "the final must name the second engine",
  );
  assert(
    events.every((e) => e.type !== "silence"),
    "no silence when another engine heard words",
  );
  const corrected = events.find((e) => e.type === "corrected");
  assert(
    corrected?.type === "corrected" &&
      corrected.steps.some((s) => s.includes("returned nothing")),
    "the correction steps must say why the second engine's text was used",
  );
});

await test("runTranscribeStream: an unknown fallback is a recoverable error and the primary still serves the stream", async () => {
  const d = deps({ primary: (s) => ({ text: wordsFor(1, s) }) });
  const events = await collect(
    runTranscribeStream(
      { audio: frames(signal([3])), fallback: { provider: "missing" } },
      d,
    ),
  );
  const errors = events.filter(
    (e): e is Extract<TranscribeStreamEvent, { type: "error" }> =>
      e.type === "error",
  );
  assertEqual(errors.length, 1, "the unknown fallback must be reported once");
  assertEqual(
    errors[0]?.recoverable,
    true,
    "a missing fallback must not end the stream",
  );
  assertEqual(
    events.indexOf(errors[0]),
    0,
    "the configuration error must come first",
  );
  assertEqual(
    finalsOf(events).length,
    1,
    "the primary must still finalize the utterance",
  );
});

await test("runTranscribeStream: a native handler's commits are joined into one final per sentence, never dropping pending words", async () => {
  const segments: TranscriptionSegment[] = [
    { index: 0, text: "Let us review", isFinal: false, language: "en" },
    {
      index: 1,
      text: "Let us review the",
      isFinal: true,
      startTime: 0.4,
      endTime: 1.6,
    },
    { index: 2, text: "plan.", isFinal: false },
    { index: 3, text: "plan.", isFinal: true, startTime: 1.6, endTime: 2.1 },
    { index: 4, text: "Next item", isFinal: false },
  ];
  const native: STTHandler = {
    isConfigured: () => true,
    getSupportedFormats: () => ["wav", "pcm16"],
    supportsStreaming: true,
    transcribe: async () => asResult({ text: "" }),
    transcribeStream: async function* (audio: AsyncIterable<Buffer>) {
      // Consume the audio as a real engine would, then report.
      for await (const _frame of audio) {
        // drain
      }
      yield* segments;
    },
  };
  const d = deps({}, { live: native });
  const events = await collect(
    runTranscribeStream(
      { audio: frames(signal([1])), provider: "live", language: "auto" },
      d,
    ),
  );
  const finals = finalsOf(events);
  assertEqual(
    finals.length,
    2,
    "a sentence and the trailing pending words must make two finals",
  );
  assertEqual(
    finals[0]?.text,
    "Let us review the plan.",
    "a commit without a sentence end must keep the utterance open",
  );
  assertEqual(
    finals[1]?.text,
    "Next item",
    "words still pending when the stream ends must be finalized, not dropped",
  );
  assert(
    events.findIndex((e) => e.type === "language") === 0,
    "the engine's language must be reported before any text",
  );
  assertEqual(
    d.calls.length,
    0,
    "a native stream must not go through batch passes",
  );
});

// ===========================================================================
// Quality layers and output languages
// ===========================================================================

type RenderCall = { system: string; user: string; keys: string[] };
type RewriteCall = { system: string; user: string };

/** `deps` plus a scripted rewrite (echoes the transcript) and render (one string per tag per line). */
function modelDeps(
  engines: Record<string, (seconds: number, n: number) => ScriptResult>,
  render: (
    keys: string[],
    lines: number,
    user: string,
  ) => Record<string, string[]>,
): TranscribeDeps &
  DepsLog & { renders: RenderCall[]; rewrites: RewriteCall[] } {
  const base = deps(engines);
  const renders: RenderCall[] = [];
  const rewrites: RewriteCall[] = [];
  return {
    ...base,
    renders,
    rewrites,
    rewrite: async (o) => {
      rewrites.push({ system: o.system, user: o.user });
      const line = o.user.split("\n").find((l) => l.startsWith("Transcript"));
      return (line ?? "").replace(/^Transcript[^:]*:\s*/u, "");
    },
    render: async (o) => {
      const shape = (o.schema as unknown as { shape: Record<string, unknown> })
        .shape;
      const keys = Object.keys(shape);
      renders.push({ system: o.system, user: o.user, keys });
      const lines = (
        o.user.split("Lines to render (as recognized):\n")[1] ?? ""
      )
        .split("\n\n")[0]
        .split("\n")
        .filter((l) => /^\d+\. /u.test(l)).length;
      return render(keys, lines, o.user);
    },
  };
}

type OutputEvent = Extract<TranscribeStreamEvent, { type: "output" }>;
const outputsOf = (events: readonly { type: string }[]): OutputEvent[] =>
  events.filter((e): e is OutputEvent => e.type === "output");

await test("outputs: one render call per utterance covers every language, after its corrected event; source needs no call", async () => {
  const d = modelDeps(
    {
      primary: (s) => ({
        text: `hello team ${wordsFor(1, s)}.`,
        language: "en",
      }),
    },
    (keys, lines) =>
      Object.fromEntries(
        keys.map((k) => [
          k,
          Array.from({ length: lines }, () =>
            k === "es" ? "hola equipo" : "bonjour équipe",
          ),
        ]),
      ),
  );
  const events = await collect(
    runTranscribeStream(
      {
        audio: frames(signal([3, 3])),
        correction: { rewrite: false },
        dictionary: [{ term: "Jaspr" }],
        output: { languages: ["es", "fr", "source"] },
      },
      d,
    ),
  );
  const finals = finalsOf(events);
  assertEqual(finals.length, 2, "precondition: two utterances");
  assertEqual(d.renders.length, 2, "one render call per utterance");
  assert(
    d.renders.every(
      (r) =>
        r.keys.length === 2 && r.keys.includes("es") && r.keys.includes("fr"),
    ),
    "each call must carry every language that needs a model, and not source",
  );
  const outs = outputsOf(events);
  assertEqual(outs.length, 6, "three outputs per utterance");
  for (const f of finals) {
    const corrected = events.findIndex(
      (e) => e.type === "corrected" && e.utterance === f.utterance,
    );
    const mine = outs.filter((o) => o.utterance === f.utterance);
    assert(
      mine.every(
        (o) => events.indexOf(o) > corrected && o.basedOn === "corrected",
      ),
      "outputs must follow the corrected event",
    );
    assertEqual(
      mine.find((o) => o.language === "es")?.status,
      "ok",
      "es must render",
    );
    assertEqual(
      mine.find((o) => o.language === "source")?.status,
      "same-language",
      "source must be the transcript",
    );
  }
  assert(
    d.renders[1]?.user.includes("Earlier in the conversation") === true,
    "the second utterance must see the first as context",
  );
  assert(
    d.renders[0]?.system.includes('"Jaspr"') === true,
    "dictionary terms must be kept as a glossary",
  );
});

await test("outputs: a rendering in the wrong script is retried alone and then refused; the transcript is untouched", async () => {
  const d = modelDeps(
    {
      primary: () => ({ text: "please send the report today", language: "en" }),
    },
    (keys, lines) =>
      Object.fromEntries(
        keys.map((k) => [
          k,
          Array.from({ length: lines }, () => "please send the report today"),
        ]),
      ),
  );
  const events = await collect(
    runTranscribeStream(
      { audio: frames(signal([3])), output: { languages: ["hi"] } },
      d,
    ),
  );
  const out = outputsOf(events)[0];
  assertEqual(
    out?.status,
    "rejected",
    "Latin text for a Devanagari target must be refused",
  );
  assertEqual(
    out?.basedOn,
    "final",
    "without correction the output follows the final",
  );
  assertEqual(d.renders.length, 2, "a refused target gets exactly one retry");
  assertEqual(
    finalsOf(events)[0]?.text,
    "please send the report today",
    "the final must be unchanged",
  );
});

await test("outputs: a failing render model never costs the transcript", async () => {
  const d = deps({
    primary: () => ({ text: "status update for everyone", language: "en" }),
  });
  d.render = async () => {
    throw new Error("model down");
  };
  const events = await collect(
    runTranscribeStream(
      { audio: frames(signal([3])), output: { languages: ["de"] } },
      d,
    ),
  );
  assertEqual(finalsOf(events).length, 1, "the final must still arrive");
  assertEqual(
    outputsOf(events)[0]?.status,
    "error",
    "the output must report the failure",
  );
});

await test("outputs: languages read from a live source change from the next utterance on", async () => {
  let live: string[] = [];
  const d = modelDeps(
    { primary: (s) => ({ text: `words ${wordsFor(1, s)}`, language: "en" }) },
    (keys, lines) =>
      Object.fromEntries(
        keys.map((k) => [k, Array.from({ length: lines }, () => "palabras")]),
      ),
  );
  const events: TranscribeStreamEvent[] = [];
  for await (const e of runTranscribeStream(
    {
      audio: frames(signal([3, 3])),
      output: { languages: { current: () => live } },
    },
    d,
  )) {
    events.push(e);
    if (e.type === "final" && e.utterance === finalsOf(events)[0]?.utterance) {
      live = ["es"];
    }
  }
  const outs = outputsOf(events);
  assert(
    outs.length >= 1 && outs.every((o) => o.language === "es"),
    "languages set mid-stream must render",
  );
  assert(
    outs.every((o) => o.utterance !== finalsOf(events)[0]?.utterance) ||
      outs.length === 2,
    "renders follow the languages in effect when an utterance settles",
  );
});

await test("routing.engines: a final whose language belongs to another engine is read again by it", async () => {
  const d = deps({
    primary: (s) => ({ text: `primary ${wordsFor(1, s)}`, language: "hi" }),
    indic: () => ({
      text: "नमस्ते सब लोग",
      language: "hi",
      metadata: { languageDetected: true },
    }),
  });
  const events = await collect(
    runTranscribeStream(
      {
        audio: frames(signal([3])),
        routing: { engines: { hi: "indic", "*": "primary" } },
      },
      d,
    ),
  );
  const f = finalsOf(events)[0];
  assertEqual(
    f?.engine,
    "indic",
    "the final must name the engine that produced it",
  );
  assertEqual(
    f?.text,
    "नमस्ते सब लोग",
    "the routed engine's text must be used",
  );
  const routed = d.calls.find((c) => c.provider === "indic");
  assertEqual(
    routed?.options.languagePrior,
    "hi",
    "the routed engine must get the language as a prior",
  );
});

await test("routing.engines: a routed engine that hears nothing keeps the original text", async () => {
  const d = deps({
    primary: (s) => ({ text: `kept ${wordsFor(1, s)}`, language: "ta" }),
    indic: () => ({ text: "" }),
  });
  const events = await collect(
    runTranscribeStream(
      { audio: frames(signal([3])), routing: { engines: { ta: "indic" } } },
      d,
    ),
  );
  assertEqual(
    finalsOf(events)[0]?.engine,
    "primary",
    "the original engine must stay",
  );
  assert(
    d.calls.some((c) => c.provider === "indic"),
    "precondition: the route was tried",
  );
});

await test('correction.secondOpinion "auto" runs the fallback engine as the second opinion', async () => {
  const d = deps({
    primary: (s) => ({
      text: `primary ${wordsFor(1, s)}`,
      metadata: { languageDetected: true },
    }),
    spark: (s) => ({ text: `spark ${wordsFor(1, s)}` }),
  });
  await collect(
    runTranscribeStream(
      {
        audio: frames(signal([3])),
        fallback: { provider: "spark" },
        routing: { probe: false },
        correction: { rewrite: false, secondOpinion: "auto" },
        dictionary: [{ term: "Zed" }],
      },
      d,
    ),
  );
  assert(
    d.calls.some((c) => c.provider === "spark"),
    "the fallback must have read the utterance as a second opinion",
  );
});

await test("correction: the rewrite sees earlier corrected utterances as read-only context", async () => {
  const d = modelDeps(
    {
      primary: (s) => ({
        text: `mera naam ${wordsFor(1, s)} hai`,
        language: "hi",
      }),
    },
    () => ({}),
  );
  await collect(
    runTranscribeStream(
      {
        audio: frames(signal([3, 3, 3])),
        correction: { rewrite: { mode: "always" }, contextUtterances: 3 },
      },
      d,
    ),
  );
  assert(d.rewrites.length >= 3, "precondition: every utterance was rewritten");
  assert(
    !d.rewrites[0]?.user.includes("Earlier in this conversation"),
    "the first utterance has no context",
  );
  assert(
    d.rewrites[2]?.user.includes("Earlier in this conversation") === true,
    "later utterances must carry context",
  );
});

await test("correction: a rewrite that joins both readings or copies earlier context is rejected; the transcript is kept", async () => {
  const d = modelDeps(
    {
      primary: (s) => ({
        text: `please send the report today ${wordsFor(1, s)}`,
        language: "en",
      }),
    },
    () => ({}),
  );
  d.rewrite = async (o) => {
    const line =
      o.user.split("\n").find((l) => l.startsWith("Transcript")) ?? "";
    const said = line.replace(/^Transcript[^:]*:\s*/u, "");
    return `${said} ${said}`;
  };
  const events = await collect(
    runTranscribeStream(
      {
        audio: frames(signal([3])),
        correction: { rewrite: { mode: "always" } },
      },
      d,
    ),
  );
  const corrected = events.find((e) => e.type === "corrected");
  const final = finalsOf(events)[0];
  assert(
    corrected?.type === "corrected",
    "precondition: the utterance was corrected",
  );
  assert(
    corrected?.type === "corrected" && corrected.text === final?.text,
    "a doubled rewrite must be discarded and the engine text kept",
  );
  assert(
    corrected?.type === "corrected" &&
      corrected.steps.some((st) => st.includes("added words")),
    "the steps must say why the rewrite was refused",
  );
});

await test("correction: a known language outside India keeps its script and gets the general prompt", async () => {
  const d = modelDeps(
    { primary: () => ({ text: "今日は会議があります", language: "ja" }) },
    () => ({}),
  );
  const events = await collect(
    runTranscribeStream({ audio: frames(signal([3])), correction: {} }, d),
  );
  const corrected = events.find((e) => e.type === "corrected");
  assert(
    corrected?.type === "corrected" &&
      corrected.steps.some((st) => st.startsWith("rewrite skipped")),
    "Japanese text must not be romanized by default",
  );
  const d2 = modelDeps(
    {
      primary: () => ({
        text: "esto es una prueba del sistema",
        language: "es",
      }),
    },
    () => ({}),
  );
  await collect(
    runTranscribeStream(
      {
        audio: frames(signal([3])),
        correction: { rewrite: { mode: "always" } },
      },
      d2,
    ),
  );
  assert(
    (d2.rewrites[0]?.system ?? "").includes("Spanish") &&
      !(d2.rewrites[0]?.system ?? "").includes("Indian language"),
    "a Spanish utterance must get the Spanish prompt",
  );
});

await test("streaming.normalize: a quiet utterance reaches the engine at speech level; off leaves it as is", async () => {
  const quiet = signal([3]).map((v) => v * 0.06);
  const levelOf = (wav: Buffer): number => {
    let sum = 0;
    const n = (wav.length - 44) / 2;
    for (let i = 0; i < n; i++) {
      const v = wav.readInt16LE(44 + i * 2) / 32768;
      sum += v * v;
    }
    return Math.sqrt(sum / Math.max(1, n));
  };
  const heard: number[] = [];
  const make = (): TranscribeDeps => {
    const d = deps({ primary: () => ({ text: "quiet words here" }) });
    const inner = d.transcribe;
    d.transcribe = async (audio, provider, options) => {
      heard.push(levelOf(audio));
      return inner(audio, provider, options);
    };
    return d;
  };
  await collect(
    runTranscribeStream(
      { audio: frames(quiet), streaming: { onsetRms: 0.003 } },
      make(),
    ),
  );
  const on = Math.max(...heard);
  heard.length = 0;
  await collect(
    runTranscribeStream(
      {
        audio: frames(quiet),
        streaming: { onsetRms: 0.003, normalize: false },
      },
      make(),
    ),
  );
  const off = Math.max(...heard);
  assert(
    Number.isFinite(on) && Number.isFinite(off),
    "precondition: the engine was called both times",
  );
  assert(
    on > off * 2,
    "normalized audio must be markedly louder than the raw quiet audio",
  );
});

await test("sessions: speakers without a name get distinct names instead of colliding", async () => {
  const d = modelDeps(
    { primary: (s) => ({ text: `hello ${wordsFor(1, s)}`, language: "en" }) },
    () => ({}),
  );
  const session = new TranscriptionSession({
    transcribeStream: (o: TranscribeStreamOptions) => runTranscribeStream(o, d),
  } as unknown as ConstructorParameters<typeof TranscriptionSession>[0]);
  const seen: TranscriptionSessionEvent[] = [];
  session.subscribe({}, (e) => seen.push(e));
  await Promise.all([
    session.addSpeaker("", { audio: frames(signal([2])) }),
    session.addSpeaker("  ", { audio: frames(signal([2])) }),
  ]);
  const names = new Set(
    seen.filter((e) => e.type === "final").map((e) => e.speaker),
  );
  assertEqual(
    names.size,
    2,
    "two unnamed speakers must both be transcribed under their own names",
  );
});

await test("sessions: each utterance renders once into the union of listeners' languages; listeners get only theirs", async () => {
  const d = modelDeps(
    {
      primary: (s) => ({
        text: `agenda item ${wordsFor(1, s)}`,
        language: "en",
      }),
    },
    (keys, lines) =>
      Object.fromEntries(
        keys.map((k) => [k, Array.from({ length: lines }, () => `${k}-text`)]),
      ),
  );
  const session = new TranscriptionSession({
    transcribeStream: (o: TranscribeStreamOptions) => runTranscribeStream(o, d),
  } as unknown as ConstructorParameters<typeof TranscriptionSession>[0]);
  const a: TranscriptionSessionEvent[] = [];
  const b: TranscriptionSessionEvent[] = [];
  const c: TranscriptionSessionEvent[] = [];
  session.subscribe({ languages: ["es"] }, (e) => a.push(e));
  session.subscribe({ languages: ["es"] }, (e) => b.push(e));
  session.subscribe({ languages: ["fr"], interim: false }, (e) => c.push(e));
  await session.addSpeaker("alice", { audio: frames(signal([3, 3])) });
  const utterances = finalsOf(a).length;
  assertEqual(
    utterances,
    2,
    "precondition: two utterances reached every listener",
  );
  assertEqual(
    d.renders.length,
    utterances,
    "one render per utterance, however many listeners",
  );
  assert(
    d.renders.every((r) => r.keys.length === 2),
    "each render covers es and fr once",
  );
  assert(
    outputsOf(a).every((o) => o.language === "es") && outputsOf(a).length === 2,
    "listener a gets only es",
  );
  assert(
    outputsOf(c).every((o) => o.language === "fr") && outputsOf(c).length === 2,
    "listener c gets only fr",
  );
  assert(
    c.every((e) => e.type !== "interim"),
    "interim: false must drop interim captions",
  );
  assert(
    a.every((e) => e.speaker === "alice"),
    "events must name their speaker",
  );
  const late: TranscriptionSessionEvent[] = [];
  session.subscribe({ languages: ["fr"] }, (e) => late.push(e));
  assertEqual(
    finalsOf(late).length,
    2,
    "a late listener must get the backlog finals",
  );
  assertEqual(
    outputsOf(late).length,
    2,
    "and the renderings already made in its language",
  );
  assertEqual(
    b.length,
    a.length,
    "two listeners on the same language see the same events",
  );
});

await test("batch: outputs render per segment and corrected words keep timings", async () => {
  const d = modelDeps(
    {
      primary: () => ({
        text: "first line here second line here",
        language: "en",
        words: [
          { word: "first", start: 0, end: 0.4 },
          { word: "line", start: 0.4, end: 0.8 },
          { word: "here", start: 0.8, end: 1.2 },
        ],
        segments: [
          {
            index: 0,
            text: "first line here",
            start: 0,
            end: 1.2,
            isFinal: true,
          },
          {
            index: 1,
            text: "second line here",
            start: 1.2,
            end: 2.4,
            isFinal: true,
          },
        ],
      }),
    },
    (keys, lines) =>
      Object.fromEntries(
        keys.map((k) => [
          k,
          Array.from({ length: lines }, (_, i) => `linea ${i + 1}`),
        ]),
      ),
  );
  const wav = createWavFile(Buffer.alloc(16000 * 2), 16000, 1, 16);
  const result = await runTranscribe(
    { audio: wav, format: "wav", output: { languages: ["es"] } },
    d,
  );
  const es = result.outputs?.es;
  assertEqual(es?.status, "ok", "the rendering must succeed");
  assertEqual(es?.segments?.length, 2, "one rendered line per segment");
  assertEqual(
    es?.text,
    "linea 1 linea 2",
    "the text joins the rendered segments",
  );
  assertEqual(d.renders.length, 1, "both segments go in one call");
  assert(
    typeof result.timings.outputMs === "number",
    "the rendering time must be reported",
  );
});

await test("outputs: tags are case-insensitive (ES, Fr-CA render like es, fr-CA)", async () => {
  const d = modelDeps(
    {
      primary: () => ({
        text: "see you tomorrow at the office",
        language: "en",
      }),
    },
    (keys, lines) =>
      Object.fromEntries(
        keys.map((k) => [
          k,
          Array.from({ length: lines }, () =>
            k.toLowerCase().startsWith("es")
              ? "nos vemos mañana"
              : "à demain au bureau",
          ),
        ]),
      ),
  );
  const events = await collect(
    runTranscribeStream(
      { audio: frames(signal([3])), output: { languages: ["ES", "Fr-CA"] } },
      d,
    ),
  );
  const outs = outputsOf(events);
  assert(
    outs.length === 2 && outs.every((o) => o.status === "ok"),
    "upper-case tags must render, not fail as invalid",
  );
});

await runSuite();
