import { SAMPLE_RATE } from "./config";

let ctx: AudioContext | null = null;
let inputRate = SAMPLE_RATE;
let sink: ((buf: Float32Array) => void) | null = null;

export const getInputRate = () => inputRate;

// The mic level drives the orb and the waveform at frame rate, so it bypasses the React store.
const levelListeners = new Set<(rms: number) => void>();
export function emitLevel(rms: number) {
  levelListeners.forEach((l) => l(rms));
}
export function onLevel(l: (rms: number) => void) {
  levelListeners.add(l);
  return () => levelListeners.delete(l);
}

export function setSampleSink(fn: (buf: Float32Array) => void) {
  sink = fn;
}

const workletSrc = `class Tap extends AudioWorkletProcessor { process(inputs) { const ch = inputs[0] && inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; } } registerProcessor("tap", Tap);`;

export async function ensureAudio() {
  if (ctx) {
    if (ctx.state === "suspended") await ctx.resume();
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  // Ask for 16 kHz; some browsers refuse to feed a context whose rate differs from the
  // microphone's, so fall back to the default rate (the capture path resamples anyway).
  const build = async (rate?: number) => {
    const c = rate
      ? new AudioContext({ sampleRate: rate })
      : new AudioContext();
    try {
      const source = c.createMediaStreamSource(stream);
      let node: AudioNode;
      if (c.audioWorklet) {
        await c.audioWorklet.addModule(
          URL.createObjectURL(
            new Blob([workletSrc], { type: "application/javascript" }),
          ),
        );
        const w = new AudioWorkletNode(c, "tap", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
        });
        w.port.onmessage = (e: MessageEvent<Float32Array>) => sink?.(e.data);
        node = w;
      } else {
        const sp = c.createScriptProcessor(4096, 1, 1);
        sp.onaudioprocess = (e) =>
          sink?.(e.inputBuffer.getChannelData(0).slice(0));
        node = sp;
      }
      source.connect(node);
      node.connect(c.destination);
      return c;
    } catch (e) {
      void c.close().catch(() => {});
      throw e;
    }
  };
  let c: AudioContext;
  try {
    try {
      c = await build(SAMPLE_RATE);
    } catch {
      c = await build();
    }
  } catch (e) {
    // nothing is left holding the microphone; the next attempt starts clean
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }
  inputRate = c.sampleRate;
  ctx = c;
  if (ctx.state === "suspended") await ctx.resume();
}

export function rmsOf(buf: Float32Array) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

export function resampleTo16k(samples: Float32Array) {
  if (inputRate === SAMPLE_RATE) return samples;
  const ratio = inputRate / SAMPLE_RATE,
    out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio,
      i0 = Math.floor(pos),
      i1 = Math.min(i0 + 1, samples.length - 1);
    out[i] = samples[i0] + (samples[i1] - samples[i0]) * (pos - i0);
  }
  return out;
}

export function toWav(float32: Float32Array) {
  const pcm = new DataView(new ArrayBuffer(44 + float32.length * 2));
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) pcm.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  pcm.setUint32(4, 36 + float32.length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  pcm.setUint32(16, 16, true);
  pcm.setUint16(20, 1, true);
  pcm.setUint16(22, 1, true);
  pcm.setUint32(24, SAMPLE_RATE, true);
  pcm.setUint32(28, SAMPLE_RATE * 2, true);
  pcm.setUint16(32, 2, true);
  pcm.setUint16(34, 16, true);
  w(36, "data");
  pcm.setUint32(40, float32.length * 2, true);
  for (let i = 0, o = 44; i < float32.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([pcm], { type: "audio/wav" });
}

export async function decodeFile(file: Blob) {
  const audio = await new OfflineAudioContext(
    1,
    1,
    SAMPLE_RATE,
  ).decodeAudioData(await file.arrayBuffer());
  const n = audio.length,
    mono = new Float32Array(n);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const d = audio.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i] += d[i] / audio.numberOfChannels;
  }
  return mono;
}

export function wavSeconds(buf: ArrayBuffer) {
  const v = new DataView(buf);
  if (buf.byteLength < 44 || v.getUint32(0, false) !== 0x52494646) return null;
  return (
    (buf.byteLength - 44) /
    (v.getUint32(24, true) *
      v.getUint16(22, true) *
      (v.getUint16(34, true) / 8))
  );
}
