// Web Worker that runs the Cactus "needle" engine (WASM, single-threaded) with the Whistle
// speech model entirely in the browser. Nothing leaves the machine.
//
// Protocol:  main -> worker  { id, pcm: Float32Array (16 kHz mono), language?, keywords?, timestamps? }
//            worker -> main  { id, ok, text, language, words, chunks, ms, ttft_ms, decode_tps }
//                            { ready: true, loadMs }   once, after the model is in memory
importScripts("needle.js");

const SR = 16000;
const OUT_CAP = 1 << 18; // 256 KB JSON buffer for text + word timestamps

let Module, outPtr;

async function boot() {
  const t0 = performance.now();
  Module = await createNeedle({ locateFile: (p) => p }); // needle.wasm sits next to this file
  const resp = await fetch("whistle.cact");
  if (!resp.ok) throw new Error(`whistle.cact: HTTP ${resp.status}`);
  const bytes = new Uint8Array(await resp.arrayBuffer());
  const ptr = Module._malloc(bytes.length);
  Module.HEAPU8.set(bytes, ptr);
  const rc = Module._needle_load(ptr, BigInt(bytes.length));
  Module._free(ptr);
  if (rc < 0)
    throw new Error(
      "needle_load failed: " + Module.UTF8ToString(Module._needle_last_error()),
    );
  outPtr = Module._malloc(OUT_CAP);
  postMessage({
    ready: true,
    loadMs: Math.round(performance.now() - t0),
    modelBytes: bytes.length,
  });
}

const utf8 = new TextEncoder();
function cString(s) {
  if (!s) return 0;
  const bytes = utf8.encode(s);
  const p = Module._malloc(bytes.length + 1);
  Module.HEAPU8.set(bytes, p);
  Module.HEAPU8[p + bytes.length] = 0;
  return p;
}

// Cut long audio at the quietest 20 ms frame near each boundary. Every piece stays under the
// engine's 30 s cap: targets are 24 s apart with a ±3 s search, and the tail is never longer
// than 30 s because cutting continues while more than 30 s remain.
function chunkBounds(pcm) {
  const n = pcm.length,
    FR = SR / 50,
    target = 24 * SR,
    search = 3 * SR,
    cap = 30 * SR;
  if (n <= cap) return [[0, n]];
  const frames = Math.floor(n / FR),
    energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let e = 0;
    for (let i = f * FR; i < (f + 1) * FR; i++) e += pcm[i] * pcm[i];
    energy[f] = e;
  }
  const cuts = [0];
  while (n - cuts[cuts.length - 1] > cap) {
    const t = cuts[cuts.length - 1] + target;
    const lo = Math.floor((t - search) / FR),
      hi = Math.min(frames, Math.floor((t + search) / FR));
    let best = lo;
    for (let f = lo; f < hi; f++) if (energy[f] < energy[best]) best = f;
    cuts.push(best * FR);
  }
  cuts.push(n);
  const out = [];
  for (let i = 0; i + 1 < cuts.length; i++) out.push([cuts[i], cuts[i + 1]]);
  return out;
}

function transcribeChunk(pcm, language, keywords, timestamps) {
  const pcmPtr = Module._malloc(pcm.length * 4);
  new Float32Array(Module.HEAPU8.buffer, pcmPtr, pcm.length).set(pcm);
  const langPtr = cString(language),
    kwPtr = cString(keywords);
  try {
    const rc = Module._needle_transcribe(
      pcmPtr,
      pcm.length,
      langPtr,
      kwPtr,
      timestamps ? 1 : 0,
      outPtr,
      OUT_CAP,
    );
    if (rc < 0)
      throw new Error(
        Module.UTF8ToString(Module._needle_last_error()) ||
          "needle_transcribe failed",
      );
    return JSON.parse(Module.UTF8ToString(outPtr));
  } finally {
    Module._free(pcmPtr);
    if (langPtr) Module._free(langPtr);
    if (kwPtr) Module._free(kwPtr);
  }
}

const queue = [];
let busy = false;
// Requests may arrive before the model is loaded (the page posts the first
// one right after creating the worker). They wait in `queue` until boot()
// resolves — `ready` flips only after `_needle_load` succeeded, so a request
// that lands between "Module exists" and "model loaded" waits too. If boot
// fails, every queued and later request is rejected instead of hanging.
let ready = false;
let bootError = null;
async function pump() {
  if (busy) return;
  if (bootError) {
    while (queue.length) {
      const { id } = queue.shift();
      postMessage({ id, ok: false, error: bootError, ms: 0 });
    }
    return;
  }
  if (!ready) return;
  busy = true;
  while (queue.length) {
    const { id, pcm, language, keywords, timestamps } = queue.shift();
    const t0 = performance.now();
    try {
      const bounds = chunkBounds(pcm);
      const texts = [],
        words = [];
      let ttft = null,
        tps = [],
        lang = null;
      for (const [a, b] of bounds) {
        const r = transcribeChunk(
          pcm.subarray(a, b),
          language,
          keywords,
          timestamps,
        );
        if (r.text) texts.push(r.text.trim());
        if (ttft === null) ttft = r.ttft_ms;
        if (!lang && r.language) lang = r.language;
        if (r.decode_tps) tps.push(r.decode_tps);
        for (const w of r.words || [])
          words.push({
            word: w.word,
            start: w.start + a / SR,
            end: w.end + a / SR,
            probability: w.probability,
          });
      }
      postMessage({
        id,
        ok: true,
        text: texts.join(" "),
        language: lang,
        words,
        chunks: bounds.length,
        ms: Math.round(performance.now() - t0),
        ttft_ms: ttft,
        decode_tps: tps.length
          ? Math.round(tps.reduce((x, y) => x + y, 0) / tps.length)
          : null,
      });
    } catch (e) {
      postMessage({
        id,
        ok: false,
        error: e.message || String(e),
        ms: Math.round(performance.now() - t0),
      });
    }
  }
  busy = false;
}

onmessage = (e) => {
  queue.push(e.data);
  pump();
};
boot()
  .then(() => {
    ready = true;
    pump();
  })
  .catch((e) => {
    bootError = "whistle failed to load: " + (e.message || String(e));
    postMessage({ ready: false, error: e.message || String(e) });
    pump();
  });
