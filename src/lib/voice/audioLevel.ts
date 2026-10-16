/**
 * Speech level for the engines: a quiet utterance (a far-field speaker, a
 * low-gain microphone) is raised to a normal speech level before an engine
 * hears it. Recognisers are trained on speech near -20 dBFS and lose words,
 * and language-ID confidence, well below it.
 *
 * Gain only ever goes up, is capped, and is limited by the peak so nothing
 * clips; digital silence stays silence (zero times any gain is zero), so the
 * silence pad an engine relies on is untouched.
 *
 * @module voice/audioLevel
 */

/** RMS the speech is raised to: about -22 dBFS. */
const TARGET_SPEECH_RMS = 0.08;
/** Most gain applied to any utterance. */
const MAX_GAIN = 8;
/** Peak after gain; leaves headroom for the engine's own resampling. */
const PEAK_LIMIT = 0.95;
/** Blocks quieter than this do not count as speech when measuring the level. */
const SPEECH_FLOOR_RMS = 0.002;
/** 20 ms at 16 kHz. */
const BLOCK = 320;
/** Gain below this is not worth a copy of the audio. */
const MIN_USEFUL_GAIN = 1.1;

/** `pcm` with its speech raised to the target level, or `pcm` itself when it is loud enough already. */
export function normalizeSpeechLevel(pcm: Float32Array): Float32Array {
  let sum = 0;
  let count = 0;
  let peak = 0;
  for (let at = 0; at < pcm.length; at += BLOCK) {
    const end = Math.min(pcm.length, at + BLOCK);
    let block = 0;
    for (let i = at; i < end; i++) {
      const v = pcm[i];
      block += v * v;
      const a = Math.abs(v);
      if (a > peak) {
        peak = a;
      }
    }
    const rms = Math.sqrt(block / Math.max(1, end - at));
    if (rms >= SPEECH_FLOOR_RMS) {
      sum += block;
      count += end - at;
    }
  }
  if (count === 0 || peak === 0) {
    return pcm;
  }
  const speechRms = Math.sqrt(sum / count);
  const gain = Math.min(
    MAX_GAIN,
    TARGET_SPEECH_RMS / speechRms,
    PEAK_LIMIT / peak,
  );
  if (!(gain >= MIN_USEFUL_GAIN)) {
    return pcm;
  }
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    out[i] = pcm[i] * gain;
  }
  return out;
}
