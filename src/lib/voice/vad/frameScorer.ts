/**
 * Runs a speech detector over a stream's samples as they arrive and keeps
 * its verdicts on the stream clock, so the endpointer (which works on 20 ms
 * blocks at the input rate) can ask "was this moment speech?" without
 * knowing the detector's frame size or sample rate. Audio at another rate is
 * resampled to 16 kHz for scoring only; the engine path is untouched.
 *
 * @module voice/vad/frameScorer
 */

import type { STTSpeechDetector } from "../../types/index.js";

/** Verdicts kept: 8192 frames of 32 ms is about 4.4 minutes, far past what any block asks about. */
const RING = 8192;
const RATE = 16000;

/** Linear-interpolation resampler that carries its position across pushes. */
class StreamingResampler {
  private carry = new Float32Array(0);
  /** Position of the next output sample, in input samples, relative to `carry[0]`. */
  private phase = 0;

  constructor(private readonly ratio: number) {}

  push(input: Float32Array): Float32Array {
    const buf = new Float32Array(this.carry.length + input.length);
    buf.set(this.carry, 0);
    buf.set(input, this.carry.length);
    const n = buf.length;
    const out = new Float32Array(Math.ceil(n / this.ratio) + 1);
    let count = 0;
    let pos = this.phase;
    while (Math.floor(pos) + 1 < n) {
      const i0 = Math.floor(pos);
      const f = pos - i0;
      out[count++] = buf[i0] + (buf[i0 + 1] - buf[i0]) * f;
      pos += this.ratio;
    }
    const keepFrom = Math.min(Math.floor(pos), n);
    this.carry = buf.slice(keepFrom);
    this.phase = pos - keepFrom;
    return out.subarray(0, count);
  }
}

export class SpeechFrameScorer {
  private readonly probs = new Float32Array(RING);
  /** Frames scored so far: the detector's clock. */
  private frames = 0;
  private readonly frame: Float32Array;
  private frameFill = 0;
  private readonly resampler: StreamingResampler | null;

  constructor(
    readonly detector: STTSpeechDetector,
    inputRate: number,
  ) {
    this.frame = new Float32Array(detector.frameSamples);
    this.resampler =
      inputRate === RATE ? null : new StreamingResampler(inputRate / RATE);
    detector.reset();
  }

  /** Scores every full frame the samples complete; a partial frame waits for the next push. */
  async push(samples: Float32Array): Promise<void> {
    const pcm = this.resampler ? this.resampler.push(samples) : samples;
    let i = 0;
    while (i < pcm.length) {
      const n = Math.min(pcm.length - i, this.frame.length - this.frameFill);
      this.frame.set(pcm.subarray(i, i + n), this.frameFill);
      this.frameFill += n;
      i += n;
      if (this.frameFill === this.frame.length) {
        const p = await this.detector.score(this.frame);
        this.probs[this.frames % RING] = p;
        this.frames++;
        this.frameFill = 0;
      }
    }
  }

  /**
   * The probability of the frame covering `seconds` on the stream clock; the
   * newest frame when that one is not complete yet (a lag of at most one
   * frame), `undefined` before anything was scored.
   */
  probabilityAt(seconds: number): number | undefined {
    if (this.frames === 0) {
      return undefined;
    }
    let k = Math.floor((seconds * RATE) / this.frame.length);
    k = Math.min(Math.max(0, k), this.frames - 1);
    if (k < this.frames - RING) {
      return undefined;
    }
    return this.probs[k % RING];
  }
}
