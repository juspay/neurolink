// NeuroLink Browser Bundle
// Self-contained browser bundle. Includes global shims for process, Buffer, and timers that are installed on first import.
/* eslint-disable @typescript-eslint/no-explicit-any */

// === Global shims (must run before any imports) ===
if (typeof globalThis.process === "undefined") {
  (globalThis as any).process = new Proxy(
    {
      env: {},
      version: "v24.0.0",
      platform: "browser",
      argv: [],
      pid: 1,
      ppid: 0,
      arch: "wasm",
      cwd: () => "/",
      exit: () => {},
      on: () => (globalThis as any).process,
      off: () => (globalThis as any).process,
      once: () => (globalThis as any).process,
      emit: () => false,
      removeListener: () => (globalThis as any).process,
      addListener: () => (globalThis as any).process,
      stdout: { write: () => true, on: () => {} },
      stderr: { write: () => true, on: () => {} },
      stdin: { on: () => {} },
      nextTick: (fn: Function, ...a: any[]) => setTimeout(() => fn(...a), 0),
      hrtime: Object.assign(
        (t?: [number, number]) => {
          const now = performance.now() * 1e6;
          const s = Math.floor(now / 1e9);
          const n = Math.floor(now % 1e9);
          return t ? [s - t[0], n - t[1]] : [s, n];
        },
        { bigint: () => BigInt(Math.floor(performance.now() * 1e6)) },
      ),
      memoryUsage: () => ({
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0,
      }),
      cpuUsage: () => ({ user: 0, system: 0 }),
      versions: { browser: "1.0.0", v8: "0", modules: "0" },
      release: { name: "browser" },
      uptime: () => performance.now() / 1000,
      title: "browser",
      execPath: "/browser",
      execArgv: [],
      features: {},
      config: {},
      kill: () => {},
      abort: () => {},
    },
    {
      get(target: any, prop: string) {
        if (prop in target) {
          return target[prop];
        }
        return () => {};
      },
    },
  );
}

if (typeof globalThis.Buffer === "undefined") {
  // @ts-expect-error - Browser Buffer shim intentionally overrides Uint8Array.from() signature to support encoding parameter
  (globalThis as any).Buffer = class Buffer extends Uint8Array {
    static from(data: any, encoding?: string) {
      if (typeof data === "string") {
        const enc = (encoding || "utf8").toLowerCase();
        if (enc === "base64") {
          const binary = atob(data);
          const bLen = binary.length;
          const bytes = new Uint8Array(bLen);
          for (let i = 0; i < bLen; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes;
        }
        if (enc === "hex") {
          const dLen = data.length;
          const bytes = new Uint8Array(dLen / 2);
          for (let i = 0; i < dLen; i += 2) {
            bytes[i / 2] = parseInt(data.substring(i, i + 2), 16);
          }
          return bytes;
        }
        return new TextEncoder().encode(data);
      }
      return new Uint8Array(data);
    }
    static alloc(n: number) {
      return new Uint8Array(n);
    }
    static isBuffer(o: any) {
      return o instanceof Uint8Array;
    }
    static concat(l: Uint8Array[]) {
      const t = l.reduce((s, b) => s + b.length, 0);
      const r = new Uint8Array(t);
      let o = 0;
      for (const b of l) {
        r.set(b, o);
        o += b.length;
      }
      return r;
    }
    static byteLength(s: string) {
      return new TextEncoder().encode(s).length;
    }
    toString(encoding?: string): string {
      const enc = (encoding || "utf8").toLowerCase();
      switch (enc) {
        case "utf8":
        case "utf-8":
          return new TextDecoder().decode(this);
        case "hex":
          return Array.from(
            new Uint8Array(this.buffer, this.byteOffset, this.byteLength),
          )
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        case "base64": {
          let binary = "";
          const len = this.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(this[i]);
          }
          return btoa(binary);
        }
        case "binary":
        case "latin1": {
          let str = "";
          const len = this.byteLength;
          for (let i = 0; i < len; i++) {
            str += String.fromCharCode(this[i]);
          }
          return str;
        }
        default:
          return new TextDecoder().decode(this);
      }
    }
  };
}

if (typeof globalThis.global === "undefined") {
  (globalThis as any).global = globalThis;
}

// === Re-export NeuroLink SDK ===
// @ts-ignore - esbuild resolves .ts extensions
export * from "../lib/index.js";

// === Provider creators (for direct browser use) ===
// Public browser-bundle API surface. Phase 5+ of memory-bank/native-runtime/
// replaces these with native equivalents under the same public names
// (success criterion #5).
export { createAnthropic, anthropic } from "@ai-sdk/anthropic";
export { createOpenAI, openai } from "@ai-sdk/openai";
export { createMistral, mistral } from "@ai-sdk/mistral";

// === Core generation functions ===
// Routed through the internal seam (utils/generation.ts) so the browser bundle
// picks up any future Phase 5+ replacement automatically without a separate
// edit here. Function identity is unchanged today.
export {
  generateText,
  streamText,
  generateObject,
  streamObject,
} from "../lib/utils/generation.js";
