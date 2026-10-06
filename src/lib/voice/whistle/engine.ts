/**
 * Main-thread side of the Whistle engine: one warm `worker_threads` Worker
 * that holds the WASM engine and the model, requests answered in order, and a
 * fresh worker after a crash.
 *
 * The worker is unreferenced while idle, so a warm engine never keeps the
 * process alive on its own; it is referenced again while a request is open.
 *
 * @module voice/whistle/engine
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import type {
  WhistleAssetPaths,
  WhistleEngineOutput,
  WhistleStreamStep,
  WhistleWorkerData,
  WhistleWorkerOutgoing,
  WhistleWorkerRequest,
  WhistleWorkerResponse,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { STTError } from "../errors.js";

/** Model load is ~0.1 s; a boot that takes this long is stuck. */
const BOOT_TIMEOUT_MS = 60_000;

/**
 * The compiled entry is `worker.js` next to this file. Running from source
 * (tsx), only `worker.ts` exists; the worker inherits the loader through
 * `execArgv`, so it can run the TypeScript file directly.
 */
function workerEntry(): URL {
  const compiled = new URL("./worker.js", import.meta.url);
  if (existsSync(fileURLToPath(compiled))) {
    return compiled;
  }
  const source = new URL("./worker.ts", import.meta.url);
  return existsSync(fileURLToPath(source)) ? source : compiled;
}

export class WhistleEngine {
  private worker: Worker | undefined;
  private ready: Promise<void> | undefined;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    {
      resolve: (msg: WhistleWorkerResponse) => void;
      reject: (e: Error) => void;
    }
  >();

  constructor(private readonly paths: WhistleAssetPaths) {}

  /** Batch transcription of 16 kHz mono samples; long audio is chunked in the worker. */
  async transcribe(
    pcm: Float32Array,
    language: string | null,
    keywords: string | null,
    timestamps: boolean,
  ): Promise<WhistleEngineOutput> {
    const msg = await this.request({
      op: "transcribe",
      pcm,
      language,
      keywords,
      timestamps,
    });
    if (msg.kind !== "transcribed") {
      throw STTError.transcriptionFailed("unexpected worker reply", "whistle");
    }
    return msg.result;
  }

  /** Feed about a second of samples to the engine's native stream. */
  async streamProcess(
    pcm: Float32Array,
    language: string | null,
    keywords: string | null,
  ): Promise<WhistleStreamStep> {
    const msg = await this.request({
      op: "streamProcess",
      pcm,
      language,
      keywords,
    });
    if (msg.kind !== "streamStep") {
      throw STTError.streamError("unexpected worker reply", "whistle");
    }
    return msg.result;
  }

  /** Flush the stream's tail and reset its state. */
  async streamStop(): Promise<WhistleStreamStep> {
    const msg = await this.request({ op: "streamStop" });
    if (msg.kind !== "streamStep") {
      throw STTError.streamError("unexpected worker reply", "whistle");
    }
    return msg.result;
  }

  /** Terminate the worker; the next call starts a new one. */
  async dispose(): Promise<void> {
    const worker = this.worker;
    this.worker = undefined;
    this.ready = undefined;
    this.failAll(new Error("Whistle engine disposed"));
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
  }

  private async request(
    body: WhistleWorkerOutgoing,
  ): Promise<WhistleWorkerResponse> {
    await this.start();
    const worker = this.worker;
    if (!worker) {
      throw STTError.transcriptionFailed(
        "Whistle worker is not running",
        "whistle",
      );
    }
    const id = this.nextId++;
    // Hand the worker a copy it owns: transferred rather than cloned, and the
    // caller's array stays usable.
    let req: WhistleWorkerRequest;
    const transfer: ArrayBuffer[] = [];
    if ("pcm" in body) {
      const pcm = new Float32Array(body.pcm);
      transfer.push(pcm.buffer);
      req = { ...body, id, pcm };
    } else {
      req = { ...body, id };
    }
    const response = new Promise<WhistleWorkerResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    worker.ref();
    worker.postMessage(req, transfer);
    try {
      const msg = await response;
      if (msg.kind === "failed") {
        throw STTError.transcriptionFailed(
          `Whistle engine: ${msg.error}`,
          "whistle",
        );
      }
      return msg;
    } finally {
      if (this.pending.size === 0 && this.worker === worker) {
        worker.unref();
      }
    }
  }

  private start(): Promise<void> {
    if (this.ready) {
      return this.ready;
    }
    const workerData: WhistleWorkerData = { paths: this.paths };
    const worker = new Worker(workerEntry(), {
      workerData,
      execArgv: process.execArgv.filter(
        (arg) => !arg.startsWith("--input-type"),
      ),
    });
    this.worker = worker;
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          STTError.transcriptionFailed(
            "Whistle worker did not start in time",
            "whistle",
          ),
        );
        void this.crash(worker, new Error("boot timeout"));
      }, BOOT_TIMEOUT_MS);
      worker.on("message", (msg: WhistleWorkerResponse) => {
        if (msg.kind === "ready") {
          clearTimeout(timer);
          logger.debug(`[whistle] engine ready in ${msg.loadMs} ms`);
          resolve();
          return;
        }
        if (msg.kind === "bootError") {
          clearTimeout(timer);
          reject(
            STTError.transcriptionFailed(
              `Whistle engine failed to load: ${msg.error}`,
              "whistle",
            ),
          );
          void this.crash(worker, new Error(msg.error));
          return;
        }
        const entry = this.pending.get(msg.id);
        if (entry) {
          this.pending.delete(msg.id);
          entry.resolve(msg);
        }
      });
      worker.on("error", (error) => {
        clearTimeout(timer);
        reject(
          STTError.transcriptionFailed(
            `Whistle worker crashed: ${error.message}`,
            "whistle",
            error,
          ),
        );
        void this.crash(worker, error);
      });
      worker.on("exit", (code) => {
        clearTimeout(timer);
        reject(
          STTError.transcriptionFailed(
            `Whistle worker exited (code ${code})`,
            "whistle",
          ),
        );
        void this.crash(worker, new Error(`worker exited with code ${code}`));
      });
    });
    this.ready = ready;
    // A failed boot must not stick: the next call tries again.
    ready.catch(() => {
      if (this.ready === ready) {
        this.ready = undefined;
      }
    });
    return ready;
  }

  /** Drop a dead worker: reject what it held, and let the next call start a new one. */
  private async crash(worker: Worker, error: Error): Promise<void> {
    if (this.worker !== worker) {
      return;
    }
    logger.warn(
      `[whistle] worker stopped (${error.message}); it will be restarted on the next call`,
    );
    this.worker = undefined;
    this.ready = undefined;
    this.failAll(error);
    await worker.terminate().catch(() => undefined);
  }

  private failAll(error: Error): void {
    for (const [id, entry] of this.pending) {
      this.pending.delete(id);
      entry.reject(
        STTError.transcriptionFailed(
          `Whistle worker stopped: ${error.message}`,
          "whistle",
          error,
        ),
      );
    }
  }
}
