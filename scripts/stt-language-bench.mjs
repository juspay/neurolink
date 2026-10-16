#!/usr/bin/env node
/**
 * Language-handling benchmark for the `transcribe` inference type (live).
 *
 * Streams clips into a running `neurolink serve` and reports, per clip and
 * configuration: how long non-Latin text was on screen before the first
 * Latin caption (the "wrong script" exposure for English spoken into an
 * Indic engine), when the final and the corrected sentence arrived, which
 * engines answered, and that no words were lost between the final and the
 * corrected text. Batch rows report the language probe and total time.
 *
 *   NEUROLINK_URL=http://127.0.0.1:8788 STT_BENCH_CLIPS=./clips \
 *   STT_BENCH_PRIMARY=indic STT_BENCH_FALLBACK=spark node scripts/stt-language-bench.mjs
 *
 * `clips/` holds 16 kHz mono PCM16 WAVs. Every clip is run with the probe off
 * and on; a clip whose name starts with "en" is expected to end on the
 * fallback, one starting with an Indic language code on the primary.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import WebSocket from "ws";

const BASE = process.env.NEUROLINK_URL ?? "http://127.0.0.1:8788";
const WS = BASE.replace(/^http/, "ws") + "/v1/audio/transcriptions/stream";
const DIR = process.env.STT_BENCH_CLIPS ?? "./clips";
const PRIMARY = process.env.STT_BENCH_PRIMARY ?? "indic";
const FALLBACK = process.env.STT_BENCH_FALLBACK ?? "spark";
const NON_LATIN = /[ऀ-෿]/u;

function pcmOf(wav) {
  const i = wav.indexOf("data");
  return i >= 0 ? wav.subarray(i + 8) : wav;
}

function stream(clip, config) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const ws = new WebSocket(WS);
    let firstLatin = null;
    let wrongMs = 0;
    let wrongSince = null;
    const engines = new Set();
    const finals = [];
    const corrected = [];
    const guards = { loops: 0, echoes: 0, silences: 0 };
    ws.on("message", (m) => {
      let e;
      try {
        e = JSON.parse(m.toString());
      } catch {
        return; // not an event frame
      }
      const now = Date.now();
      const words = (t) => (typeof t === "string" ? t.split(/\s+/).filter(Boolean).length : 0);
      if (e.type === "interim") {
        engines.add(e.engine);
        if (NON_LATIN.test(e.text ?? "")) {
          wrongSince ??= now;
        } else {
          if (wrongSince !== null) {
            wrongMs += now - wrongSince;
            wrongSince = null;
          }
          firstLatin ??= now - t0;
        }
      }
      if (e.type === "final") {
        if (wrongSince !== null) {
          wrongMs += now - wrongSince;
          wrongSince = null;
        }
        finals.push({ engine: e.engine, words: words(e.text), at: now - t0, vad: e.vad, speech: e.speechSeconds });
      }
      if (e.type === "corrected") {
        const steps = Array.isArray(e.steps) ? e.steps : [];
        corrected.push({ words: words(e.text), at: now - t0, steps });
        for (const st of steps) {
          if (st.startsWith("repetition collapsed")) {
            guards.loops++;
          }
          if (st === "prompt echo discarded") {
            guards.echoes++;
          }
        }
      }
      if (e.type === "silence") {
        guards.silences++;
      }
    });
    ws.on("close", () => resolve({ firstLatin, wrongMs, engines: [...engines], finals, corrected, guards, total: Date.now() - t0 }));
    ws.on("error", (err) => resolve({ error: err.message }));
    ws.on("open", async () => {
      ws.send(JSON.stringify(config));
      const pcm = pcmOf(readFileSync(join(DIR, clip)));
      for (let i = 0; i < pcm.length; i += 3200) {
        ws.send(pcm.subarray(i, i + 3200));
        await new Promise((r) => setTimeout(r, 100));
      }
      ws.send(JSON.stringify({ type: "end" }));
    });
  });
}

async function batch(clip, config) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/agent/transcribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ audio: readFileSync(join(DIR, clip)).toString("base64"), format: "wav", ...config }),
  });
  // The route takes plain base64 as well as a data: URL.
  let body;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  if (!res.ok || !body) {
    const reason = body?.error?.message ?? `HTTP ${res.status}`;
    return { ms: Date.now() - t0, error: `${clip}: ${reason}`, steps: [] };
  }
  const d = body.data ?? {};
  return { ms: Date.now() - t0, engine: d.engine?.provider, words: (d.text ?? "").split(/\s+/).filter(Boolean).length, steps: d.steps ?? [] };
}

const clips = readdirSync(DIR).filter((f) => f.endsWith(".wav")).sort();
if (clips.length === 0) {
  console.error(`no .wav clips in ${DIR}`);
  process.exit(1);
}
console.log(`clip                     probe  first-latin  wrong-script  engines          final@   corrected@  words final→corrected  verdict`);
let bad = 0;
for (const clip of clips) {
  for (const probe of [false, true]) {
    const r = await stream(clip, { provider: PRIMARY, fallback: { provider: FALLBACK }, routing: { probe }, correction: { enabled: true } });
    if (r.error) {
      console.log(`${clip.padEnd(24)} ${String(probe).padEnd(6)} ERROR ${r.error}`);
      bad++;
      continue;
    }
    const f = r.finals[0];
    const c = r.corrected[0];
    const lost = f && c ? c.words < Math.ceil(f.words * 0.75) : false;
    const expectFallback = /^en/i.test(clip);
    const ok = f && (expectFallback ? f.engine === FALLBACK : f.engine === PRIMARY) && !lost;
    const guardNote =
      (f?.vad ? ` vad=${f.vad}${typeof f.speech === "number" ? ` speech=${f.speech.toFixed(1)}s` : ""}` : "") +
      (r.guards.loops || r.guards.echoes || r.guards.silences ? ` guards: loops=${r.guards.loops} echoes=${r.guards.echoes} silence=${r.guards.silences}` : "");
    if (!ok) {
      bad++;
    }
    console.log(
      `${clip.padEnd(24)} ${String(probe).padEnd(6)} ${String(r.firstLatin ?? "-").padStart(8)} ms ${String(r.wrongMs).padStart(9)} ms  ${r.engines.join(",").padEnd(16)} ${String(f?.at ?? "-").padStart(6)}   ${String(c?.at ?? "-").padStart(8)}  ${String(f?.words ?? "-").padStart(5)}→${String(c?.words ?? "-").padEnd(5)}  ${ok ? "ok" : lost ? "WORDS LOST" : "wrong engine"}${guardNote}`,
    );
  }
  const b = await batch(clip, { provider: PRIMARY, fallback: { provider: FALLBACK }, correction: { rewrite: false } }).catch(
    (err) => ({ ms: 0, error: `${clip}: ${err.message}`, steps: [] }),
  );
  if (b.error) {
    console.log(`${"".padEnd(24)} batch  ERROR ${b.error}`);
    bad++;
    continue;
  }
  console.log(`${"".padEnd(24)} batch  ${String(b.ms).padStart(8)} ms total  engine=${b.engine}  words=${b.words}  ${b.steps.filter((s) => s.startsWith("language probe") || s.startsWith("fallback")).join(" · ")}`);
}
console.log(bad ? `\n${bad} run(s) off expectation` : "\nall runs as expected");
process.exit(bad ? 1 : 0);
