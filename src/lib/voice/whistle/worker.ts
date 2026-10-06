/**
 * Whistle worker thread: owns one instance of the Cactus "needle" WASM engine
 * with the Whistle model loaded, and runs its synchronous calls off the main
 * event loop. Messages are handled one at a time, in arrival order.
 *
 * `needle.js` is an Emscripten CommonJS build. It is evaluated through an
 * explicit CommonJS wrapper rather than `require()`d, because a model
 * directory that sits under a `"type": "module"` package would make Node load
 * it as ESM, where its `module.exports` assignment is lost.
 *
 * Self-contained — node builtins and type-only imports, nothing else — so the
 * thread starts quickly, never initialises the SDK's logger or config, and
 * also runs straight from the TypeScript source under Node's type stripping
 * (which does not map a sibling `./x.js` import onto `./x.ts`).
 *
 * @module voice/whistle/worker
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { runInThisContext } from "node:vm";
import { parentPort, workerData } from "node:worker_threads";
import type {
  WhistleEngineOutput,
  WhistleNeedleFactory,
  WhistleNeedleModule,
  WhistleStreamStep,
  WhistleWord,
  WhistleWorkerData,
  WhistleWorkerRequest,
  WhistleWorkerResponse,
} from "../../types/index.js";

/** The engine's fixed input rate. */
const WHISTLE_SAMPLE_RATE = 16_000;

/** The engine's per-call cap, in seconds. */
const WHISTLE_MAX_CHUNK_SECONDS = 30;

/**
 * Cut long audio at the quietest 20 ms frame near each boundary. Every piece
 * stays under the 30 s cap: targets are 24 s apart with a ±3 s search, and the
 * tail is never longer than 30 s because cutting continues while more than
 * 30 s remain. Returns `[start, end)` sample offsets.
 */
function whistleChunkBounds(pcm: Float32Array): Array<[number, number]> {
  const sr = WHISTLE_SAMPLE_RATE;
  const n = pcm.length;
  const frame = sr / 50;
  const target = 24 * sr;
  const search = 3 * sr;
  const cap = WHISTLE_MAX_CHUNK_SECONDS * sr;
  if (n <= cap) {
    return [[0, n]];
  }
  const frames = Math.floor(n / frame);
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let e = 0;
    for (let i = f * frame; i < (f + 1) * frame; i++) {
      e += pcm[i] * pcm[i];
    }
    energy[f] = e;
  }
  const cuts = [0];
  while (n - cuts[cuts.length - 1] > cap) {
    const t = cuts[cuts.length - 1] + target;
    const lo = Math.floor((t - search) / frame);
    const hi = Math.min(frames, Math.floor((t + search) / frame));
    let best = lo;
    for (let f = lo; f < hi; f++) {
      if (energy[f] < energy[best]) {
        best = f;
      }
    }
    cuts.push(best * frame);
  }
  cuts.push(n);
  const out: Array<[number, number]> = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    out.push([cuts[i], cuts[i + 1]]);
  }
  return out;
}

/** JSON output buffer: text plus word timestamps for one ≤30 s pass. */
const OUT_CAP = 1 << 20;

function post(message: WhistleWorkerResponse): void {
  parentPort?.postMessage(message);
}

function loadFactory(jsPath: string): WhistleNeedleFactory {
  const source = readFileSync(jsPath, "utf8");
  const wrapper: unknown = runInThisContext(
    `(function (exports, require, module, __filename, __dirname) {${source}\n})`,
    { filename: jsPath },
  );
  if (typeof wrapper !== "function") {
    throw new Error("needle.js did not evaluate to a module wrapper");
  }
  const mod: { exports: unknown } = { exports: {} };
  wrapper(mod.exports, createRequire(jsPath), mod, jsPath, dirname(jsPath));
  if (typeof mod.exports !== "function") {
    throw new Error("needle.js did not export createNeedle()");
  }
  return mod.exports as WhistleNeedleFactory;
}

let engine: WhistleNeedleModule | undefined;
let outPtr = 0;

async function boot(data: WhistleWorkerData): Promise<number> {
  const t0 = performance.now();
  const createNeedle = loadFactory(data.paths["needle.js"]);
  const M = await createNeedle({
    wasmBinary: readFileSync(data.paths["needle.wasm"]),
    print: () => undefined,
    printErr: () => undefined,
  });
  const weights = readFileSync(data.paths["whistle.cact"]);
  const ptr = M._malloc(weights.length);
  M.HEAPU8.set(weights, ptr);
  const rc = M._needle_load(ptr, BigInt(weights.length));
  M._free(ptr);
  if (rc < 0) {
    throw new Error(
      `needle_load failed: ${M.UTF8ToString(M._needle_last_error())}`,
    );
  }
  outPtr = M._malloc(OUT_CAP);
  engine = M;
  return Math.round(performance.now() - t0);
}

function cString(M: WhistleNeedleModule, s: string | null): number {
  if (!s) {
    return 0;
  }
  const bytes = Buffer.from(s, "utf8");
  const p = M._malloc(bytes.length + 1);
  M.HEAPU8.set(bytes, p);
  M.HEAPU8[p + bytes.length] = 0;
  return p;
}

function copyIn(M: WhistleNeedleModule, pcm: Float32Array): number {
  const p = M._malloc(Math.max(1, pcm.length) * 4);
  // Re-read HEAPU8 after malloc: memory growth replaces the buffer.
  new Float32Array(M.HEAPU8.buffer, p, pcm.length).set(pcm);
  return p;
}

function readJson(M: WhistleNeedleModule, rc: number): Record<string, unknown> {
  if (rc < 0) {
    throw new Error(
      M.UTF8ToString(M._needle_last_error()) || "needle call failed",
    );
  }
  const parsed: unknown = JSON.parse(M.UTF8ToString(outPtr));
  if (!parsed || typeof parsed !== "object") {
    throw new Error("needle returned a non-object result");
  }
  return parsed as Record<string, unknown>;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function words(v: unknown, offset: number): WhistleWord[] {
  if (!Array.isArray(v)) {
    return [];
  }
  const out: WhistleWord[] = [];
  for (const w of v) {
    if (!w || typeof w !== "object") {
      continue;
    }
    const r = w as Record<string, unknown>;
    if (typeof r.word !== "string") {
      continue;
    }
    out.push({
      word: r.word,
      start: round3((num(r.start) ?? 0) + offset),
      end: round3((num(r.end) ?? 0) + offset),
      probability: num(r.probability) ?? 0,
    });
  }
  return out;
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function transcribe(
  M: WhistleNeedleModule,
  pcm: Float32Array,
  language: string | null,
  keywords: string | null,
  timestamps: boolean,
): WhistleEngineOutput {
  const bounds = whistleChunkBounds(pcm);
  const texts: string[] = [];
  const allWords: WhistleWord[] = [];
  const tps: number[] = [];
  let ttft: number | null = null;
  let detected: string | null = null;
  const kwPtr = cString(M, keywords);
  try {
    for (const [a, b] of bounds) {
      // Once a language is detected, hold it for the remaining chunks.
      const langPtr = cString(M, language ?? detected);
      const pcmPtr = copyIn(M, pcm.subarray(a, b));
      try {
        const r = readJson(
          M,
          M._needle_transcribe(
            pcmPtr,
            b - a,
            langPtr,
            kwPtr,
            timestamps ? 1 : 0,
            outPtr,
            OUT_CAP,
          ),
        );
        const text = typeof r.text === "string" ? r.text.trim() : "";
        if (text) {
          texts.push(text);
        }
        ttft ??= num(r.ttft_ms);
        detected ??= str(r.language);
        const speed = num(r.decode_tps);
        if (speed !== null && speed > 0) {
          tps.push(speed);
        }
        allWords.push(...words(r.words, a / WHISTLE_SAMPLE_RATE));
      } finally {
        M._free(pcmPtr);
        if (langPtr) {
          M._free(langPtr);
        }
      }
    }
  } finally {
    if (kwPtr) {
      M._free(kwPtr);
    }
  }
  return {
    text: texts.join(" "),
    language: detected,
    words: allWords,
    ttftMs: ttft,
    decodeTps: tps.length
      ? Math.round(tps.reduce((x, y) => x + y, 0) / tps.length)
      : null,
    chunks: bounds.length,
  };
}

function toStep(r: Record<string, unknown>): WhistleStreamStep {
  return {
    text: typeof r.text === "string" ? r.text.trim() : "",
    words: words(r.words, 0),
    pending: typeof r.pending === "string" ? r.pending.trim() : "",
    language: str(r.language),
    received: num(r.received) ?? 0,
    passMs: num(r.pass_ms) ?? 0,
  };
}

function handle(M: WhistleNeedleModule, req: WhistleWorkerRequest): void {
  try {
    if (req.op === "transcribe") {
      post({
        kind: "transcribed",
        id: req.id,
        result: transcribe(
          M,
          req.pcm,
          req.language,
          req.keywords,
          req.timestamps,
        ),
      });
      return;
    }
    if (req.op === "streamProcess") {
      const langPtr = cString(M, req.language);
      const kwPtr = cString(M, req.keywords);
      const pcmPtr = copyIn(M, req.pcm);
      try {
        const r = readJson(
          M,
          M._needle_stream_transcribe_process(
            pcmPtr,
            req.pcm.length,
            langPtr,
            kwPtr,
            outPtr,
            OUT_CAP,
          ),
        );
        post({ kind: "streamStep", id: req.id, result: toStep(r) });
      } finally {
        M._free(pcmPtr);
        if (langPtr) {
          M._free(langPtr);
        }
        if (kwPtr) {
          M._free(kwPtr);
        }
      }
      return;
    }
    const r = readJson(M, M._needle_stream_transcribe_stop(outPtr, OUT_CAP));
    post({ kind: "streamStep", id: req.id, result: toStep(r) });
  } catch (error) {
    post({
      kind: "failed",
      id: req.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const queue: WhistleWorkerRequest[] = [];
parentPort?.on("message", (req: WhistleWorkerRequest) => {
  if (engine) {
    handle(engine, req);
  } else {
    queue.push(req);
  }
});

boot(workerData as WhistleWorkerData)
  .then((loadMs) => {
    post({ kind: "ready", loadMs });
    const M = engine;
    if (M) {
      for (const req of queue.splice(0)) {
        handle(M, req);
      }
    }
  })
  .catch((error: unknown) => {
    post({
      kind: "bootError",
      error: error instanceof Error ? error.message : String(error),
    });
  });
