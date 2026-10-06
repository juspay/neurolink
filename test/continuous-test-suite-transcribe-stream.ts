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
import { chunkedTranscribeStream } from "../src/lib/voice/streaming/chunkedStreamAdapter.js";
import { runTranscribeStream } from "../src/lib/voice/transcribeStream.js";
import type {
  STTChunkedPassOptions,
  STTHandler,
  STTOptions,
  STTResult,
  TranscribeDeps,
  TranscribeStreamEvent,
  TranscriptionSegment,
} from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Transcribe stream (chunked adapter)", {
  offline: true,
});

const RATE = 16000;

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

type Pass = STTChunkedPassOptions & { samples: number };

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
      const pass = { ...options, samples: pcm.length };
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

await test("language takeover: two unsure passes after 3 s hand the utterance to the fallback for good", async () => {
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

await test("language takeover: one confident primary pass rules it out, and a short utterance never switches", async () => {
  // First pass confident, every later pass unsure: the confident pass wins.
  const flaky = scripted((p) => ({
    text: wordsFor(p.utterance, p.seconds),
    language: "en",
    metadata: { languageDetected: p.seconds < 1.5 },
  }));
  const flakyEvents = await collect(
    chunkedTranscribeStream(frames(signal([6])), flaky.run, {
      fallback: { label: "fallback-engine" },
    }),
  );
  assert(
    flaky.passes.some((p) => p.seconds < 1.5) &&
      flaky.passes.some((p) => p.seconds >= 3),
    "precondition: passes must run both before 1.5 s and after 3 s",
  );
  assert(
    flaky.passes.every((p) => p.engine === "primary"),
    "a confident pass on the utterance must rule the takeover out",
  );
  assert(
    finalsOf(flakyEvents)[0]?.fallbackUsed === undefined,
    "the final must not be marked fallbackUsed",
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
      (p) => Math.abs(p.samples - Math.floor(p.seconds * 16000)) <= 16,
    ),
    "every pass must receive the utterance at 16 kHz",
  );
  assert(
    (finals[0]?.seconds ?? 0) > 3 && (finals[0]?.seconds ?? 0) < 5,
    "utterance seconds must be measured at the input rate",
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

await runSuite();
