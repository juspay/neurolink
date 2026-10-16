/**
 * Endpointer for client-side streaming of batch STT engines.
 *
 * Pure and synchronous: feed it float samples at any input rate, get back
 * utterance start / end / drop events. It knows nothing about engines; the
 * chunked adapter decides what to transcribe and when.
 *
 * Two ways to tell speech from not-speech, same utterance rules either way:
 *
 * - **A speech detector** (`attachSpeech`): the adapter scores the stream
 *   with a model (Silero VAD by default) and the endpointer reads the
 *   probability of each 20 ms block. An utterance opens after `startMs` of
 *   consecutive blocks at or above `onset` (the pre-roll keeps that audio,
 *   so nothing is clipped) and a block counts as speech while at or above
 *   `sustain`. A chair, a keyboard or a far-away TV scores near zero and
 *   never opens one.
 * - **The energy gate**, the fallback when no detector is attached. Its
 *   rules and constants were measured on live microphones and on a 45 s
 *   three-speaker meeting slice, where they recover 155 of the 156 words a
 *   batch transcription of the whole file finds (a plain fixed-threshold
 *   gate recovered 125):
 *   - The noise floor is a minimum statistic — the quietest block of the
 *     last 1.5 s — allowed to rise by at most ~2× per second and never below
 *     0.0005. Because it follows the quietest block, a loud talker can never
 *     raise it enough to push a quieter second speaker below the gate.
 *   - Hysteresis: speech starts above `max(onsetRms, floor × 3)` and is
 *     sustained above `max(onsetRms × 0.58, floor × 1.8)`, so soft word
 *     endings are kept inside the utterance instead of counting as silence.
 *
 * Shared rules:
 *
 * - Work on 20 ms blocks.
 * - `prerollMs` of audio before the onset is kept, so the first consonant is
 *   not clipped.
 * - An utterance ends after `endSilenceMs` without sustained speech. One with
 *   less than `minSpeechMs` of speech is a cough and is dropped — unless a
 *   pass already heard words in it, which must never be lost.
 * - A long turn (`softCutSeconds`) ends at the next ≥ 320 ms gap; a turn with
 *   no gap at all is hard-cut at `maxUtteranceSeconds` at the least speech-like
 *   block of the last 3 s, and the remainder becomes the start of the next
 *   utterance, so no audio falls between the two.
 *
 * @module voice/streaming/endpointer
 */
import type {
  STTEndpointerConfig,
  STTEndpointerEvent,
  STTEndpointerPreBlock,
  STTEndpointerSpeechConfig,
  STTEndpointerUtterance,
  STTStreamingOptions,
} from "../../types/index.js";

/** Sample rate every engine pass receives. */
export const ENGINE_SAMPLE_RATE = 16000;

const BLOCK_SECONDS = 0.02;
const BLOCK_MS = BLOCK_SECONDS * 1000;
/** Noise-floor window: 75 blocks = 1.5 s. */
const NOISE_WINDOW_BLOCKS = 75;
/** Per-block rise limit of the floor: 1.014^50 ≈ 2× per second. */
const NOISE_RISE_PER_BLOCK = 1.014;
const NOISE_FLOOR_MIN = 0.0005;
/** Starting floor, before the window has seen any quiet block. */
const NOISE_FLOOR_INITIAL = 0.004;
const ONSET_RATIO = 3;
const SUSTAIN_RATIO = 1.8;
const ABS_SUSTAIN_RATIO = 0.58;
/** A pause this long ends a turn that is already past `softCutSeconds`. */
const SOFT_GAP_MS = 320;
/** The hard cut looks for the least speech-like block in this many trailing seconds. */
const HARD_CUT_SEARCH_SECONDS = 3;

/** Defaults of `STTStreamingOptions` that the endpointer reads. */
export const ENDPOINTER_DEFAULTS = {
  endSilenceMs: 750,
  softCutSeconds: 16,
  maxUtteranceSeconds: 28,
  onsetRms: 0.006,
  prerollMs: 350,
  minSpeechMs: 250,
} as const;

/** Applies the defaults to caller tuning; non-finite or non-positive values fall back. */
export function resolveEndpointerConfig(
  options: STTStreamingOptions | undefined,
  inputRate: number,
): STTEndpointerConfig {
  const pick = (value: number | undefined, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? value
      : fallback;
  const d = ENDPOINTER_DEFAULTS;
  return {
    inputRate: pick(inputRate, ENGINE_SAMPLE_RATE),
    endSilenceMs: pick(options?.endSilenceMs, d.endSilenceMs),
    softCutSeconds: pick(options?.softCutSeconds, d.softCutSeconds),
    maxUtteranceSeconds: pick(
      options?.maxUtteranceSeconds,
      d.maxUtteranceSeconds,
    ),
    onsetRms: pick(options?.onsetRms, d.onsetRms),
    prerollMs: pick(options?.prerollMs, d.prerollMs),
    minSpeechMs: pick(options?.minSpeechMs, d.minSpeechMs),
  };
}

export function rmsOf(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

/** Linear-interpolation resampler to 16 kHz; returns the input untouched when it already is. */
export function resampleTo16k(
  samples: Float32Array,
  inputRate: number,
): Float32Array {
  if (inputRate === ENGINE_SAMPLE_RATE) {
    return samples;
  }
  const ratio = inputRate / ENGINE_SAMPLE_RATE;
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    out[i] = samples[i0] + (samples[i1] - samples[i0]) * (pos - i0);
  }
  return out;
}

export class Endpointer {
  readonly config: STTEndpointerConfig;
  private speech: STTEndpointerSpeechConfig | null = null;
  /** Milliseconds of consecutive blocks at or above the detector's onset threshold. */
  private onsetRun = 0;
  private readonly blockLen: number;
  private block: Float32Array;
  private blockFill = 0;
  private noise = NOISE_FLOOR_INITIAL;
  private readonly noiseWin: number[] = [];
  private pre: STTEndpointerPreBlock[] = [];
  private preLen = 0;
  private utt: STTEndpointerUtterance | null = null;
  private seq = 0;
  /** Input samples that went through the gate so far: the audio clock, in whole blocks. */
  private consumed = 0;

  constructor(config: STTEndpointerConfig) {
    this.config = config;
    this.blockLen = Math.max(1, Math.round(BLOCK_SECONDS * config.inputRate));
    this.block = new Float32Array(this.blockLen);
  }

  /** The utterance being built, if speech is in progress. */
  get current(): STTEndpointerUtterance | null {
    return this.utt;
  }

  /** Seconds of input consumed so far. */
  get audioSeconds(): number {
    return this.consumed / this.config.inputRate;
  }

  /** Whether a speech detector decides, rather than the energy gate. */
  get speechAttached(): boolean {
    return this.speech !== null;
  }

  /**
   * Reads a speech detector's verdicts from here on (`null` goes back to the
   * energy gate, which an open utterance then finishes under).
   */
  attachSpeech(speech: STTEndpointerSpeechConfig | null): void {
    this.speech = speech;
    this.onsetRun = 0;
    if (!speech && this.utt) {
      this.utt.speech = undefined;
    }
  }

  /** Feeds samples at the input rate; returns the events they caused, in order. */
  push(samples: Float32Array): STTEndpointerEvent[] {
    const events: STTEndpointerEvent[] = [];
    let i = 0;
    while (i < samples.length) {
      const n = Math.min(samples.length - i, this.blockLen - this.blockFill);
      this.block.set(samples.subarray(i, i + n), this.blockFill);
      this.blockFill += n;
      i += n;
      if (this.blockFill === this.blockLen) {
        this.onBlock(this.block, events);
        this.block = new Float32Array(this.blockLen);
        this.blockFill = 0;
      }
    }
    return events;
  }

  /**
   * Ends the stream: a partial block is folded into the open utterance, which
   * is then ended (`flush`) — or dropped when it is a cough nobody heard.
   */
  flush(): STTEndpointerEvent[] {
    const events: STTEndpointerEvent[] = [];
    const u = this.utt;
    if (u && this.blockFill > 0) {
      const tail = this.block.slice(0, this.blockFill);
      u.blocks.push(tail);
      u.rms.push(rmsOf(tail));
      u.speech?.push(u.speech[u.speech.length - 1] ?? 0);
      u.length += tail.length;
    }
    this.consumed += this.blockFill;
    this.blockFill = 0;
    if (u) {
      this.utt = null;
      events.push(
        u.speechMs >= this.config.minSpeechMs || u.heard
          ? { type: "end", utterance: u, reason: "flush" }
          : { type: "drop", utterance: u },
      );
    }
    this.pre = [];
    this.preLen = 0;
    return events;
  }

  /**
   * The utterance's audio at 16 kHz. With `trimTailMs` and a detector
   * attached, silence after the last speech block beyond that margin is left
   * out, so an engine never decodes the closing pause (where a batch model
   * invents its endings); the utterance itself keeps its full span. `padMs`
   * of digital silence is appended after everything else: a chunk cut off
   * right after speech can send a batch model into a decoding loop until its
   * timeout (measured on Qwen3-ASR: 200 ms of zeros was enough to stop it).
   */
  pcm16k(
    u: STTEndpointerUtterance,
    options?: { trimTailMs?: number; padMs?: number },
  ): Float32Array {
    let blocks = u.blocks;
    const sp = this.speech;
    if (options?.trimTailMs !== undefined && u.speech && sp) {
      let last = -1;
      for (let k = u.speech.length - 1; k >= 0; k--) {
        if (u.speech[k] >= sp.sustain) {
          last = k;
          break;
        }
      }
      if (last >= 0) {
        const keep = Math.min(
          blocks.length,
          last + 1 + Math.ceil(options.trimTailMs / BLOCK_MS),
        );
        blocks = blocks.slice(0, keep);
      }
    }
    const length = blocks.reduce((a, b) => a + b.length, 0);
    const out = new Float32Array(length);
    let o = 0;
    for (const b of blocks) {
      out.set(b, o);
      o += b.length;
    }
    const pcm = resampleTo16k(out, this.config.inputRate);
    const pad = options?.padMs
      ? Math.round((options.padMs / 1000) * ENGINE_SAMPLE_RATE)
      : 0;
    if (pad <= 0) {
      return pcm;
    }
    const padded = new Float32Array(pcm.length + pad);
    padded.set(pcm, 0);
    return padded;
  }

  private sustainThreshold(): number {
    return Math.max(
      this.config.onsetRms * ABS_SUSTAIN_RATIO,
      this.noise * SUSTAIN_RATIO,
    );
  }

  private newUtterance(pre: STTEndpointerPreBlock[]): STTEndpointerUtterance {
    const blocks = pre.map((p) => p.block);
    const length = blocks.reduce((a, b) => a + b.length, 0);
    return {
      id: ++this.seq,
      // Called once the newest block is counted, so the utterance ends at the clock.
      startSeconds: (this.consumed - length) / this.config.inputRate,
      blocks,
      rms: pre.map((p) => p.rms),
      ...(this.speech ? { speech: pre.map((p) => p.speech) } : {}),
      length,
      speechMs: 0,
      silenceMs: 0,
      heard: false,
    };
  }

  private onBlock(block: Float32Array, events: STTEndpointerEvent[]): void {
    const cfg = this.config;
    const rms = rmsOf(block);
    this.consumed += block.length;

    // Minimum statistic over the window; a drop is followed at once, a rise is rate-limited.
    this.noiseWin.push(rms);
    if (this.noiseWin.length > NOISE_WINDOW_BLOCKS) {
      this.noiseWin.shift();
    }
    let winMin = Infinity;
    for (const v of this.noiseWin) {
      if (v < winMin) {
        winMin = v;
      }
    }
    this.noise = Math.max(
      NOISE_FLOOR_MIN,
      winMin > this.noise
        ? Math.min(winMin, this.noise * NOISE_RISE_PER_BLOCK)
        : winMin,
    );

    const sp = this.speech;
    // The detector's verdict for the middle of this block; before the first
    // scored frame nothing is speech, so a stray block cannot open anything.
    const p = sp
      ? (sp.probabilityAt((this.consumed - block.length / 2) / cfg.inputRate) ??
        0)
      : 0;
    let onset: boolean;
    let sustain: boolean;
    if (sp) {
      sustain = p >= sp.sustain;
      // The confirmation run only matters while nothing is open, and it is
      // reset at every onset, so a long turn never inflates the next utterance.
      this.onsetRun = !this.utt && p >= sp.onset ? this.onsetRun + BLOCK_MS : 0;
      onset = p >= sp.onset && this.onsetRun >= sp.startMs;
    } else {
      onset = rms > Math.max(cfg.onsetRms, this.noise * ONSET_RATIO);
      sustain = rms > this.sustainThreshold();
    }

    const u = this.utt;
    if (!u) {
      this.pre.push({ block, rms, speech: p });
      this.preLen += block.length;
      // The pre-roll must hold the onset confirmation, or it would be clipped.
      const maxPre =
        (Math.max(cfg.prerollMs, sp ? sp.startMs + 2 * BLOCK_MS : 0) / 1000) *
        cfg.inputRate;
      while (this.preLen > maxPre && this.pre.length > 1) {
        const dropped = this.pre.shift();
        this.preLen -= dropped ? dropped.block.length : 0;
      }
      if (onset) {
        const started = this.newUtterance(this.pre);
        started.speechMs = sp ? Math.max(BLOCK_MS, this.onsetRun) : BLOCK_MS;
        this.onsetRun = 0;
        this.utt = started;
        this.pre = [];
        this.preLen = 0;
        events.push({ type: "start", utterance: started });
      }
      return;
    }

    u.blocks.push(block);
    u.rms.push(rms);
    u.speech?.push(p);
    u.length += block.length;
    if (sustain) {
      u.speechMs += BLOCK_MS;
      u.silenceMs = 0;
    } else {
      u.silenceMs += BLOCK_MS;
    }

    if (u.silenceMs >= cfg.endSilenceMs) {
      this.utt = null;
      events.push(
        u.speechMs >= cfg.minSpeechMs || u.heard
          ? { type: "end", utterance: u, reason: "silence" }
          : { type: "drop", utterance: u },
      );
    } else if (
      u.length >= cfg.softCutSeconds * cfg.inputRate &&
      u.silenceMs >= SOFT_GAP_MS
    ) {
      this.utt = null;
      events.push({ type: "end", utterance: u, reason: "softCut" });
    } else if (u.length >= cfg.maxUtteranceSeconds * cfg.inputRate) {
      this.hardCut(u, events);
    }
  }

  private hardCut(
    u: STTEndpointerUtterance,
    events: STTEndpointerEvent[],
  ): void {
    const n = u.blocks.length;
    const from = Math.max(
      1,
      n - Math.round(HARD_CUT_SEARCH_SECONDS / BLOCK_SECONDS),
    );
    // The least speech-like block: lowest detector probability (quietest on a tie), else quietest.
    const lessSpeech = (k: number, best: number): boolean => {
      const sp = u.speech;
      if (sp) {
        return (
          sp[k] < sp[best] || (sp[k] === sp[best] && u.rms[k] < u.rms[best])
        );
      }
      return u.rms[k] < u.rms[best];
    };
    let best = from;
    for (let k = from; k < n; k++) {
      if (lessSpeech(k, best)) {
        best = k;
      }
    }
    const rest: STTEndpointerPreBlock[] = u.blocks
      .splice(best)
      .map((block, i) => ({
        block,
        rms: u.rms[best + i],
        speech: u.speech?.[best + i] ?? 0,
      }));
    u.rms.splice(best);
    u.speech?.splice(best);
    u.length = u.blocks.reduce((a, b) => a + b.length, 0);
    const next = this.newUtterance(rest);
    const sp = this.speech;
    const threshold = this.sustainThreshold();
    next.speechMs =
      rest.filter((r) => (sp ? r.speech >= sp.sustain : r.rms > threshold))
        .length * BLOCK_MS;
    // The moved blocks' speech now belongs to the next utterance, not this one.
    u.speechMs = Math.max(0, u.speechMs - next.speechMs);
    this.utt = next;
    events.push({ type: "end", utterance: u, reason: "hardCut" });
    events.push({ type: "start", utterance: next });
  }
}
