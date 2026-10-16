/**
 * Silero VAD as the chunked stream's speech detector.
 *
 * A 2.3 MB ONNX model (MIT, trained on 6000+ languages) scores 32 ms frames
 * of 16 kHz audio: the probability that the frame is a human voice, which an
 * energy gate cannot tell from a chair, a keyboard or a far-away TV. It runs
 * through `onnxruntime-node`, an optional dependency with prebuilt CPU
 * binaries for Linux, macOS and Windows on x64 and arm64; measured at about
 * 0.1 ms per frame on one thread, so a stream costs well under one percent
 * of a core. One inference session per model file is shared by every stream
 * in the process; each detector keeps only its own LSTM state and the 64
 * samples of context the model wants in front of every frame.
 *
 * Nothing here is imported statically by the rest of the package: the
 * adapter loads this module only when a stream needs it, and the runtime
 * itself is imported through a variable specifier so a typecheck or a bundle
 * does not need the native module present.
 *
 * @module voice/vad/sileroVad
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  STTOnnxRuntime,
  STTOnnxSession,
  STTOnnxTensor,
  STTSpeechDetector,
  STTVadEngine,
  STTVadOptions,
} from "../../types/index.js";
import { STT_ERROR_CODES } from "../../types/index.js";
import { STTError } from "../errors.js";
import {
  ensureVadModel,
  resolveVadDir,
  vadAutoDownloadEnabled,
} from "./assets.js";

/** Samples per frame at 16 kHz (32 ms). */
export const SILERO_FRAME_SAMPLES = 512;
/** Samples of the previous frame the model wants in front of the new one. */
const CONTEXT_SAMPLES = 64;
const STATE_DIMS = [2, 1, 128] as const;
const STATE_SIZE = 2 * 128;

/** Thresholds of `STTVadOptions` when the caller sets none. */
export const VAD_DEFAULTS = {
  onset: 0.6,
  sustain: 0.35,
  startMs: 120,
} as const;

/** `options.engine`, else `NEUROLINK_STT_VAD`, else `"auto"`. */
export function resolveVadEngine(options?: STTVadOptions): STTVadEngine {
  const raw = (options?.engine ?? process.env.NEUROLINK_STT_VAD ?? "")
    .trim()
    .toLowerCase();
  return raw === "silero" || raw === "energy" ? raw : "auto";
}

/** The three thresholds with the defaults applied and nonsense clamped. */
export function resolveVadThresholds(options?: STTVadOptions): {
  onset: number;
  sustain: number;
  startMs: number;
} {
  const unit = (value: number | undefined, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(1, Math.max(0, value))
      : fallback;
  const onset = unit(options?.onset, VAD_DEFAULTS.onset);
  const sustain = Math.min(unit(options?.sustain, VAD_DEFAULTS.sustain), onset);
  const startMs =
    typeof options?.startMs === "number" &&
    Number.isFinite(options.startMs) &&
    options.startMs >= 0
      ? options.startMs
      : VAD_DEFAULTS.startMs;
  return { onset, sustain, startMs };
}

let runtime: Promise<STTOnnxRuntime> | undefined;
const sessions = new Map<string, Promise<STTOnnxSession>>();

function isRuntime(value: unknown): value is STTOnnxRuntime {
  if (!value || typeof value !== "object") {
    return false;
  }
  const o = value as { InferenceSession?: unknown; Tensor?: unknown };
  const session: unknown = o.InferenceSession;
  const create =
    typeof session === "function" ? Reflect.get(session, "create") : undefined;
  return typeof create === "function" && typeof o.Tensor === "function";
}

async function loadRuntime(): Promise<STTOnnxRuntime> {
  // A variable specifier: bundlers leave the native module alone, and a
  // typecheck does not need the optional dependency installed.
  const specifier = "onnxruntime-node";
  let mod: unknown;
  try {
    mod = await import(specifier);
  } catch (error) {
    throw new STTError({
      code: STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      message:
        "The Silero speech detector needs the optional dependency onnxruntime-node, which did not load " +
        `(${error instanceof Error ? error.message : String(error)}). Install it (pnpm add onnxruntime-node), ` +
        'or set streaming.vad.engine (NEUROLINK_STT_VAD) to "energy" to stream without it.',
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { provider: "silero-vad" },
      originalError: error instanceof Error ? error : undefined,
    });
  }
  const candidates = [mod, (mod as { default?: unknown }).default];
  const found = candidates.find(isRuntime);
  if (!found) {
    throw new STTError({
      code: STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      message:
        "onnxruntime-node loaded but did not export InferenceSession and Tensor; the Silero speech detector cannot run.",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { provider: "silero-vad" },
    });
  }
  return found;
}

function sessionFor(
  rt: STTOnnxRuntime,
  modelPath: string,
): Promise<STTOnnxSession> {
  let session = sessions.get(modelPath);
  if (!session) {
    session = rt.InferenceSession.create(modelPath, {
      executionProviders: ["cpu"],
      intraOpNumThreads: 1,
      interOpNumThreads: 1,
      logSeverityLevel: 3,
    });
    sessions.set(modelPath, session);
    session.catch(() => sessions.delete(modelPath));
  }
  return session;
}

class SileroSpeechDetector {
  readonly name = "silero";
  readonly frameSamples = SILERO_FRAME_SAMPLES;
  private state: STTOnnxTensor;
  private context = new Float32Array(CONTEXT_SAMPLES);
  private readonly sr: STTOnnxTensor;

  constructor(
    private readonly rt: STTOnnxRuntime,
    private readonly session: STTOnnxSession,
  ) {
    this.sr = new rt.Tensor("int64", BigInt64Array.from([16000n]), []);
    this.state = this.freshState();
  }

  reset(): void {
    this.state = this.freshState();
    this.context = new Float32Array(CONTEXT_SAMPLES);
  }

  async score(frame: Float32Array): Promise<number> {
    if (frame.length !== SILERO_FRAME_SAMPLES) {
      throw new Error(
        `Silero VAD scores ${SILERO_FRAME_SAMPLES}-sample frames, got ${frame.length}`,
      );
    }
    const input = new Float32Array(CONTEXT_SAMPLES + SILERO_FRAME_SAMPLES);
    input.set(this.context, 0);
    input.set(frame, CONTEXT_SAMPLES);
    const out = await this.session.run({
      input: new this.rt.Tensor("float32", input, [1, input.length]),
      state: this.state,
      sr: this.sr,
    });
    const prob = out.output?.data[0];
    const next = out.stateN;
    if (typeof prob !== "number" || !next) {
      throw new Error("Silero VAD returned no probability");
    }
    this.state = next;
    this.context = frame.slice(SILERO_FRAME_SAMPLES - CONTEXT_SAMPLES);
    return Math.min(1, Math.max(0, prob));
  }

  private freshState(): STTOnnxTensor {
    return new this.rt.Tensor(
      "float32",
      new Float32Array(STATE_SIZE),
      STATE_DIMS,
    );
  }
}

/**
 * A detector for one stream: the model file located (and fetched when
 * allowed), the runtime loaded, the shared session created on first use.
 * Throws an `STTError` saying exactly what is missing when it cannot.
 */
export async function loadSileroDetector(
  options?: STTVadOptions,
): Promise<STTSpeechDetector> {
  // The runtime first: without onnxruntime-node there is nothing to run the
  // model on, so it must not be prepared (or downloaded) for nothing.
  if (!runtime) {
    runtime = loadRuntime().catch((error: unknown) => {
      runtime = undefined;
      throw error;
    });
  }
  const rt = await runtime;
  const modelPath = await ensureVadModel(
    resolveVadDir(options),
    vadAutoDownloadEnabled(options),
  );
  return new SileroSpeechDetector(rt, await sessionFor(rt, modelPath));
}
