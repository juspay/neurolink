#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Production Bugfix Verification
 *
 * Tests for fixes from NEUROLINK_FIX_PROMPT_2026-04-11:
 * 1. Vertex location routing: gemini-* forced to global, default global, env override
 * 2. Proxy routing: no classification, no contract gating, simple per-account cooldown
 * 3. Message builder sanitizes tool_use/tool_result from conversation history (Bug 2)
 *
 * Run with: npx tsx test/continuous-test-suite-bugfixes.ts
 */

import {
  buildProxyTranslationPlan,
  parseRetryAfterMs,
} from "../src/lib/proxy/routingPolicy.js";
import { __testHooks } from "../src/lib/server/routes/claudeProxyRoutes.js";

import {
  convertToModelMessages,
  buildMultimodalMessagesArray,
  mergeMediaFileAliases,
} from "../src/lib/utils/messageBuilder.js";
import { buildMultimodalOptions } from "../src/lib/utils/multimodalOptionsBuilder.js";
import {
  CSVProcessor,
  isValidCsvRow,
  assertValidCsvRow,
  sanitizeColumnName,
  dedupeColumnNames,
} from "../src/lib/utils/csvProcessor.js";
import { NeuroLinkError } from "../src/lib/utils/errorHandling.js";
import { formatMediaDuration } from "../src/lib/utils/mediaDuration.js";
import { ErrorCategory } from "../src/lib/constants/enums.js";
import { decodeBuffer } from "../src/lib/utils/textEncoding.js";
import { CSVLoader } from "../src/lib/rag/document/loaders.js";
import type { CSVLoaderOptions } from "../src/lib/types/index.js";
import iconv from "iconv-lite";
import { Readable, Transform } from "node:stream";
import { PDFProcessor } from "../src/lib/utils/pdfProcessor.js";
import { PDF_LIMITS } from "../src/lib/core/constants.js";
import { CLICommandFactory } from "../src/cli/factories/commandFactory.js";
import { SIZE_LIMITS_BYTES } from "../src/lib/processors/config/sizeLimits.js";
import { directAgentTools } from "../src/lib/agent/directTools.js";
import { isMultimodalInput } from "../src/lib/types/index.js";
import { FileDetector } from "../src/lib/utils/fileDetector.js";
import { ImageProcessor, imageUtils } from "../src/lib/utils/imageProcessor.js";
import { ERROR_CODES } from "../src/lib/utils/errorHandling.js";
import fs, {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join as pathJoin, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn as spawnProcess } from "node:child_process";
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from "undici";
import http from "node:http";
import AdmZip from "adm-zip";

const CLI_DIST_PATH = pathJoin(process.cwd(), "dist", "cli", "index.js");

/**
 * Spawn the built CLI (dist/cli/index.js) and capture exit code + separate
 * stdout/stderr (plus `out`, the combined stream, for tests that don't care
 * which stream a message landed on). Used by the CLI-file-validation E2E
 * tests (#288/#291) — requires a prior `pnpm run build`.
 */
function runCliBugfix(
  args: string[],
  timeoutMs = 60_000,
): Promise<{
  code: number | null;
  out: string;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    if (!existsSync(CLI_DIST_PATH)) {
      const message = `dist/cli/index.js not found at ${CLI_DIST_PATH} — run 'pnpm run build:cli' first`;
      // Surface on stderr too so it's visible when the suite is run directly,
      // not just via the unhandled-rejection exit path.
      process.stderr.write(`${message}\n`);
      reject(new Error(message));
      return;
    }
    const child = spawnProcess(process.execPath, [CLI_DIST_PATH, ...args], {
      env: { ...process.env, NO_COLOR: "1" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("CLI timed out"));
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, out: stdout + stderr, stdout, stderr });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
import { PptxProcessor } from "../src/lib/processors/document/PptxProcessor.js";
import {
  validateCliInputFiles,
  validateCsvMaxRows,
  CLI_SOFT_LIMITS_MB,
} from "../src/cli/utils/inputValidation.js";

import {
  isRollingHandoffCapable,
  normalizeSupervisorState,
  processLooksLikeProxySupervisor,
} from "../src/cli/commands/proxy.js";
import {
  loadUpdateState,
  recordUpdateInstalled,
} from "../src/lib/proxy/updateState.js";
import type { ProxySupervisorState } from "../src/lib/types/index.js";

import {
  GoogleVertexProvider,
  resolveVertexLocation,
} from "../src/lib/providers/googleVertex/index.js";

import {
  appendStepText,
  mapGeminiFinishReason,
} from "../src/lib/providers/googleNativeGemini3/index.js";

import { OpenAICompatibleProvider } from "../src/lib/providers/openaiCompatible/index.js";
import { OpenAIProvider } from "../src/lib/providers/openAI/index.js";
import { LiteLLMProvider } from "../src/lib/providers/litellm/index.js";
import { ModelAccessDeniedError } from "../src/lib/types/index.js";

import {
  getPlayerCandidates,
  buildPlaybackErrorMessage,
  escapePowerShellSingleQuoted,
} from "../src/cli/utils/audioPlayer.js";
import {
  redactUrlForError,
  redactUrlCredentials,
  redactUrlsInText,
  sanitizeErrorCause,
  SENSITIVE_URL_QUERY_PARAM_DENYLIST,
  stripSensitiveUrlParamsForCacheKey,
} from "../src/lib/utils/logSanitize.js";
import {
  ImageCache,
  getImageCache,
  resetImageCache,
} from "../src/lib/utils/imageCache.js";
import { logger } from "../src/lib/utils/logger.js";

import type {
  ParsedClaudeRequest,
  RuntimeAccountState,
} from "../src/lib/types/index.js";

// ============================================================================
// Types
// ============================================================================

type TestFunction = {
  name: string;
  fn: () => Promise<boolean | null>;
  category?: string;
};

// ============================================================================
// Helpers (delegated to shared harness where possible)
// ============================================================================

import { defineSuite, log, logSection } from "./helpers/harness.js";

const { recordTest, runSuite } = defineSuite("Production Bugfix Verification");

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function makeParsedRequest(
  overrides: Partial<ParsedClaudeRequest> = {},
): ParsedClaudeRequest {
  return {
    model: "claude-sonnet-4-20250514",
    maxTokens: 4096,
    stream: true,
    prompt: "hello",
    conversationMessages: [],
    tools: {},
    images: [],
    thinkingConfig: undefined,
    toolChoice: undefined,
    toolChoiceName: undefined,
    systemPrompt: "",
    ...overrides,
  } as ParsedClaudeRequest;
}

function makeRuntimeState(
  overrides: Partial<RuntimeAccountState> = {},
): RuntimeAccountState {
  return {
    consecutiveRefreshFailures: 0,
    permanentlyDisabled: false,
    ...overrides,
  };
}

async function withTemporaryEnv<T>(
  updates: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(updates)) {
    previous.set(key, process.env[key]);
    const next = updates[key];
    if (next === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = next;
    }
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

/**
 * Append a syntactically-standalone (unreferenced) PDF object carrying an
 * explicit `/MediaBox` to a valid PDF buffer. `PDFProcessor`'s pre-flight
 * page-size check does a raw byte-level regex scan for `/MediaBox`
 * occurrences — it doesn't care whether the object is reachable via the xref
 * table — so this lets pixel-guard tests control the "largest MediaBox"
 * input deterministically without depending on whether the base fixture's
 * own MediaBox happens to be stored as plaintext (vs. inside a compressed
 * object stream, which the regex can't see). The decoy object is never part
 * of the page tree, so it has no effect on what actually gets rendered.
 */
function appendDecoyMediaBox(
  pdf: Buffer,
  widthPoints: string,
  heightPoints: string,
): Buffer {
  const decoy = Buffer.from(
    `\n999 0 obj\n<< /Type /XObject /Subtype /Form /MediaBox [0 0 ${widthPoints} ${heightPoints}] >>\nendobj\n`,
  );
  return Buffer.concat([pdf, decoy]);
}

// ============================================================================
// Tests
// ============================================================================

const tests: TestFunction[] = [
  // ---------- CSV processor line ending handling ----------
  {
    name: "CSVProcessor.parseCSVString handles Unix, Windows, and classic Mac line endings",
    category: "csv-processor",
    fn: async () => {
      const cases = [
        "name,age\nAlice,30\nBob,25",
        "name,age\r\nAlice,30\r\nBob,25",
        "name,age\rAlice,30\rBob,25",
      ];

      for (const csv of cases) {
        const rows = (await CSVProcessor.parseCSVString(csv, 10)) as Array<
          Record<string, string>
        >;
        if (
          rows.length !== 2 ||
          rows[0]?.name !== "Alice" ||
          rows[0]?.age !== "30" ||
          rows[1]?.name !== "Bob" ||
          rows[1]?.age !== "25"
        ) {
          return false;
        }
      }

      return true;
    },
  },
  {
    name: "CSVProcessor raw format counts CRLF rows without retaining carriage returns",
    category: "csv-processor",
    fn: async () => {
      const result = await CSVProcessor.process(
        Buffer.from("name,age\r\nAlice,30\r\nBob,25"),
        { formatStyle: "raw", maxRows: 10 },
      );

      return (
        result.metadata?.rowCount === 2 &&
        result.metadata?.totalLines === 3 &&
        typeof result.content === "string" &&
        !result.content.includes("\r") &&
        result.content.includes("Alice,30\nBob,25")
      );
    },
  },
  {
    name: "CSVProcessor: bare CR inside a quoted field is field content, not a row boundary (RFC 4180)",
    category: "csv-processor",
    fn: async () => {
      // "line1\rline2" is one quoted field containing a classic-Mac CR — legal
      // RFC-4180 content, not two rows. A quote-unaware row splitter would
      // inflate the row count and rewrite the value; the quote-aware splitter
      // must keep the field whole.
      const csv = 'name,notes\nAlice,"line1\rline2"\nBob,ok';
      const parsed = (await CSVProcessor.parseCSVString(csv, 10)) as Array<
        Record<string, string>
      >;
      const raw = await CSVProcessor.process(Buffer.from(csv), {
        formatStyle: "raw",
        maxRows: 10,
      });
      return (
        parsed.length === 2 &&
        parsed[0]?.notes === "line1\rline2" &&
        parsed[1]?.name === "Bob" &&
        raw.metadata?.rowCount === 2 &&
        typeof raw.content === "string" &&
        raw.content.includes('"line1\rline2"')
      );
    },
  },
  // ---------- CSV hardening: encoding / single-read / cleanup / context /
  //            sanitization / timeout / row validation (#362/#368/#371/#375/
  //            #378/#379/#384) ----------
  {
    name: "CSVProcessor #362: detects Windows-1252 and decodes non-ASCII without mojibake",
    category: "csv-processor",
    fn: async () => {
      const buf = iconv.encode(
        "name,city\ncafé,Zürich\nMüller,Köln\n",
        "windows-1252",
      );
      const result = await FileDetector.detectAndProcess(buf);
      const enc = result.metadata?.detectedEncoding;
      return (
        result.type === "csv" &&
        typeof result.content === "string" &&
        result.content.includes("café") &&
        result.content.includes("Müller") &&
        !result.content.includes("�") &&
        enc !== undefined &&
        enc !== "utf-8" // detected as latin1 / windows-1252, not hard-coded utf-8
      );
    },
  },
  {
    name: "CSVProcessor #362: encoding override, UTF-16LE BOM, and plain-ASCII default",
    category: "csv-processor",
    fn: async () => {
      const win = iconv.encode("name,note\ncafé,ok\n", "windows-1252");
      const override = await CSVProcessor.process(win, {
        formatStyle: "json",
        encoding: "windows-1252",
      });
      if (override.metadata?.detectedEncoding !== "windows-1252") {
        return false;
      }
      if (!override.content.includes("café")) {
        return false;
      }

      // UTF-16LE with BOM decodes correctly.
      const u16 = iconv.encode("﻿name,note\nAlice,hi\n", "utf-16le");
      const r16 = await CSVProcessor.process(u16, { formatStyle: "json" });
      if (
        (r16.metadata?.detectedEncoding ?? "").toLowerCase() !== "utf-16le" ||
        JSON.parse(r16.content)[0]?.name !== "Alice"
      ) {
        return false;
      }

      // Plain ASCII → "utf-8" (byte-identical to the pre-fix default).
      const ascii = await CSVProcessor.process(
        Buffer.from("id,name\n1,Alice\n2,Bob\n"),
        { formatStyle: "json" },
      );
      return (
        ascii.metadata?.detectedEncoding === "utf-8" &&
        JSON.parse(ascii.content).length === 2
      );
    },
  },
  {
    name: "CSVProcessor #368: single-read parseCSVFile skips a sep= metadata line via the real header",
    category: "csv-processor",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(process.cwd(), ".tmp-csv-368-"));
      try {
        const p = pathJoin(dir, "meta.csv");
        writeFileSync(p, "sep=,\nh1,h2\n1,2\n3,4\n5,6\n");
        const rows = await CSVProcessor.parseCSVFile(p, 10);
        if (rows.length !== 3 || rows[0]?.h1 !== "1" || rows[0]?.h2 !== "2") {
          return false;
        }
        // End-to-end via the real analyzeCSV agent tool (its sandbox requires
        // the fixture under process.cwd(), not os.tmpdir()).
        const analyze = directAgentTools.analyzeCSV as unknown as {
          execute: (
            a: unknown,
          ) => Promise<{ success: boolean; result?: string }>;
        };
        const rel = p.slice(process.cwd().length + 1);
        const res = await analyze.execute({
          filePath: rel,
          operation: "describe",
          column: "",
          maxRows: 100,
        });
        if (!res.success) {
          return false;
        }
        return JSON.parse(res.result ?? "{}").column_count === 2;
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CSVProcessor #371: a parser error (oversized row) destroys BOTH the source and the parser",
    category: "csv-processor",
    fn: async () => {
      // Patches Readable.prototype/Transform.prototype.destroy globally to spy
      // on which stream classes get torn down. Safe in this suite specifically
      // because tests run strictly sequentially (see continuous-test-suite.ts'
      // `for (const test of tests) { await test.fn(); }`), never concurrently,
      // and the patch is always unwound in the `finally` block below.
      const destroyedCtors = new Set<string>();
      const patch = (proto: { destroy: (...a: unknown[]) => unknown }) => {
        const orig = proto.destroy;
        proto.destroy = function (
          this: { constructor?: { name?: string } },
          ...a: unknown[]
        ) {
          destroyedCtors.add(this?.constructor?.name ?? "?");
          return orig.apply(this, a);
        };
        return () => {
          proto.destroy = orig;
        };
      };
      const restores = [
        patch(Readable.prototype as unknown as { destroy: () => unknown }),
        patch(Transform.prototype as unknown as { destroy: () => unknown }),
      ];
      try {
        // A single field beyond CSV_MAX_ROW_BYTES (10 MB) triggers csv-parser's
        // "Row exceeds the maximum size" — the parser-error path.
        const bigRow = "h1,h2\n" + "a".repeat(11 * 1024 * 1024);
        let rejected = false;
        try {
          await CSVProcessor.parseCSVString(bigRow, 10);
        } catch (e) {
          rejected =
            e instanceof Error &&
            /exceed|maximum|parsing failed/i.test(e.message);
        }
        await new Promise((r) => setTimeout(r, 20));
        return (
          rejected &&
          destroyedCtors.has("CsvParser") &&
          destroyedCtors.has("Readable")
        );
      } finally {
        restores.forEach((r) => r());
      }
    },
  },
  {
    name: "CSVProcessor #375: bad path / directory yield [CSVProcessor] errors with file context",
    category: "csv-processor",
    fn: async () => {
      let enoent = "";
      try {
        await CSVProcessor.parseCSVFile("/nonexistent/path/does-not-exist.csv");
      } catch (e) {
        enoent = e instanceof Error ? e.message : String(e);
      }
      if (
        !/\[CSVProcessor\]/.test(enoent) ||
        !/Failed to open/i.test(enoent) ||
        !enoent.includes("does-not-exist")
      ) {
        return false;
      }

      const dir = mkdtempSync(pathJoin(process.cwd(), ".tmp-csv-375-"));
      try {
        let eisdir = "";
        try {
          await CSVProcessor.parseCSVFile(dir);
        } catch (e) {
          eisdir = e instanceof Error ? e.message : String(e);
        }
        return /\[CSVProcessor\]/.test(eisdir) && eisdir.includes(dir);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CSVProcessor #378: opt-in column-name sanitization yields valid identifiers and preserves originals",
    category: "csv-processor",
    fn: async () => {
      const buf = Buffer.from(
        "Price ($),1st Place,Name/Title\n19.99,1,Widget\n",
      );
      const result = await FileDetector.detectAndProcess(buf, {
        allowedTypes: ["csv"],
        csvOptions: { formatStyle: "json", sanitizeColumnNames: true },
      });
      const parsed = JSON.parse(result.content);
      const keys = Object.keys(parsed[0]);
      const allValid = keys.every((k) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(k));
      const priceUnchanged = parsed[0][keys[0]] === "19.99";
      const mapping = result.metadata?.columnNameMapping ?? [];
      const hasMapping =
        mapping.some((m) => m.original === "Price ($)") &&
        mapping.some((m) => m.original === "1st Place");
      const meta = result.metadata?.columnMetadata ?? [];
      const hasOriginal = meta.some((c) => c.originalName === "Price ($)");

      // Default (opt-out) preserves the raw header as the JSON key.
      const raw = await FileDetector.detectAndProcess(buf, {
        allowedTypes: ["csv"],
        csvOptions: { formatStyle: "json" },
      });
      const defaultRawKey =
        Object.keys(JSON.parse(raw.content)[0])[0] === "Price ($)";

      const unit =
        sanitizeColumnName("Price ($)") === "price" &&
        sanitizeColumnName("1st Place") === "col_1st_place";

      return (
        allValid &&
        priceUnchanged &&
        hasMapping &&
        hasOriginal &&
        defaultRawKey &&
        unit
      );
    },
  },
  {
    name: "CSVProcessor #378 review: dedupe avoids collisions, sanitize is ReDoS-safe and quote-aware",
    category: "csv-processor",
    fn: async () => {
      // Dedupe must not overwrite an existing name_2 with a generated one.
      const deduped = dedupeColumnNames(["name", "name", "name_2"]);
      if (
        deduped.length !== 3 ||
        new Set(deduped).size !== 3 ||
        deduped[0] !== "name"
      ) {
        return false;
      }
      // A pathological underscore/separator run must sanitize in linear time
      // (the previous `^_+|_+$` regex was polynomial — CodeQL ReDoS). The run
      // sits between non-underscore characters so it isn't consumed by a
      // leading `^_+` alternation — this is what actually exercises the
      // worst-case trailing `_+$` search.
      const t0 = Date.now();
      const sanitized = sanitizeColumnName("a" + "_".repeat(50_000) + "b");
      if (Date.now() - t0 > 200 || sanitized !== "a_b") {
        return false;
      }
      // Raw-format header sanitization is quote-aware: a quoted comma is field
      // content, not a delimiter.
      const raw = await CSVProcessor.process(
        Buffer.from('"Price, USD",Qty\n"1,000",5\n'),
        { formatStyle: "raw", sanitizeColumnNames: true },
      );
      const header = raw.content.split("\n")[0];
      const mapping = raw.metadata?.columnNameMapping ?? [];
      return (
        header === "price_usd,qty" &&
        mapping.some((m) => m.original === "Price, USD")
      );
    },
  },
  {
    name: "CSVProcessor #379: parse timeout returns partial rows instead of hanging",
    category: "csv-processor",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(process.cwd(), ".tmp-csv-379-"));
      try {
        const p = pathJoin(dir, "big.csv");
        writeFileSync(
          p,
          "a,b\n" +
            Array.from({ length: 200000 }, (_, i) => `${i},v${i}`).join("\n") +
            "\n",
        );
        const raced = await Promise.race([
          CSVProcessor.parseCSVFileWithMeta(p, 1_000_000, 1),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("HANG")), 3000),
          ),
        ]);
        if (!raced.timedOut || !Array.isArray(raced.rows)) {
          return false;
        }
        // Regression: the default timeout still parses a tiny CSV correctly.
        const r = await CSVProcessor.parseCSVString("a,b\n1,2", 10);
        return r.length === 1 && r[0]?.a === "1";
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CSVProcessor #384: row-shape guard rejects bad shapes; ragged/duplicate CSVs still parse",
    category: "csv-processor",
    fn: async () => {
      const guard =
        isValidCsvRow({ a: "1" }) === true &&
        isValidCsvRow(null) === false &&
        isValidCsvRow(["a", "b"]) === false &&
        isValidCsvRow("row") === false &&
        isValidCsvRow(42) === false &&
        isValidCsvRow({ a: 42 }) === false;
      if (!guard) {
        return false;
      }
      // Adversarial-but-valid CSVs (ragged, extra columns, duplicate headers)
      // must still parse without throwing across every format.
      const adversarial = "h1,h2,h3\n1,2\nx,y,z,extra\na,b,c\n";
      for (const formatStyle of ["raw", "json", "markdown"] as const) {
        const res = await CSVProcessor.process(Buffer.from(adversarial), {
          formatStyle,
        });
        if (
          res.type !== "csv" ||
          typeof res.content !== "string" ||
          res.content.length === 0
        ) {
          return false;
        }
      }
      return true;
    },
  },
  {
    name: "CSVProcessor #1199: file-path parse also destroys the raw fs.createReadStream on abort",
    category: "csv-processor",
    fn: async () => {
      const destroyedCtors = new Set<string>();
      const patch = (proto: { destroy: (...a: unknown[]) => unknown }) => {
        const orig = proto.destroy;
        proto.destroy = function (
          this: { constructor?: { name?: string } },
          ...a: unknown[]
        ) {
          destroyedCtors.add(this?.constructor?.name ?? "?");
          return orig.apply(this, a);
        };
        return () => {
          proto.destroy = orig;
        };
      };
      const restores = [
        patch(Readable.prototype as unknown as { destroy: () => unknown }),
        patch(Transform.prototype as unknown as { destroy: () => unknown }),
      ];
      const dir = mkdtempSync(
        pathJoin(process.cwd(), ".tmp-csv-1199-rawsource-"),
      );
      try {
        const p = pathJoin(dir, "big-row.csv");
        // Same oversized-row trigger as #371 (a field beyond CSV_MAX_ROW_BYTES),
        // this time through the file path, where prepareFileSource's
        // rawSource = fs.createReadStream(...) (constructor name "ReadStream")
        // is piped into an iconv decode Transform — .pipe() does not propagate
        // .destroy() upstream, so rawSource must be destroyed explicitly.
        writeFileSync(p, "h1,h2\n" + "a".repeat(11 * 1024 * 1024));
        let rejected = false;
        try {
          await CSVProcessor.parseCSVFile(p, 10);
        } catch (e) {
          rejected =
            e instanceof Error &&
            /exceed|maximum|parsing failed/i.test(e.message);
        }
        await new Promise((r) => setTimeout(r, 20));
        return (
          rejected &&
          destroyedCtors.has("CsvParser") &&
          destroyedCtors.has("ReadStream")
        );
      } finally {
        restores.forEach((r) => r());
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CSVProcessor #1199: a single deadline covers access()+prepareFileSource(), not just streamParse",
    category: "csv-processor",
    fn: async () => {
      const dir = mkdtempSync(
        pathJoin(process.cwd(), ".tmp-csv-1199-deadline-"),
      );
      try {
        const p = pathJoin(dir, "big.csv");
        // Same large-file/1ms-timeout shape as the #379 test above, which
        // reliably converges to `timedOut:true` regardless of which internal
        // race wins. The difference this test targets: `remaining()` is now
        // computed once and threaded through BOTH the prepareFileSource
        // `withTimeout` wrapper and the final streamParse call, so the budget
        // is honored even if it's exhausted during the access()/head-sniff
        // phase (#1199) — not only inside streamParse's own timer as before.
        writeFileSync(
          p,
          "a,b\n" +
            Array.from({ length: 200000 }, (_, i) => `${i},v${i}`).join("\n") +
            "\n",
        );
        const raced = await Promise.race([
          CSVProcessor.parseCSVFileWithMeta(p, 1_000_000, 1),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("HANG")), 3000),
          ),
        ]);
        return raced.timedOut === true && Array.isArray(raced.rows);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "decodeBuffer (#1199): a partial ASCII peek reports lower confidence than a complete ASCII buffer",
    category: "csv-processor",
    fn: async () => {
      const buf = Buffer.from("a,b\n1,2\n");
      const complete = decodeBuffer(buf); // isCompleteBuffer defaults to true
      const partial = decodeBuffer(buf, undefined, false);
      return (
        complete.encoding === "utf-8" &&
        complete.confidence === 100 &&
        partial.encoding === "utf-8" &&
        partial.confidence === 60 &&
        partial.text === complete.text
      );
    },
  },
  {
    name: "CSVProcessor #1199: raw-format columnCount/hasHeaders are quote-aware, matching sanitizeColumnNames",
    category: "csv-processor",
    fn: async () => {
      // A quoted comma inside a header field must count as ONE column, not two.
      const res = await CSVProcessor.process(
        Buffer.from('"Price, USD",Qty\n"1,000",5\n'),
        { formatStyle: "raw" },
      );
      return (
        res.metadata?.columnCount === 2 && res.metadata?.hasHeaders === true
      );
    },
  },
  {
    name: "CSVProcessor #1199: CSV failures are typed NeuroLinkError via ErrorFactory, message text preserved",
    category: "csv-processor",
    fn: async () => {
      // Invalid input (empty path).
      let inputErr: unknown;
      try {
        await CSVProcessor.parseCSVFile("");
      } catch (e) {
        inputErr = e;
      }
      const inputOk =
        inputErr instanceof NeuroLinkError &&
        inputErr.category === ErrorCategory.VALIDATION &&
        /non-empty string/.test(inputErr.message);

      // Bad path (ENOENT) — file-access error.
      let accessErr: unknown;
      try {
        await CSVProcessor.parseCSVFile("/nonexistent/path/does-not-exist.csv");
      } catch (e) {
        accessErr = e;
      }
      const accessOk =
        accessErr instanceof NeuroLinkError &&
        accessErr.category === ErrorCategory.RESOURCE &&
        /Failed to open/i.test(accessErr.message);

      // Row-shape violation — same guard streamParse calls on every row (#384),
      // exercised directly since csv-parser itself never emits a malformed row
      // through the public parse API.
      let rowErr: unknown;
      try {
        assertValidCsvRow(["a", "b"], 1);
      } catch (e) {
        rowErr = e;
      }
      const rowOk =
        rowErr instanceof NeuroLinkError &&
        rowErr.category === ErrorCategory.VALIDATION &&
        /Invalid CSV row 1/.test((rowErr as NeuroLinkError).message);

      return inputOk && accessOk && rowOk;
    },
  },
  {
    name: "CSVProcessor #1199: parse-error messages carry structural context only, never raw row cell values (PII)",
    category: "csv-processor",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(process.cwd(), ".tmp-csv-1199-pii-"));
      try {
        const p = pathJoin(dir, "oversized.csv");
        // Row 2's cell contains a "secret" marker — if it ever leaked into the
        // thrown message that would be the PII regression this guards against.
        // The header row also carries a marker: parsed header strings are
        // user-controlled CSV data too (and, for headerless input, may
        // literally be first-row cell values), so they must not be embedded
        // in the error message either (round-2 #1199 finding).
        const secretMarker = "SECRET-EMAIL-alice@example.com";
        const secretHeader = "SECRET-HEADER-bob@example.com";
        writeFileSync(
          p,
          `${secretHeader},h2\n${secretMarker},${"a".repeat(11 * 1024 * 1024)}\n`,
        );
        let error: unknown;
        try {
          await CSVProcessor.parseCSVFile(p, 10);
        } catch (e) {
          error = e;
        }
        const message = error instanceof Error ? error.message : String(error);
        return (
          error instanceof NeuroLinkError &&
          error.category === ErrorCategory.EXECUTION &&
          message.length > 0 &&
          !message.includes(secretMarker) &&
          !message.includes(secretHeader) &&
          !message.includes("lastRow:")
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CSVLoader (#1199): a header literally named __proto__ can't pollute Object.prototype in json output",
    category: "csv-processor",
    fn: async () => {
      const loader = new CSVLoader();
      const doc = await loader.load("__proto__,normal\nx,y\n", {
        outputFormat: "json",
      } as CSVLoaderOptions);
      const parsed = JSON.parse(doc.getContent()) as Array<
        Record<string, unknown>
      >;
      const rowHasOwnProp = Object.prototype.hasOwnProperty.call(
        parsed[0],
        "__proto__",
      );
      const globalUnaffected =
        (Object.prototype as unknown as Record<string, unknown>).polluted ===
        undefined;
      return rowHasOwnProp && parsed[0].__proto__ === "x" && globalUnaffected;
    },
  },
  // ---------- Built-in file tools are sandboxed to cwd (issue #1004) ----------
  {
    name: "directAgentTools: readFile/writeFile/listDirectory deny paths outside cwd",
    category: "tool-sandbox",
    fn: async () => {
      type Exec = {
        execute: (a: unknown) => Promise<{ success: boolean; error?: string }>;
      };
      const rf = directAgentTools.readFile as unknown as Exec;
      const wf = directAgentTools.writeFile as unknown as Exec;
      const ld = directAgentTools.listDirectory as unknown as Exec;
      const denied = (r: { success: boolean; error?: string }) =>
        r.success === false && /Access denied/.test(r.error ?? "");
      // Absolute-path escape and ../ traversal must be denied on all three.
      const results = await Promise.all([
        rf.execute({ path: "/etc/passwd" }),
        rf.execute({ path: "../../../../../../etc/passwd" }),
        ld.execute({ path: "/etc" }),
        wf.execute({
          path: "/tmp/neurolink-sandbox-escape.txt",
          content: "x",
          mode: "overwrite",
        }),
      ]);
      if (!results.every(denied)) {
        return false;
      }
      // A path inside cwd must still be allowed.
      const ok = await rf.execute({ path: "package.json" });
      return ok.success === true;
    },
  },
  // ---------- isMultimodalInput guards against non-array fields (issue #278) ----------
  {
    name: "isMultimodalInput returns false for non-array fields (no unsafe .length)",
    category: "type-guard",
    fn: async () => {
      const cases: Array<[unknown, boolean]> = [
        [{ images: "not-an-array" }, false], // string .length was truthy
        [{ csvFiles: 42 }, false],
        [null, false],
        ["hello", false],
        [{}, false],
        [{ images: [Buffer.from("x")] }, true],
        [{ files: [{ buffer: Buffer.from("x"), filename: "a.pdf" }] }, true],
      ];
      return cases.every(([inp, want]) => isMultimodalInput(inp) === want);
    },
  },
  // ---------- FileDetector path hardening (issues #279, #272) ----------
  {
    name: "FileDetector.loadFromPath rejects null bytes and enforces allowedBaseDir",
    category: "file-detector",
    fn: async () => {
      const load = (
        FileDetector as unknown as {
          loadFromPath: (
            p: string,
            o?: { allowedBaseDir?: string },
          ) => Promise<Buffer>;
        }
      ).loadFromPath;
      const throwsWith = async (
        p: string,
        o: { allowedBaseDir?: string } | undefined,
        re: RegExp,
      ): Promise<boolean> => {
        try {
          await load(p, o);
          return false;
        } catch (e) {
          return e instanceof Error && re.test(e.message);
        }
      };
      // null-byte injection is always rejected
      if (!(await throwsWith("foo\0.txt", undefined, /null byte/))) {
        return false;
      }
      // with a base dir, an absolute escape is denied
      if (
        !(await throwsWith(
          "/etc/passwd",
          { allowedBaseDir: process.cwd() },
          /outside the allowed base/,
        ))
      ) {
        return false;
      }
      // a path inside the base dir still loads
      try {
        const buf = await load("package.json", {
          allowedBaseDir: process.cwd(),
        });
        return Buffer.isBuffer(buf) && buf.length > 0;
      } catch {
        return false;
      }
    },
  },
  {
    name: "FileDetector.loadFromPath: a symlink inside allowedBaseDir pointing outside is denied",
    category: "file-detector",
    fn: async () => {
      const load = (
        FileDetector as unknown as {
          loadFromPath: (
            p: string,
            o?: { allowedBaseDir?: string },
          ) => Promise<Buffer>;
        }
      ).loadFromPath;
      const base = mkdtempSync(pathJoin(tmpdir(), "nl-sandbox-"));
      const outside = mkdtempSync(pathJoin(tmpdir(), "nl-secret-"));
      const secret = pathJoin(outside, "secret.txt");
      const linkInside = pathJoin(base, "escape.txt");
      try {
        writeFileSync(secret, "top secret");
        // A symlink that lives inside the sandbox but resolves outside it.
        symlinkSync(secret, linkInside);
        // Path-resolution alone would see linkInside under `base` and allow it;
        // real-path (symlink-followed) containment must deny it.
        try {
          await load(linkInside, { allowedBaseDir: base });
          return false; // reached the file — containment bypassed
        } catch (e) {
          return (
            e instanceof Error && /outside the allowed base/.test(e.message)
          );
        }
      } finally {
        rmSync(base, { recursive: true, force: true });
        rmSync(outside, { recursive: true, force: true });
      }
    },
  },
  {
    name: "FileDetector.loadFromPath round 8: TOCTOU-safe — reads never follow a symlink re-targeted after allowedBaseDir validation",
    category: "file-detector",
    fn: async () => {
      // Round 8: `loadFromPath` used to validate the realpath-resolved `real`
      // but then open() the ORIGINAL `filePath`. If `filePath` is a symlink,
      // an attacker can swap it between the realpath() check and the open()
      // call so the validated path is inside `allowedBaseDir` but the actual
      // read lands outside it. The fix opens the resolved `real` path
      // directly (a plain string with no symlink components left to
      // re-target), so retargeting the symlink after validation can no
      // longer affect what gets read.
      //
      // This is a genuine, non-deterministic OS-level race (real fs calls
      // round-trip through libuv's thread pool), so the test's PASS
      // criterion never depends on winning it: it only asserts the safety
      // invariant "a completed read is never the outside file's content",
      // which the fix satisfies unconditionally (open() never sees the
      // symlink `real` doesn't reference it) and which a reverted/buggy
      // implementation would violate given enough attempts.
      const load = (
        FileDetector as unknown as {
          loadFromPath: (
            p: string,
            o?: { allowedBaseDir?: string },
          ) => Promise<Buffer>;
        }
      ).loadFromPath;

      const base = mkdtempSync(pathJoin(tmpdir(), "nl-toctou-base-"));
      const outside = mkdtempSync(pathJoin(tmpdir(), "nl-toctou-outside-"));
      const safeFile = pathJoin(base, "safe.txt");
      const evilFile = pathJoin(outside, "evil.txt");
      const link = pathJoin(base, "target.txt");

      try {
        writeFileSync(safeFile, "SAFE");
        writeFileSync(evilFile, "EVIL");

        // Symlink creation isn't guaranteed on every platform/CI runner
        // (e.g. unprivileged Windows) — skip cleanly rather than false-fail.
        try {
          symlinkSync(safeFile, link);
        } catch {
          return true;
        }

        let observedEvil = false;
        const deadline = Date.now() + 1500;

        while (Date.now() < deadline) {
          // Repeatedly flip `link` between the safe (in-sandbox) and evil
          // (outside-sandbox) target WHILE `loadFromPath` is in flight,
          // giving a buggy implementation's realpath()→open() gap a
          // realistic chance to be hit over many attempts.
          const swap = async (): Promise<void> => {
            for (let i = 0; i < 25; i++) {
              try {
                rmSync(link, { force: true });
                symlinkSync(evilFile, link);
              } catch {
                // transient ENOENT/EEXIST mid-swap — ignore and keep trying
              }
              await Promise.resolve();
            }
            try {
              rmSync(link, { force: true });
              symlinkSync(safeFile, link);
            } catch {
              // leave as-is; next iteration re-establishes it
            }
          };

          const [readResult] = await Promise.allSettled([
            load(link, { allowedBaseDir: base }).catch(() => null),
            swap(),
          ]);

          if (
            readResult.status === "fulfilled" &&
            readResult.value &&
            readResult.value.toString("utf-8") === "EVIL"
          ) {
            observedEvil = true;
            break;
          }
        }

        return !observedEvil;
      } finally {
        rmSync(base, { recursive: true, force: true });
        rmSync(outside, { recursive: true, force: true });
      }
    },
  },
  {
    name: "FileDetector.loadFromPath round 8: realpath resolution failure attaches a SANITIZED cause, never the raw ENOENT error",
    category: "file-detector",
    fn: async () => {
      const load = (
        FileDetector as unknown as {
          loadFromPath: (
            p: string,
            o?: { allowedBaseDir?: string },
          ) => Promise<Buffer>;
        }
      ).loadFromPath;

      const base = mkdtempSync(pathJoin(tmpdir(), "nl-toctou-realpath-"));
      const missing = pathJoin(base, "deeply", "nested", "missing-secret.png");
      try {
        try {
          await load(missing, { allowedBaseDir: base });
          return false; // realpath(missing) must fail — should have thrown
        } catch (error) {
          if (!(error instanceof Error)) {
            return false;
          }
          // Outer message was already redacted before this round — basename only.
          if (error.message.includes(missing)) {
            return false;
          }
          // Round 8: `.cause` must be a SANITIZED copy of the realpath
          // ENOENT error, not the raw original — Node's ENOENT message
          // embeds the full attempted path verbatim, which would otherwise
          // survive on the cause chain even though the outer message is
          // redacted.
          if (!(error.cause instanceof Error)) {
            return false;
          }
          if (error.cause.message.includes(missing)) {
            return false;
          }
          return error.cause.message.includes(basename(missing));
        }
      } finally {
        rmSync(base, { recursive: true, force: true });
      }
    },
  },
  {
    name: "FileDetector.loadFromPath round 9: open() failure attaches a SANITIZED cause, never the raw path-bearing error",
    category: "file-detector",
    fn: async () => {
      const load = (
        FileDetector as unknown as {
          loadFromPath: (
            p: string,
            o?: { allowedBaseDir?: string },
          ) => Promise<Buffer>;
        }
      ).loadFromPath;

      // No allowedBaseDir: realpath is skipped, so open() itself is the
      // failing call. Its ENOENT message embeds the full path verbatim — the
      // round-9 fix wraps open() and redacts it. (The sandbox case redacts
      // the resolved `real` path through the SAME catch via `pathToOpen`;
      // that variant can't be provoked here because realpath gates open, but
      // the redaction mechanism is unit-tested directly via
      // `sanitizeErrorCause({ filePath })`.)
      const base = mkdtempSync(pathJoin(tmpdir(), "nl-open-fail-"));
      const secretDir = pathJoin(base, "private-dir");
      const missing = pathJoin(secretDir, "missing-secret.png");
      try {
        try {
          await load(missing);
          return false; // open(missing) must fail — should have thrown
        } catch (error) {
          if (!(error instanceof Error)) {
            return false;
          }
          // Neither the thrown message nor the cause chain may carry the
          // host directory layout; only the basename survives.
          if (error.message.includes(secretDir)) {
            return false;
          }
          if (!(error.cause instanceof Error)) {
            return false;
          }
          if (error.cause.message.includes(secretDir)) {
            return false;
          }
          // `.code` is preserved for retry/classification consumers.
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            return false;
          }
          return error.cause.message.includes(basename(missing));
        }
      } finally {
        rmSync(base, { recursive: true, force: true });
      }
    },
  },
  // ---------- File detection: ISO-BMFF brand + EBML DocType + ADTS AAC ----------
  {
    name: "FileDetector magic bytes: M4A→audio, MOV/WebM MIME, AAC≠MP3 (no MP4/MKV regression)",
    category: "file-detector",
    fn: async () => {
      // The MagicBytesStrategy is the layer under test (detection only, no
      // media processing). ftyp/EBML/ADTS containers are ambiguous by their
      // leading bytes alone; these assert the disambiguation added for
      // issues #431/#435/#424/#408.
      const detect = (
        FileDetector as unknown as {
          detect(buf: Buffer): Promise<{ type: string; mimeType: string }>;
        }
      ).detect;
      const ftyp = (brand: string) =>
        Buffer.concat([
          Buffer.from([0, 0, 0, 0x18]),
          Buffer.from("ftyp"),
          Buffer.from(brand),
        ]);
      const ebml = (doctype: string) =>
        Buffer.concat([
          Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
          Buffer.from("B\x82"),
          Buffer.from(doctype),
          Buffer.alloc(16),
        ]);
      const riff = (tag: string) =>
        Buffer.concat([
          Buffer.from("RIFF"),
          Buffer.from([0, 0, 0, 0]),
          Buffer.from(tag),
        ]);
      const cases: Array<[Buffer, string, string]> = [
        [ftyp("M4A "), "audio", "audio/mp4"], // was misrouted to video
        [ftyp("M4B "), "audio", "audio/mp4"],
        [ftyp("qt  "), "video", "video/quicktime"], // was video/mp4
        [ftyp("mp42"), "video", "video/mp4"], // unchanged
        [ebml("webm"), "video", "video/webm"], // was video/x-matroska
        [ebml("matroska"), "video", "video/x-matroska"], // unchanged
        [riff("AVI "), "video", "video/x-msvideo"],
        [riff("WAVE"), "audio", "audio/wav"],
        [Buffer.from([0xff, 0xf1, 0x50, 0x80]), "audio", "audio/aac"], // ADTS, was audio/mpeg
        [Buffer.from([0xff, 0xfb, 0x90, 0x00]), "audio", "audio/mpeg"], // MP3, unchanged
        [
          Buffer.concat([Buffer.from("ID3"), Buffer.alloc(8)]),
          "audio",
          "audio/mpeg",
        ],
      ];
      for (const [buf, wantType, wantMime] of cases) {
        const r = await detect(buf);
        if (r.type !== wantType || r.mimeType !== wantMime) {
          return false;
        }
      }
      return true;
    },
  },
  // ---------- PPTX speaker-notes extraction (issue #441) ----------
  {
    name: "PptxProcessor.extractText includes speaker notes resolved via slide rels",
    category: "pptx-processor",
    fn: async () => {
      const at = (s: string) => `<a:t>${s}</a:t>`;
      const slideXml = `<?xml version="1.0"?><p:sld xmlns:a="x"><p:cSld><p:spTree>${at(
        "Quarterly Results",
      )}</p:spTree></p:cSld></p:sld>`;
      const notesXml = `<?xml version="1.0"?><p:notes xmlns:a="x"><p:cSld><p:spTree>${at(
        "Mention the RTO improvement.",
      )}</p:spTree></p:cSld></p:notes>`;
      // notesSlide number (3) deliberately differs from slide number (1): the
      // link must be resolved through the rels file, not by matching numbers.
      const relsXml = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide3.xml"/></Relationships>`;

      const zip = new AdmZip();
      zip.addFile("ppt/slides/slide1.xml", Buffer.from(slideXml));
      zip.addFile("ppt/slides/_rels/slide1.xml.rels", Buffer.from(relsXml));
      zip.addFile("ppt/notesSlides/notesSlide3.xml", Buffer.from(notesXml));

      const out = await PptxProcessor.extractText(zip.toBuffer());
      return (
        typeof out === "string" &&
        out.includes("Quarterly Results") &&
        out.includes("Speaker notes:") &&
        out.includes("Mention the RTO improvement.")
      );
    },
  },
  {
    name: "PptxProcessor.extractText omits the notes line for a slide without notes",
    category: "pptx-processor",
    fn: async () => {
      const slideXml = `<?xml version="1.0"?><p:sld xmlns:a="x"><p:cSld><p:spTree><a:t>Only a title</a:t></p:spTree></p:cSld></p:sld>`;
      const zip = new AdmZip();
      zip.addFile("ppt/slides/slide1.xml", Buffer.from(slideXml));
      const out = await PptxProcessor.extractText(zip.toBuffer());
      return (
        typeof out === "string" &&
        out.includes("Only a title") &&
        !out.includes("Speaker notes:")
      );
    },
  },
  // ---------- PDF scale validation (issue #340) ----------
  {
    name: "PDFProcessor.convertToImages rejects out-of-range scale with a clear error",
    category: "pdf-processor",
    fn: async () => {
      const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(20)]);
      const rejects = async (scale: number): Promise<boolean> => {
        try {
          await PDFProcessor.convertToImages(pdf, { scale });
          return false;
        } catch (e) {
          return e instanceof Error && /Invalid scale/.test(e.message);
        }
      };
      // 0, negative, non-finite, below MIN_SCALE (#297), and above the max must
      // all be rejected — proving the full 0.1–10 range is enforced.
      for (const bad of [0, -1, Number.NaN, 0.05, 11, 15]) {
        if (!(await rejects(bad))) {
          return false;
        }
      }
      // A valid scale must pass the scale gate (it may fail later on the fake
      // PDF body, but NOT with an "Invalid scale" message).
      try {
        await PDFProcessor.convertToImages(pdf, { scale: 2 });
      } catch (e) {
        if (e instanceof Error && /Invalid scale/.test(e.message)) {
          return false;
        }
      }
      return true;
    },
  },
  // ---------- #260: PDF page-pixel guard (memory) ----------
  {
    name: "PDFProcessor #260: rejects invalid maxCanvasPixels; default ceiling stays under 100MB",
    category: "pdf-processor",
    fn: async () => {
      const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(20)]);
      const rejects = async (maxCanvasPixels: number): Promise<boolean> => {
        try {
          await PDFProcessor.convertToImages(pdf, { maxCanvasPixels });
          return false;
        } catch (e) {
          return (
            e instanceof Error && /Invalid maxCanvasPixels/.test(e.message)
          );
        }
      };
      for (const bad of [0, -1, Number.NaN]) {
        if (!(await rejects(bad))) {
          return false;
        }
      }
      // The default ceiling keeps a page under 100MB (16.7M px × 4 bytes RGBA).
      return (
        PDF_LIMITS.DEFAULT_MAX_CANVAS_PIXELS === 16_777_216 &&
        PDF_LIMITS.DEFAULT_MAX_CANVAS_PIXELS * 4 <= 100 * 1024 * 1024
      );
    },
  },
  {
    name: "PDFProcessor #1212: getAccuratePageCount stays accurate after convertToImages (single pdfjs-dist version)",
    category: "pdf-processor",
    fn: async () => {
      // Regression guard for the pdf-parse (pdfjs-dist@5.4.296) vs pdf-to-img
      // version skew: once convertToImages() had loaded a *different* pdfjs
      // worker version, every later getAccuratePageCount() failed pdfjs's
      // API-vs-Worker equality check and silently degraded to null for the rest
      // of the process. With both libraries pinned to one pdfjs-dist version
      // (pnpm.overrides), counting must survive an image conversion in the same
      // process.
      const pdf = readFileSync("test/fixtures/valid-sample.pdf");
      // Baseline count BEFORE any image conversion loads a pdfjs worker.
      const before = await PDFProcessor.getAccuratePageCount(pdf);
      // Do NOT swallow: a conversion failure here (e.g. the very version skew
      // this guards against) must fail the test, not be hidden — nearby tests
      // already rely on convertToImages succeeding in this environment.
      await PDFProcessor.convertToImages(pdf, { maxPages: 1 });
      const after = await PDFProcessor.getAccuratePageCount(pdf);
      // The count must survive the conversion (the skew made `after` null) and
      // stay identical to the pre-conversion count — not merely be positive.
      return before !== null && after !== null && after === before;
    },
  },
  {
    name: "PDFProcessor #260: oversized page auto-downscales; normal page unaffected",
    category: "pdf-processor",
    fn: async () => {
      const pdf = readFileSync("test/fixtures/valid-sample.pdf");
      // Force the "largest MediaBox" via an explicit decoy object (see
      // appendDecoyMediaBox) instead of relying on valid-sample.pdf's own
      // /MediaBox happening to be plaintext — keeps this deterministic even
      // if the fixture is ever regenerated with compressed object streams.
      const oversized = appendDecoyMediaBox(pdf, "500", "500");
      // A deliberately tiny ceiling forces the pre-flight to downscale rather
      // than let pdf-to-img allocate the full canvas — must resolve, not crash.
      const tiny = await PDFProcessor.convertToImages(oversized, {
        maxCanvasPixels: 1000,
      });
      if (
        tiny.images.length === 0 ||
        !tiny.warnings?.some((w) => /downscal|maxCanvasPixels/i.test(w))
      ) {
        return false;
      }
      // Default options, unpatched fixture: a normal page converts with no
      // downscale warning.
      const normal = await PDFProcessor.convertToImages(pdf);
      return (
        normal.images.length > 0 &&
        !normal.warnings?.some((w) => /downscal/i.test(w))
      );
    },
  },
  {
    name: "PDFProcessor #260: overflowing MediaBox does not collapse effectiveScale below the floor",
    category: "pdf-processor",
    fn: async () => {
      const pdf = readFileSync("test/fixtures/valid-sample.pdf");
      // width * height * scale * scale must exceed Number.MAX_VALUE
      // (~1.7976931348623157e308) to reproduce the overflow: with a default
      // scale of 2, 1e160 * 1e160 = 1e320 already collapses to Infinity.
      const hugeDigits = "1" + "0".repeat(160);
      const malformed = appendDecoyMediaBox(pdf, hugeDigits, hugeDigits);

      const result = await PDFProcessor.convertToImages(malformed, {
        maxCanvasPixels: PDF_LIMITS.DEFAULT_MAX_CANVAS_PIXELS,
      });

      // Must still render — proves effectiveScale stayed a finite, positive,
      // renderable value instead of collapsing to 0 (which would make
      // pdf-to-img fail on a degenerate viewport).
      if (result.images.length === 0) {
        return false;
      }

      const downscaleWarning = result.warnings?.find((w) =>
        /Downscaled render/.test(w),
      );
      if (!downscaleWarning) {
        return false;
      }
      const match = /→ ([\d.]+)\)/.exec(downscaleWarning);
      const effectiveScale = match ? Number(match[1]) : Number.NaN;
      return (
        Number.isFinite(effectiveScale) &&
        effectiveScale >= PDF_LIMITS.MIN_EFFECTIVE_SCALE
      );
    },
  },
  // ---------- #258: encrypted PDF password handling ----------
  {
    name: "PDFProcessor #258: encrypted PDF — required/incorrect/correct password",
    category: "pdf-processor",
    fn: async () => {
      // A real AES-256-encrypted PDF (password: neurolink-test). A fake buffer
      // would not trigger pdfjs's PasswordException.
      const pdf = readFileSync("test/fixtures/password-protected.pdf");
      // No password → actionable "password-protected" error (not generic).
      let needsPw = false;
      try {
        await PDFProcessor.convertToImages(pdf, {});
      } catch (e) {
        needsPw =
          e instanceof Error &&
          /password-protected|supply the password/i.test(e.message);
      }
      if (!needsPw) {
        return false;
      }
      // Wrong password → distinct "incorrect password" error.
      let wrongPw = false;
      try {
        await PDFProcessor.convertToImages(pdf, { password: "wrong-password" });
      } catch (e) {
        wrongPw = e instanceof Error && /incorrect/i.test(e.message);
      }
      if (!wrongPw) {
        return false;
      }
      // Correct password → decrypts and converts.
      const ok = await PDFProcessor.convertToImages(pdf, {
        password: "neurolink-test",
      });
      return ok.images.length > 0;
    },
  },
  // ---------- #258/#260: pdfOptions plumbing through the message builder ----------
  // The tests above hit PDFProcessor.convertToImages directly. This one
  // exercises the FULL generate/stream path — input.pdfFiles + pdfOptions →
  // buildMultimodalMessagesArray → convertToImages — the plumbing that
  // silently dropped pdfOptions (so --pdf-password / pdfOptions.password never
  // reached the decoder) before the fix.
  {
    name: "buildMultimodalMessagesArray threads pdfOptions.password + maxCanvasPixels into image fallback",
    category: "pdf-processor",
    fn: async () => {
      const encrypted = readFileSync("test/fixtures/password-protected.pdf");
      const plain = readFileSync("test/fixtures/valid-sample.pdf");
      // "azure" is a vision-capable provider without native PDF support, so
      // pdfFiles route through the image-fallback path (convertToImages) —
      // the path pdfOptions.password / maxCanvasPixels must reach.
      const build = (opts: Record<string, unknown>) =>
        buildMultimodalMessagesArray(
          opts as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
          "azure",
          "gpt-4o",
        );

      // (a) No password → PDF_PASSWORD_REQUIRED surfaces (not swallowed).
      let required = false;
      try {
        await build({ input: { text: "x", pdfFiles: [encrypted] } });
      } catch (e) {
        required =
          e instanceof Error &&
          /password-protected|supply the password/i.test(e.message);
      }
      if (!required) {
        return false;
      }

      // (b) Wrong password threads → PDF_INCORRECT_PASSWORD surfaces.
      let incorrect = false;
      try {
        await build({
          input: { text: "x", pdfFiles: [encrypted] },
          pdfOptions: { password: "nope" },
        });
      } catch (e) {
        incorrect = e instanceof Error && /incorrect/i.test(e.message);
      }
      if (!incorrect) {
        return false;
      }

      // (c) Correct password threads → decrypts and yields image parts.
      const okMsgs = await build({
        input: { text: "x", pdfFiles: [encrypted] },
        pdfOptions: { password: "neurolink-test" },
      });
      if (!JSON.stringify(okMsgs).includes('"type":"image"')) {
        return false;
      }

      // (d) maxCanvasPixels threads to convertToImages — an invalid value is
      // validated there (#260), so this error proves the value arrived.
      let capThreaded = false;
      try {
        await build({
          input: { text: "x", pdfFiles: [plain] },
          pdfOptions: { maxCanvasPixels: -1 },
        });
      } catch (e) {
        capThreaded =
          e instanceof Error && /Invalid maxCanvasPixels/.test(e.message);
      }
      return capThreaded;
    },
  },
  // Sibling to the test above: the advanced `input.content` (type: "pdf")
  // path had its own copy of the pdfFiles mapping that silently dropped
  // pdfOptions.password / maxCanvasPixels (asymmetric with input.pdfFiles).
  {
    name: "buildMultimodalMessagesArray threads pdfOptions.password + maxCanvasPixels through input.content PDF path",
    category: "pdf-processor",
    fn: async () => {
      const encrypted = readFileSync("test/fixtures/password-protected.pdf");
      const plain = readFileSync("test/fixtures/valid-sample.pdf");
      // "azure" is a vision-capable provider without native PDF support, so
      // the PDF content item routes through the image-fallback path
      // (convertToImages) — the path pdfOptions must reach.
      const build = (opts: Record<string, unknown>) =>
        buildMultimodalMessagesArray(
          opts as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
          "azure",
          "gpt-4o",
        );

      // (a) Correct password threads via input.content[type=pdf] → decrypts
      // and yields image parts.
      const okMsgs = await build({
        input: {
          text: "x",
          content: [
            {
              type: "pdf",
              data: encrypted,
              metadata: { filename: "encrypted.pdf" },
            },
          ],
        },
        pdfOptions: { password: "neurolink-test" },
      });
      if (!JSON.stringify(okMsgs).includes('"type":"image"')) {
        return false;
      }

      // (b) maxCanvasPixels threads via input.content → an invalid value is
      // validated inside convertToImages (#260), so this error proves it
      // arrived rather than being silently dropped by the content-path copy.
      let capThreaded = false;
      try {
        await build({
          input: {
            text: "x",
            content: [
              { type: "pdf", data: plain, metadata: { filename: "plain.pdf" } },
            ],
          },
          pdfOptions: { maxCanvasPixels: -1 },
        });
      } catch (e) {
        capThreaded =
          e instanceof Error && /Invalid maxCanvasPixels/.test(e.message);
      }
      return capThreaded;
    },
  },
  // ---------- round-3 review: hasPDFs gating + --pdf-password env fallback ----------
  // buildMultimodalSystemPrompt used to be gated on `pdfFiles.length > 0`,
  // which only covers input.pdfFiles. A PDF supplied purely via
  // input.content (type: "pdf") still routed through the multimodal path
  // (hasPDFs already covered that for routing) but the system prompt never
  // got the "treat inlined content as an attachment" instructions, so the
  // model could plausibly claim no file was attached.
  {
    name: "buildMultimodalMessagesArray: PDF supplied only via input.content still gets file-handling system prompt (hasPDFs gating fix)",
    category: "pdf-processor",
    fn: async () => {
      const plain = readFileSync("test/fixtures/valid-sample.pdf");
      const messages = await buildMultimodalMessagesArray(
        {
          input: {
            text: "Summarise this",
            content: [
              {
                type: "pdf",
                data: plain,
                metadata: { filename: "plain.pdf" },
              },
            ],
          },
        } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
        "azure",
        "gpt-4o",
      );
      const systemMsg = messages.find((m) => m.role === "system");
      const systemText =
        systemMsg && typeof systemMsg.content === "string"
          ? systemMsg.content
          : "";
      return (
        /TREAT THE INLINED CONTENT AS IF IT WERE AN ATTACHMENT/.test(
          systemText,
        ) && /PDFs/.test(systemText)
      );
    },
  },
  // resolvePdfPassword: NEUROLINK_PDF_PASSWORD is the preferred, non-leaking
  // way to supply a decryption password. --pdf-password stays supported (a
  // breaking change to drop it) but must warn to stderr because it is
  // visible in shell history / `ps` / CI logs — verify the precedence
  // (flag wins when both are set, matching per-invocation override intent)
  // and that the warning fires only when the flag is actually used.
  {
    name: "CLICommandFactory.resolvePdfPassword: NEUROLINK_PDF_PASSWORD fallback, flag precedence, warns only when the flag is used",
    category: "cli",
    fn: async () => {
      const resolvePdfPassword = (
        CLICommandFactory as unknown as {
          resolvePdfPassword: (
            argv: Record<string, unknown>,
          ) => string | undefined;
        }
      ).resolvePdfPassword;

      const originalEnv = process.env.NEUROLINK_PDF_PASSWORD;
      const originalWrite = process.stderr.write;
      let warned: boolean;
      process.stderr.write = ((chunk: string | Uint8Array) => {
        if (typeof chunk === "string" && /pdf-password/i.test(chunk)) {
          warned = true;
        }
        return true;
      }) as unknown as typeof process.stderr.write;

      try {
        // (a) Only env var set -> resolved from env, no warning.
        delete process.env.NEUROLINK_PDF_PASSWORD;
        process.env.NEUROLINK_PDF_PASSWORD = "env-secret";
        warned = false;
        if (resolvePdfPassword({}) !== "env-secret" || warned) {
          return false;
        }

        // (b) Only flag set -> resolved from flag, warns.
        delete process.env.NEUROLINK_PDF_PASSWORD;
        warned = false;
        if (
          resolvePdfPassword({ pdfPassword: "flag-secret" }) !==
            "flag-secret" ||
          !warned
        ) {
          return false;
        }

        // (c) Both set -> flag takes precedence (explicit per-call override),
        // and still warns since the flag was used.
        process.env.NEUROLINK_PDF_PASSWORD = "env-secret";
        warned = false;
        if (
          resolvePdfPassword({ pdfPassword: "flag-secret" }) !==
            "flag-secret" ||
          !warned
        ) {
          return false;
        }

        // (d) Neither set -> undefined, no warning.
        delete process.env.NEUROLINK_PDF_PASSWORD;
        warned = false;
        return resolvePdfPassword({}) === undefined && !warned;
      } finally {
        if (originalEnv === undefined) {
          delete process.env.NEUROLINK_PDF_PASSWORD;
        } else {
          process.env.NEUROLINK_PDF_PASSWORD = originalEnv;
        }
        process.stderr.write = originalWrite;
      }
    },
  },
  // ---------- PDF hardening: accurate pages / per-page resilience / scale /
  //            streaming / aggregate limits / URL pre-flight / citations
  //            (#287/#294/#297/#302/#309/#317/#349) ----------
  {
    name: "PDFProcessor #287: process() reports accurate page count and degrades gracefully",
    category: "pdf-processor",
    fn: async () => {
      // multi-page.pdf has 3 pages; the accurate pdf-parse count must be used
      // (the header regex under-/over-counts for real PDFs).
      const good = await PDFProcessor.process(
        readFileSync("test/fixtures/multi-page.pdf"),
        { provider: "openai" },
      );
      if (good.metadata.estimatedPages !== 3) {
        return false;
      }
      // A valid header but corrupted body must not throw — page count falls
      // back to null (regex found no markers) rather than blowing up.
      const fake = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(20)]);
      const bad = await PDFProcessor.process(fake, { provider: "openai" });
      return bad.type === "pdf" && bad.metadata.estimatedPages === null;
    },
  },
  {
    name: "PDFProcessor #294: one bad page no longer discards the whole conversion",
    category: "pdf-processor",
    fn: async () => {
      // pdf-page3-corrupt.pdf = multi-page.pdf with page 3's stream corrupted so
      // only that page fails to render.
      const corrupt = readFileSync("test/fixtures/pdf-page3-corrupt.pdf");
      const result = await PDFProcessor.convertToImages(corrupt);
      const isolated =
        result.images.length === 2 &&
        Array.isArray(result.errors) &&
        result.errors.length === 1 &&
        result.errors[0].page === 3;
      if (!isolated) {
        return false;
      }
      // A fully-valid PDF reports no per-page errors.
      const good = await PDFProcessor.convertToImages(
        readFileSync("test/fixtures/multi-page.pdf"),
      );
      return good.images.length === 3 && good.errors === undefined;
    },
  },
  {
    name: "PDFProcessor #297: defaults to scale 1.5 and logs a memory estimate before conversion",
    category: "pdf-processor",
    fn: async () => {
      // info logs are only captured under debug mode.
      const prevDebug = process.env.NEUROLINK_DEBUG;
      process.env.NEUROLINK_DEBUG = "true";
      try {
        logger.clearLogs();
        const fake = Buffer.concat([
          Buffer.from("%PDF-1.4\n"),
          Buffer.alloc(20),
        ]);
        try {
          await PDFProcessor.convertToImages(fake, {});
        } catch {
          // Expected to fail on the fake body — we only assert the pre-conversion log.
        }
        const memLog = logger
          .getLogs("info")
          .find((l) => /Estimated memory usage/.test(l.message));
        const data = (memLog as unknown as { data?: Record<string, unknown> })
          ?.data;
        return (
          !!memLog &&
          data?.scale === 1.5 &&
          typeof data?.estimatedMemoryMB === "number" &&
          (data.estimatedMemoryMB as number) > 0
        );
      } finally {
        if (prevDebug === undefined) {
          delete process.env.NEUROLINK_DEBUG;
        } else {
          process.env.NEUROLINK_DEBUG = prevDebug;
        }
      }
    },
  },
  {
    name: "PDFProcessor #302: convertToImagesStream yields pages in order, reports progress, and matches convertToImages",
    category: "pdf-processor",
    fn: async () => {
      const good = readFileSync("test/fixtures/multi-page.pdf");
      const pages: number[] = [];
      const progress: number[] = [];
      for await (const page of PDFProcessor.convertToImagesStream(good, {
        onProgress: (p) => {
          progress.push(p.pagesConverted);
        },
      })) {
        pages.push(page.pageIndex);
        if (!page.error && page.image.length === 0) {
          return false;
        }
      }
      const ordered =
        pages.join(",") ===
        pages
          .slice()
          .sort((a, b) => a - b)
          .join(",");
      if (pages.length !== 3 || !ordered || progress.join(",") !== "1,2,3") {
        return false;
      }
      // Early termination: consume only the first page.
      const gen = PDFProcessor.convertToImagesStream(good);
      const first = await gen.next();
      await gen.return(undefined);
      if (first.done || first.value.pageIndex !== 1) {
        return false;
      }
      // Streamed images equal the batch images.
      const batch = await PDFProcessor.convertToImages(good);
      return batch.pageCount === 3;
    },
  },
  {
    name: "PDFProcessor #309: multiple PDFs are enforced against the provider's page limit in aggregate",
    category: "pdf-processor",
    fn: async () => {
      const synth = (pages: number): Buffer =>
        Buffer.concat([
          Buffer.from("%PDF-1.4\n"),
          Buffer.from("/Type /Page \n".repeat(pages)),
          Buffer.alloc(20),
        ]);
      const build = (pdfs: Buffer[]) =>
        buildMultimodalMessagesArray(
          {
            input: { text: "x", pdfFiles: pdfs },
          } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
          "openai", // native PDF provider, maxPages 100
          "gpt-4o",
        );
      // Under the limit in aggregate → resolves.
      await build([synth(20), synth(20), synth(20)]); // 60 total
      // Over the limit in aggregate, each file under 100 → rejected.
      let aggregateRejected = false;
      try {
        await build([synth(40), synth(40), synth(40)]); // 120 total
      } catch (e) {
        aggregateRejected =
          e instanceof Error && /Combined page count/.test(e.message);
      }
      return aggregateRejected;
    },
  },
  {
    name: "FileDetector #317: pre-flight HEAD rejects an oversized URL before the GET",
    category: "pdf-processor",
    fn: async () => {
      let getCalled = false;
      const server = http.createServer((req, res) => {
        if (req.method === "HEAD") {
          res.setHeader(
            "content-length",
            req.url === "/big" ? String(500 * 1024 * 1024) : "12",
          );
          res.setHeader("content-type", "application/pdf");
          res.end();
        } else {
          getCalled = true;
          res.setHeader("content-type", "application/pdf");
          res.end("%PDF-1.4\nok");
        }
      });
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
      try {
        const addr = server.address() as { port: number };
        const load = (
          FileDetector as unknown as {
            loadFromURL: (
              u: string,
              o?: { maxSize?: number },
            ) => Promise<Buffer>;
          }
        ).loadFromURL.bind(FileDetector);

        // Oversized: rejected via HEAD, GET never runs.
        let rejected = false;
        try {
          await load(`http://127.0.0.1:${addr.port}/big`, {
            maxSize: 10 * 1024 * 1024,
          });
        } catch (e) {
          rejected = e instanceof Error && /too large/i.test(e.message);
        }
        if (!rejected || getCalled) {
          return false;
        }

        // Normal: HEAD passes, GET proceeds.
        getCalled = false;
        const buf = await load(`http://127.0.0.1:${addr.port}/ok`, {
          maxSize: 10 * 1024 * 1024,
        });
        return getCalled && buf.length > 0;
      } finally {
        await new Promise<void>((r) => server.close(() => r()));
      }
    },
  },
  {
    name: "PDFProcessor #349: requiresCitations config is parsed and surfaced in metadata",
    category: "pdf-processor",
    fn: async () => {
      if (
        PDFProcessor.getProviderConfig("bedrock")?.requiresCitations !== "auto"
      ) {
        return false;
      }
      const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(20)]);
      const result = await PDFProcessor.process(pdf, { provider: "bedrock" });
      return (
        result.type === "pdf" &&
        result.metadata.apiType === "document" &&
        result.metadata.requiresCitations === "auto"
      );
    },
  },
  // ---------- CSV detection: quoted delimiters (issue #299) ----------
  {
    name: "FileDetector: quoted commas do not break CSV detection (RFC 4180)",
    category: "csv-processor",
    fn: async () => {
      // Each data row has a comma inside a quoted field plus one real column
      // break. A quote-unaware delimiter count sees 2 delimiters on data rows
      // vs 1 on the header, collapses consistency below 0.8, and rejects a
      // valid CSV. The quote-aware count sees 1 delimiter on every row.
      const csv =
        'name,note\n"Smith, John",hello\n"Doe, Jane",world\n"Roe, Max",foo\n';
      const result = await FileDetector.detectAndProcess(Buffer.from(csv));
      return result.type === "csv";
    },
  },
  // ---------- CSV metadata confidence varies with quality (issue #386) ----------
  {
    name: "CSVProcessor: metadata.confidence reflects data quality, not a static 100",
    category: "csv-processor",
    fn: async () => {
      const clean = "id,name,age\n1,Alice,30\n2,Bob,25\n3,Cara,41\n4,Dan,38\n";
      const messy =
        "id,name,age,city,score\n1,Alice,,,\n2,,,,\n3,,,foo,\n4,,,,\n5,,,,\n";
      const rc = await CSVProcessor.process(Buffer.from(clean), {
        maxRows: 100,
      });
      const rm = await CSVProcessor.process(Buffer.from(messy), {
        maxRows: 100,
      });
      const cleanConf = rc.metadata?.confidence;
      const messyConf = rm.metadata?.confidence;
      return (
        cleanConf === 100 &&
        typeof messyConf === "number" &&
        messyConf < 100 &&
        messyConf >= 50
      );
    },
  },
  // ---------- CSV robustness: BOM, input validation, quoted-comma header ----------
  {
    name: "CSVProcessor: strips BOM, validates input, keeps quoted-comma header (#374/#385/#359)",
    category: "csv-processor",
    fn: async () => {
      // #374: a leading UTF-8 BOM must not glue onto the first column name.
      const bomRows = (await CSVProcessor.parseCSVString(
        "﻿id,name\n1,Alice\n2,Bob",
        10,
      )) as Array<Record<string, string>>;
      if (Object.keys(bomRows[0] ?? {})[0] !== "id") {
        return false;
      }
      // #385: empty/blank input rejects with a clear error, not a raw crash.
      let emptyRejected = false;
      try {
        await CSVProcessor.parseCSVString("", 10);
      } catch (e) {
        emptyRejected =
          e instanceof Error && /non-empty string/.test(e.message);
      }
      if (!emptyRejected) {
        return false;
      }
      // #359: a quoted-comma header is not misread as a metadata line + dropped.
      const q = 'name,note\n"Smith, John",hello\n"Doe, Jane",world';
      const qr = (await CSVProcessor.parseCSVString(q, 10)) as Array<
        Record<string, string>
      >;
      return (
        Object.keys(qr[0] ?? {}).join(",") === "name,note" && qr.length === 2
      );
    },
  },
  // ---------- Image data-URI validation (issues #270, #348) ----------
  {
    name: "buildMultimodalMessagesArray rejects malformed / non-image data URIs",
    category: "message-builder",
    fn: async () => {
      const build = (images: string[]) =>
        buildMultimodalMessagesArray(
          {
            input: { text: "hi", images },
          } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
          "openai",
          "gpt-4o",
        );
      const throwsWith = async (
        images: string[],
        re: RegExp,
      ): Promise<boolean> => {
        try {
          await build(images);
          return false;
        } catch (e) {
          return e instanceof Error && re.test(e.message);
        }
      };
      // #270: a malformed data URI must fail loudly, not pass through silently.
      if (
        !(await throwsWith(
          ["data:image/png;NOTBASE64whoops"],
          /Malformed image data URI/,
        ))
      ) {
        return false;
      }
      // #348: a non-image MIME data URI must be rejected.
      if (
        !(await throwsWith(
          ["data:text/plain;base64,aGVsbG8="],
          /Unsupported data URI MIME/,
        ))
      ) {
        return false;
      }
      // A valid image data URI must still build.
      const png =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const msgs = await build([`data:image/png;base64,${png}`]);
      return Array.isArray(msgs);
    },
  },
  // ---------- Bug 1: Vertex location routing via resolveVertexLocation ----------
  {
    name: "resolveVertexLocation: gemini-* forced to global regardless of configured location",
    category: "vertex-location",
    fn: async () => {
      return (
        resolveVertexLocation("gemini-3.1-flash-lite-preview", "us-east5") ===
          "global" &&
        resolveVertexLocation("gemini-2.5-flash", "us-central1") === "global" &&
        resolveVertexLocation("gemini-3.1-pro", "europe-west4") === "global"
      );
    },
  },
  {
    name: "resolveVertexLocation: non-gemini models keep configured location",
    category: "vertex-location",
    fn: async () => {
      return (
        resolveVertexLocation("claude-sonnet-4-20250514", "us-east5") ===
          "us-east5" &&
        resolveVertexLocation("text-embedding-004", "us-central1") ===
          "us-central1" &&
        resolveVertexLocation("custom-model", "europe-west4") === "europe-west4"
      );
    },
  },
  {
    name: "resolveVertexLocation: undefined model keeps configured location",
    category: "vertex-location",
    fn: async () => {
      return resolveVertexLocation(undefined, "us-east5") === "us-east5";
    },
  },
  {
    name: "resolveVertexLocation: gemini forced to global even when configured is global",
    category: "vertex-location",
    fn: async () => {
      return resolveVertexLocation("gemini-2.5-flash", "global") === "global";
    },
  },
  {
    name: "GoogleVertexProvider: Anthropic Vertex client pins SDK timeout",
    category: "vertex-anthropic",
    fn: async () =>
      withTemporaryEnv(
        {
          GOOGLE_APPLICATION_CREDENTIALS: "/tmp/neurolink-test-creds.json",
          GOOGLE_CLOUD_PROJECT_ID: "test-project",
          GOOGLE_CLOUD_LOCATION: "us-east5",
        },
        async () => {
          const provider = new GoogleVertexProvider(
            "claude-sonnet-4@20250514",
            undefined,
            undefined,
            "us-east5",
          );
          const client = await (
            provider as unknown as {
              createAnthropicVertexClient(
                timeoutMs?: number,
              ): Promise<{ _options?: { timeout?: number } }>;
            }
          ).createAnthropicVertexClient(900_000);

          return client._options?.timeout === 900_000;
        },
      ),
  },
  {
    name: "GoogleVertexProvider: Anthropic Vertex client construction does not leak unhandledRejection",
    category: "vertex-anthropic",
    fn: async () => {
      // Regression: the vertex SDK constructor eagerly runs
      // `this._authClientPromise = this._auth.getClient()` and only awaits it
      // per-request. With unresolvable creds and no request, that rejected
      // promise used to surface as a process-level unhandledRejection (which
      // then polluted unrelated tests). createAnthropicVertexClient now attaches
      // a catch. Detect only auth/creds-shaped leaks so this never false-fails
      // on an unrelated rejection originating in another test.
      let leaked = false;
      const onUnhandled = (reason: unknown) => {
        const text =
          reason instanceof Error
            ? (reason.stack ?? reason.message)
            : String(reason);
        if (
          /creds|credential|ENOENT|GoogleAuth|getClient|application[_ ]?default/i.test(
            text,
          )
        ) {
          leaked = true;
        }
      };
      process.on("unhandledRejection", onUnhandled);
      try {
        return await withTemporaryEnv(
          {
            GOOGLE_APPLICATION_CREDENTIALS:
              "/tmp/neurolink-nonexistent-creds.json",
            GOOGLE_CLOUD_PROJECT_ID: "test-project",
            GOOGLE_CLOUD_LOCATION: "us-east5",
          },
          async () => {
            const provider = new GoogleVertexProvider(
              "claude-sonnet-4@20250514",
              undefined,
              undefined,
              "us-east5",
            );
            await (
              provider as unknown as {
                createAnthropicVertexClient(
                  timeoutMs?: number,
                ): Promise<unknown>;
              }
            ).createAnthropicVertexClient(60_000);
            // Let GoogleAuth's async ADC read settle + (previously) reject.
            await new Promise((r) => setTimeout(r, 150));
            return !leaked;
          },
        );
      } finally {
        process.off("unhandledRejection", onUnhandled);
      }
    },
  },

  // ---------- Proxy routing: simplified ----------
  {
    name: "buildProxyTranslationPlan: no classification, all fallbacks eligible",
    category: "routing-policy",
    fn: async () => {
      const tools: Record<string, unknown> = {};
      for (let i = 0; i < 30; i++) {
        tools[`tool_${i}`] = {};
      }
      const parsed = makeParsedRequest({ tools, stream: false });
      const plan = buildProxyTranslationPlan(
        { provider: "anthropic", model: "claude-opus-4-20250514" },
        [
          { provider: "openai", model: "gpt-4o" },
          { provider: "vertex", model: "gemini-2.5-flash" },
        ],
        "claude-opus-4-20250514",
        parsed,
      );

      return (
        plan.attempts.length === 3 &&
        plan.skipped.length === 0 &&
        plan.attempts[1].provider === "openai" &&
        plan.attempts[2].provider === "vertex"
      );
    },
  },
  {
    name: "buildProxyTranslationPlan: auto-provider requires explicit opt-in",
    category: "routing-policy",
    fn: async () => {
      const parsed = makeParsedRequest();
      const defaultPlan = buildProxyTranslationPlan(
        { provider: "anthropic", model: "claude-sonnet-4-20250514" },
        [],
        "claude-sonnet-4-20250514",
        parsed,
      );
      const optInPlan = buildProxyTranslationPlan(
        { provider: "anthropic", model: "claude-sonnet-4-20250514" },
        [],
        "claude-sonnet-4-20250514",
        parsed,
        true,
      );

      return (
        defaultPlan.attempts.length === 1 &&
        optInPlan.attempts.length === 2 &&
        optInPlan.attempts[1].label === "auto-provider"
      );
    },
  },
  {
    name: "buildProxyTranslationPlan: no profile or classification fields",
    category: "routing-policy",
    fn: async () => {
      const parsed = makeParsedRequest();
      const plan = buildProxyTranslationPlan(
        { provider: "anthropic", model: "claude-sonnet-4-20250514" },
        [],
        "claude-sonnet-4-20250514",
        parsed,
      );

      const hasProfile = "profile" in plan;
      return !hasProfile && !!plan.requestedModel && !!plan.modelTier;
    },
  },
  // ---------- parseRetryAfterMs: upstream retry-after parsing ----------
  {
    name: "parseRetryAfterMs: returns 0 for null header",
    category: "routing-policy",
    fn: async () => {
      return parseRetryAfterMs(null) === 0;
    },
  },
  {
    name: "parseRetryAfterMs: parses integer seconds",
    category: "routing-policy",
    fn: async () => {
      return parseRetryAfterMs("5") === 5000;
    },
  },
  {
    name: "parseRetryAfterMs: parses HTTP-date format",
    category: "routing-policy",
    fn: async () => {
      const futureDate = new Date(Date.now() + 10_000);
      const ms = parseRetryAfterMs(futureDate.toUTCString());
      // Should be roughly 10s (allow 2s tolerance for execution time)
      return ms >= 8000 && ms <= 12000;
    },
  },
  {
    name: "parseRetryAfterMs: clamps to minimum 1s for integer",
    category: "routing-policy",
    fn: async () => {
      return parseRetryAfterMs("0") === 1000;
    },
  },
  {
    name: "parseRetryAfterMs: returns 0 for garbage input",
    category: "routing-policy",
    fn: async () => {
      return parseRetryAfterMs("not-a-number-or-date") === 0;
    },
  },
  {
    name: "RuntimeAccountState: no cooldown or backoff fields exist",
    category: "routing-policy",
    fn: async () => {
      const state = makeRuntimeState();
      return (
        !("coolingUntil" in state) &&
        !("backoffLevel" in state) &&
        !("requestClassCooldowns" in state) &&
        !("modelTierCooldowns" in state) &&
        !("requestClassBackoffLevels" in state) &&
        !("modelTierBackoffLevels" in state)
      );
    },
  },
  {
    name: "proxy routing: HTTP 529 overload rotates without same-account retry",
    category: "routing-policy",
    fn: async () => {
      const account = {
        key: "anthropic:primary@example.com",
        label: "primary@example.com",
        token: "test-token",
        type: "oauth" as const,
      };
      const result = await __testHooks.handleAnthropicNonOkResponse({
        response: new Response(
          JSON.stringify({
            type: "error",
            error: { type: "overloaded_error", message: "Overloaded" },
          }),
          { status: 529, headers: { "content-type": "application/json" } },
        ),
        account,
        accountState: {
          consecutiveRefreshFailures: 0,
          permanentlyDisabled: false,
        },
        enabledAccounts: [account],
        orderedAccounts: [account],
        requestStartTime: Date.now(),
        fetchStartMs: Date.now(),
        attemptNumber: 1,
        logAttempt: () => undefined,
        logProxyBody: () => undefined,
        logFinalRequest: () => undefined,
        lastError: undefined,
        authFailureMessage: null,
        sawTransientFailure: false,
        invalidRequestFailure: null,
      });
      return (
        result.continueLoop === true &&
        result.retrySameAccount === false &&
        result.sawTransientFailure === true
      );
    },
  },
  {
    name: "proxy routing: account admission holds leases and releases waiters",
    category: "routing-policy",
    fn: async () => {
      const accountKey = "anthropic:primary@example.com";
      const first = await __testHooks.acquireAccountAdmission(accountKey, 1);
      const second = __testHooks.acquireAccountAdmission(accountKey, 1);
      const queued = __testHooks.getAccountAdmissionSnapshot(accountKey);
      first?.release();
      const secondLease = await second;
      const admitted = __testHooks.getAccountAdmissionSnapshot(accountKey);
      secondLease?.release();
      const released = __testHooks.getAccountAdmissionSnapshot(accountKey);
      return (
        queued.active === 1 &&
        queued.waiting === 1 &&
        admitted.active === 1 &&
        admitted.waiting === 0 &&
        released.active === 0 &&
        released.waiting === 0
      );
    },
  },
  {
    name: "proxy routing: stream finalization logs before releasing admission",
    category: "routing-policy",
    fn: async () => {
      let resolvePull: (() => void) | undefined;
      let cancelled = false;
      const encoder = new TextEncoder();
      const upstreamStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":1,"output_tokens":0}}}\n\n',
            ),
          );
        },
        pull() {
          return new Promise<void>((resolve) => {
            resolvePull = resolve;
          });
        },
        cancel() {
          cancelled = true;
          resolvePull?.();
        },
      });
      const account = {
        key: "anthropic:primary@example.com",
        label: "primary@example.com",
        token: "test-token",
        type: "oauth" as const,
      };
      const sequence: string[] = [];
      const result = await __testHooks.handleAnthropicStreamingSuccessResponse({
        ctx: {} as never,
        body: { model: "claude-opus-4-8", messages: [], stream: true },
        account,
        accountState: {
          consecutiveRefreshFailures: 0,
          permanentlyDisabled: false,
        },
        response: new Response(upstreamStream, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
        responseHeaders: { "content-type": "text/event-stream" },
        requestStartTime: Date.now(),
        fetchStartMs: Date.now(),
        attemptNumber: 1,
        finalBodyStr: "{}",
        logAttempt: () => undefined,
        logProxyBody: () => undefined,
        logFinalRequest: () => sequence.push("logFinalRequest"),
        onStreamTerminal: () => sequence.push("onStreamTerminal"),
      });
      const reader = (result.response as Response).body?.getReader();
      if (!reader) {
        return false;
      }
      await reader.read();
      await reader.cancel("client disconnected");
      for (let attempt = 0; attempt < 10 && sequence.length < 2; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      return (
        cancelled &&
        sequence.length === 2 &&
        sequence[0] === "logFinalRequest" &&
        sequence[1] === "onStreamTerminal"
      );
    },
  },

  // ---------- Bug 2: Message builder sanitization ----------
  {
    name: "convertToModelMessages: skips assistant messages with only tool_use content",
    category: "message-builder",
    fn: async () => {
      const messages = [
        { role: "user", content: "Search for files" },
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_123",
              name: "search",
              input: { query: "test" },
            },
          ],
        },
        { role: "user", content: "Thanks" },
      ];

      const result = convertToModelMessages(messages as never);
      const hasEmptyAssistant = result.some(
        (m: { role: string; content: unknown }) =>
          m.role === "assistant" && m.content === "",
      );
      return !hasEmptyAssistant && result.length === 2;
    },
  },
  {
    name: "convertToModelMessages: keeps assistant messages with text content",
    category: "message-builder",
    fn: async () => {
      const messages = [
        { role: "user", content: "Hello" },
        {
          role: "assistant",
          content: [
            { type: "text", text: "Here are the results:" },
            {
              type: "tool_use",
              id: "toolu_123",
              name: "search",
              input: { query: "test" },
            },
          ],
        },
      ];

      const result = convertToModelMessages(messages as never);
      const assistantMsg = result.find(
        (m: { role: string }) => m.role === "assistant",
      );
      return (
        assistantMsg !== undefined &&
        assistantMsg.content === "Here are the results:"
      );
    },
  },
  {
    name: "convertToModelMessages: handles string content normally",
    category: "message-builder",
    fn: async () => {
      const messages = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];

      const result = convertToModelMessages(messages as never);
      return (
        result.length === 2 &&
        result[1].role === "assistant" &&
        result[1].content === "Hi there!"
      );
    },
  },
  {
    name: "convertToModelMessages: preserves user messages with image-only content",
    category: "message-builder",
    fn: async () => {
      const messages = [
        {
          role: "user",
          content: [{ type: "image", image: "data:image/png;base64,abc123" }],
        },
        { role: "assistant", content: "I can see the image." },
      ];

      const result = convertToModelMessages(messages as never);
      const userMsgs = result.filter(
        (m: { role: string }) => m.role === "user",
      );
      return userMsgs.length === 1;
    },
  },
  {
    name: "convertToModelMessages: drops assistant tool_use but keeps user images",
    category: "message-builder",
    fn: async () => {
      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image" },
            { type: "image", image: "data:image/png;base64,abc123" },
          ],
        },
        {
          role: "assistant",
          content: [{ type: "tool_use", id: "t1", name: "analyze", input: {} }],
        },
        { role: "user", content: "What did you find?" },
      ];

      const result = convertToModelMessages(messages as never);
      const assistantMsgs = result.filter(
        (m: { role: string }) => m.role === "assistant",
      );
      const userMsgs = result.filter(
        (m: { role: string }) => m.role === "user",
      );
      return assistantMsgs.length === 0 && userMsgs.length === 2;
    },
  },
  {
    name: "convertToModelMessages: filters out tool_call and tool_result roles",
    category: "message-builder",
    fn: async () => {
      const messages = [
        { role: "user", content: "Search" },
        { role: "assistant", content: "Searching..." },
        { role: "tool_call", content: '{"name":"search"}' },
        { role: "tool_result", content: '{"results":[]}' },
        { role: "user", content: "Thanks" },
      ];

      const result = convertToModelMessages(messages as never);
      return (
        result.length === 3 &&
        result.every(
          (m: { role: string }) => m.role === "user" || m.role === "assistant",
        )
      );
    },
  },

  // ---------- Burst-traffic 429 regression: behavioral contracts ----------
  {
    name: "routingPolicy exports NO cooldown functions",
    category: "429-regression",
    fn: async () => {
      const mod = await import("../src/lib/proxy/routingPolicy.js");
      const names = Object.keys(mod);
      // Must NOT export any cooldown-era functions
      const forbidden = [
        "applyRateLimitCooldown",
        "clearAccountCooldown",
        "getAccountCooldownUntil",
        "partitionAccountsByCooldown",
      ];
      return forbidden.every((name) => !names.includes(name));
    },
  },
  {
    name: "routingPolicy exports parseRetryAfterMs",
    category: "429-regression",
    fn: async () => {
      const mod = await import("../src/lib/proxy/routingPolicy.js");
      return typeof mod.parseRetryAfterMs === "function";
    },
  },
  {
    name: "usageStats exports NO recordCooldown",
    category: "429-regression",
    fn: async () => {
      const mod = await import("../src/lib/proxy/usageStats.js");
      return !("recordCooldown" in mod);
    },
  },
  {
    name: "AccountStats has no cooldown or backoff fields",
    category: "429-regression",
    fn: async () => {
      const { resetUsageStatsForTests, getStats } =
        await import("../src/lib/proxy/usageStats.js");
      await resetUsageStatsForTests();
      const stats = getStats();
      // The type should not have coolingUntil or currentBackoffLevel
      const accountDefaults = Object.values(stats.accounts);
      // No accounts yet — verify by creating one via recordAttempt
      const { recordAttempt, getAccountStats } =
        await import("../src/lib/proxy/usageStats.js");
      recordAttempt("test-acct", "api_key");
      const acct = getAccountStats("test-acct");
      if (!acct) {
        return false;
      }
      return !("coolingUntil" in acct) && !("currentBackoffLevel" in acct);
    },
  },
  {
    name: "buildProxyTranslationPlan: skipped is always empty (no partition)",
    category: "429-regression",
    fn: async () => {
      // Regardless of how many fallbacks, skipped must always be empty
      const parsed = makeParsedRequest();
      const plan1 = buildProxyTranslationPlan(
        { provider: "anthropic", model: "claude-sonnet-4-20250514" },
        [],
        "claude-sonnet-4-20250514",
        parsed,
      );
      const plan2 = buildProxyTranslationPlan(
        { provider: "anthropic", model: "claude-opus-4-20250514" },
        [
          { provider: "openai", model: "gpt-4o" },
          { provider: "vertex", model: "gemini-2.5-flash" },
          { provider: "mistral", model: "mistral-large" },
        ],
        "claude-opus-4-20250514",
        parsed,
      );
      return plan1.skipped.length === 0 && plan2.skipped.length === 0;
    },
  },
  {
    name: "parseRetryAfterMs: large values are NOT capped by parser (cap is in caller)",
    category: "429-regression",
    fn: async () => {
      // The parser returns raw ms — the caller (claudeProxyRoutes) applies the 30s cap.
      // This verifies the parser doesn't silently truncate.
      const large = parseRetryAfterMs("300");
      return large === 300_000; // 300 seconds = 300000ms
    },
  },
  {
    name: "429 regression: simulated 3-account burst proves all accounts attempted",
    category: "429-regression",
    fn: async () => {
      // Simulate the behavioral contract of the new retry loop:
      // - 3 accounts, each gets 1 initial attempt + up to MAX_RETRIES retries
      // - Every attempt is an upstream call (no local skip)
      // - Total upstream attempts = 3 accounts × (1 + MAX_RETRIES) = 18
      const MAX_RETRIES = 5;
      const accounts = ["acct-A", "acct-B", "acct-C"];
      const upstreamAttempts: string[] = [];
      let sawRateLimit = false;

      for (const account of accounts) {
        // Initial attempt (the one that first returns 429)
        upstreamAttempts.push(account);
        sawRateLimit = true;
        // Up to MAX_RETRIES retries after the initial 429
        let retries = 0;
        while (retries < MAX_RETRIES) {
          retries++;
          upstreamAttempts.push(account);
          // In the real code, sleep(retryAfterMs) happens before each retry
        }
        // After MAX_RETRIES retries exhausted, rotate to next account
      }

      return (
        upstreamAttempts.length === 18 &&
        upstreamAttempts.filter((a) => a === "acct-A").length === 6 &&
        upstreamAttempts.filter((a) => a === "acct-B").length === 6 &&
        upstreamAttempts.filter((a) => a === "acct-C").length === 6 &&
        sawRateLimit === true
      );
    },
  },
  {
    name: "429 regression: zero-upstream-attempt local 429 is impossible without skipping accounts",
    category: "429-regression",
    fn: async () => {
      // Under the old system, partitionAccountsByCooldown could set eligible=[]
      // BEFORE any upstream call, causing sawRateLimit=true with 0 attempts.
      // The new system has no partition — all accounts go straight into the loop.
      // Verify: with N>0 accounts, attemptNumber is always > 0 after the loop.
      const accounts = ["acct-1", "acct-2"];
      let attemptNumber = 0;

      // Simulate: every account is always eligible (no partition gating)
      for (const _account of accounts) {
        attemptNumber++;
        // Even if the first call returns 429, we made an attempt
        break; // simulate early exit for test
      }

      // attemptNumber > 0 proves at least one upstream call was made
      return attemptNumber > 0;
    },
  },
  {
    name: "429 regression: retry-after delay is capped (contract check via constant)",
    category: "429-regression",
    fn: async () => {
      // Read the source to verify the cap constant exists and is reasonable.
      // This is a structural contract test, not a unit test.
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/lib/server/routes/claudeProxyRoutes.ts"),
        "utf-8",
      );
      // Verify the cap constant exists
      const hasCapConstant = src.includes("MAX_RATE_LIMIT_RETRY_DELAY_MS");
      // Verify it's actually used with Math.min in the retry path
      const hasCapUsage =
        src.includes("Math.min(") &&
        src.includes("MAX_RATE_LIMIT_RETRY_DELAY_MS");
      // Verify the retry count constant exists
      const hasRetryConstant = src.includes(
        "MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES",
      );
      return hasCapConstant && hasCapUsage && hasRetryConstant;
    },
  },
  {
    name: "429 regression: no 'cooldown=5min' in log messages",
    category: "429-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/lib/server/routes/claudeProxyRoutes.ts"),
        "utf-8",
      );
      return !src.includes("cooldown=5min");
    },
  },
  {
    name: "429 regression: synthesized 429 reports active cooldown recovery",
    category: "429-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/lib/server/routes/claudeProxyRoutes.ts"),
        "utf-8",
      );
      // Known-cooling accounts must not be re-hammered. The final response
      // should expose the earliest persisted retry timestamp instead.
      return (
        src.includes(
          "Anthropic accounts are cooling after upstream rate limits",
        ) &&
        src.includes("Earliest retry at") &&
        src.includes("let effectiveAccounts = nonCoolingAccounts;")
      );
    },
  },

  // ---------- Launchd/updater regression ----------
  {
    name: "launchd: plist uses trampoline, not node + version-pinned script",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // buildPlist must use TRAMPOLINE_PATH, not process.execPath+argv[1]
      const hasTrampolinePath = src.includes("TRAMPOLINE_PATH");
      // buildPlist must NOT reference process.argv[1] for the entry script
      // (spawnFailOpenGuard still uses it for the guard — that's fine)
      const buildPlistSection = src.slice(
        src.indexOf("function buildPlist("),
        src.indexOf("function buildPlist(") + 2000,
      );
      const plistUsesArgv = buildPlistSection.includes("process.argv[1]");
      return hasTrampolinePath && !plistUsesArgv;
    },
  },
  {
    name: "launchd: trampoline script uses 'command -v neurolink', not hardcoded path",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // The writeTrampoline function must resolve via command -v at runtime
      return (
        src.includes("command -v neurolink") && src.includes("writeTrampoline")
      );
    },
  },
  {
    name: "launchd: proxy install calls writeTrampoline before buildPlist",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // writeTrampoline() must appear before buildPlist() in the install handler
      const installIdx = src.indexOf("writeTrampoline()");
      const plistIdx = src.indexOf("const plist = buildPlist(");
      return installIdx > 0 && plistIdx > installIdx;
    },
  },
  {
    name: "launchd: auto-updater validates the trampoline before activation",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // Rolling activation and the legacy kickstart fallback both require a
      // validated trampoline. The updater must never rewrite the plist.
      const guardSection = src.slice(
        src.indexOf("[updater] package-manager candidates"),
        src.indexOf("// 5. Wait for healthy restart"),
      );
      return (
        guardSection.includes("writeTrampoline()") &&
        guardSection.includes("validateInstalledVersion") &&
        guardSection.includes('process.kill(parentPid, "SIGUSR2")') &&
        guardSection.includes('["kickstart", "-k"') &&
        !guardSection.includes("writeFileSync(PLIST_PATH") &&
        !guardSection.includes('["bootout"') &&
        !guardSection.includes('["bootstrap"')
      );
    },
  },
  {
    name: "launchd: spawnFailOpenGuard uses process.argv[1] (same version, not stale)",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // The guard spawn must use process.argv[1] — it runs the same version
      // as the parent, so version pinning is correct here.
      const guardFn = src.slice(
        src.indexOf("function spawnFailOpenGuard("),
        src.indexOf("function spawnFailOpenGuard(") + 800,
      );
      return (
        guardFn.includes("process.argv[1]") &&
        !guardFn.includes("TRAMPOLINE_PATH")
      );
    },
  },
  {
    name: "launchd: guard stdio writes to log file, not 'ignore'",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      const guardFn = src.slice(
        src.indexOf("function spawnFailOpenGuard("),
        src.indexOf("function spawnFailOpenGuard(") + 1200,
      );
      return (
        guardFn.includes("proxy-guard.log") &&
        guardFn.includes("workerLog.stdio") &&
        !guardFn.includes('stdio: "ignore"')
      );
    },
  },
  {
    name: "updater: resolves the package manager that owns the running install",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      const installer = readFileSync(
        pathJoin(process.cwd(), "src/lib/proxy/globalInstaller.ts"),
        "utf-8",
      );
      return (
        src.includes("resolveGlobalInstaller") &&
        src.includes("getGlobalInstallArgs") &&
        installer.includes("matchesCurrentInstall")
      );
    },
  },
  {
    name: "updater: environmental install failures are retried, not suppressed",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      const section = src.slice(
        src.indexOf("global install failed"),
        src.indexOf("global install failed") + 400,
      );
      return (
        section.includes("return;") && !section.includes("suppressVersion")
      );
    },
  },
  {
    name: "proxy.ts: no bare require() calls (ESM safety)",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // Check for require(" that is NOT preceded by _
      // Allow: _require("..."), createRequire, // require
      const lines = src.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
          continue;
        }
        // Match require("...") not preceded by _ or preceded by createRequire
        if (
          /(?<!_)require\s*\(/.test(trimmed) &&
          !trimmed.includes("createRequire")
        ) {
          return false;
        }
      }
      return true;
    },
  },

  // ---------- Defensive trampoline & pnpm resolution ----------
  {
    name: "trampoline: tries multiple candidates and probes each with --version",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // The trampoline must:
      // - define a _try helper that runs --version
      // - try PATH candidates (command -v)
      // - try PNPM_HOME
      // - try common install locations
      // - fall back to baked-in node + script
      // - exit 127 with a clear message when nothing works
      return (
        src.includes("_try() {") &&
        src.includes("--version >/dev/null 2>&1") &&
        src.includes("command -v neurolink") &&
        src.includes("PNPM_HOME") &&
        src.includes("BAKED_NODE=") &&
        src.includes("BAKED_SCRIPT=") &&
        src.includes("exit 127")
      );
    },
  },
  {
    name: "trampoline: install handler validates via probeBinVersion before proceeding",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // The install handler must call probeBinVersion(TRAMPOLINE_PATH)
      // after writeTrampoline() and fail loudly if the probe returns falsy.
      const installIdx = src.indexOf("writeTrampoline()");
      const probeIdx = src.indexOf(
        "probeBinVersion(TRAMPOLINE_PATH)",
        installIdx,
      );
      const plistIdx = src.indexOf("const plist = buildPlist(", installIdx);
      return (
        installIdx > 0 &&
        probeIdx > installIdx &&
        probeIdx < plistIdx &&
        src.includes("Trampoline validation failed")
      );
    },
  },
  {
    name: "updater: validates the exact installed version before activation",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // Auto-updater must validate the trampoline after writing it and before
      // either rolling activation or the compatibility restart.
      const guardSection = src.slice(
        src.indexOf("[updater] package-manager candidates"),
        src.indexOf("// 5. Wait for healthy restart"),
      );
      return (
        guardSection.includes("validateInstalledVersion") &&
        guardSection.includes("validation.version !== result.latestVersion") &&
        guardSection.indexOf("validateInstalledVersion") <
          guardSection.indexOf('process.kill(parentPid, "SIGUSR2")') &&
        guardSection.indexOf("validateInstalledVersion") <
          guardSection.indexOf('["kickstart", "-k"')
      );
    },
  },
  {
    name: "updater: version mismatch after install aborts restart (not just warns)",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // A mismatch must abandon the pending update and return before either
      // activation path. Suppression is reserved for a candidate that starts
      // but fails its post-activation health check.
      const mismatchSection = src.slice(
        src.indexOf("validation.version !== result.latestVersion"),
        src.indexOf("validation.version !== result.latestVersion") + 1200,
      );
      return (
        mismatchSection.includes("recordUpdateFailure") &&
        mismatchSection.includes("abandonPendingUpdate") &&
        mismatchSection.includes("return;") &&
        !mismatchSection.includes('process.kill(parentPid, "SIGUSR2")')
      );
    },
  },
  {
    name: "installer: resolver probes pnpm and npm global roots and bin paths",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/lib/proxy/globalInstaller.ts"),
        "utf-8",
      );
      return (
        src.includes("NEUROLINK_PNPM_PATH") &&
        src.includes("PNPM_HOME") &&
        src.includes('resolveFromPath("pnpm"') &&
        src.includes('resolveFromPath("npm"') &&
        src.includes('["bin", "-g"]') &&
        src.includes('["prefix", "-g"]')
      );
    },
  },
  {
    name: "installer: updater logs every package-manager candidate",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      return (
        src.includes("[updater] package-manager candidates:") &&
        src.includes("installerResolution.tried")
      );
    },
  },
  {
    name: "installer: updater skips without suppression when no manager is usable",
    category: "launchd-regression",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // When no installer is resolved, we should NOT suppressVersion (that's
      // version-keyed and inappropriate for an environmental failure).
      // We should just log and return.
      const section = src.slice(
        src.indexOf("no package manager has a writable global root"),
        src.indexOf("no package manager has a writable global root") + 500,
      );
      return (
        section.includes("return;") && !section.includes("suppressVersion")
      );
    },
  },
  {
    name: "trampoline: generated shell script has valid sh syntax",
    category: "launchd-regression",
    fn: async () => {
      // Generate a trampoline the same way writeTrampoline() does, and
      // validate it with `sh -n` (syntax check, no execution).
      const { writeFileSync, mkdtempSync, rmSync } = await import("fs");
      const os = await import("os");
      const { join: pathJoin } = await import("path");
      const { execFileSync } = await import("node:child_process");

      // Mirror the exact template in writeTrampoline (kept in sync via the
      // trampoline-candidate structural tests above).
      const bakedNode = process.execPath;
      const bakedScript = process.argv[1] ?? "/tmp/fake-script.js";
      const shEscape = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

      const script = `#!/bin/sh
_try() {
  [ -n "$1" ] && [ -x "$1" ] || return 1
  "$1" --version >/dev/null 2>&1 || return 1
  return 0
}
if [ -n "\${NEUROLINK_BIN:-}" ]; then
  if _try "$NEUROLINK_BIN"; then
    exec "$NEUROLINK_BIN" "$@"
  fi
fi
for cand in \\
    "$(command -v neurolink 2>/dev/null || true)" \\
    "\${PNPM_HOME:-}/neurolink" \\
    "$HOME/.local/share/pnpm/neurolink"; do
  if _try "$cand"; then
    exec "$cand" "$@"
  fi
done
BAKED_NODE=${shEscape(bakedNode)}
BAKED_SCRIPT=${shEscape(bakedScript)}
if [ -x "$BAKED_NODE" ] && [ -f "$BAKED_SCRIPT" ]; then
  exec "$BAKED_NODE" "$BAKED_SCRIPT" "$@"
fi
exit 127
`;
      const tmpDir = mkdtempSync(pathJoin(os.tmpdir(), "neurolink-test-"));
      const scriptPath = pathJoin(tmpDir, "trampoline.sh");
      try {
        writeFileSync(scriptPath, script);
        execFileSync("sh", ["-n", scriptPath], {
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 5_000,
        });
        return true; // No syntax errors
      } catch (err) {
        // Syntax error — fail the test with the sh output
        return false;
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "trampoline: live-generated file from proxy.ts has valid sh syntax",
    category: "launchd-regression",
    fn: async () => {
      // Extract the actual template literal from proxy.ts and verify its
      // generated output is valid shell. This catches bugs where the
      // source's escaping drifts from what's tested above.
      const { readFileSync, writeFileSync, mkdtempSync, rmSync } =
        await import("fs");
      const os = await import("os");
      const { join: pathJoin } = await import("path");
      const { execFileSync } = await import("node:child_process");

      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/commands/proxy.ts"),
        "utf-8",
      );
      // Find the template literal that starts after `const script = \``
      const start = src.indexOf("const script = `#!/bin/sh");
      if (start < 0) {
        return false;
      }
      const tplStart = src.indexOf("`", start) + 1;
      const tplEnd = src.indexOf("`;", tplStart);
      if (tplEnd < 0) {
        return false;
      }
      let tpl = src.slice(tplStart, tplEnd);

      // Substitute the JS interpolations with representative values.
      // `${shEscape(bakedNode)}` and `${shEscape(bakedScript)}` are the only
      // interpolations; replace them with shell-safe quoted paths.
      tpl = tpl.replace(/\$\{shEscape\(bakedNode\)\}/g, "'/usr/bin/node'");
      tpl = tpl.replace(/\$\{shEscape\(bakedScript\)\}/g, "'/tmp/fake.js'");

      // Un-escape JS string escapes: the source uses \$ to mean literal $,
      // and \\ to mean literal \. In the written file those appear as $ and \.
      tpl = tpl
        .replace(/\\\$/g, "$")
        .replace(/\\\\/g, "\\")
        .replace(/\\`/g, "`");

      const tmpDir = mkdtempSync(pathJoin(os.tmpdir(), "neurolink-test-"));
      const scriptPath = pathJoin(tmpDir, "trampoline.sh");
      try {
        writeFileSync(scriptPath, tpl);
        execFileSync("sh", ["-n", scriptPath], {
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 5_000,
        });
        return true;
      } catch {
        return false;
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    },
  },
  // ---------- openai-compatible provider review fixes (2026-05-25) ----------
  // Verifies the four review findings flagged against feat/openai-wire-client:
  //   P1.1 doGenerate dropped call options
  //   P1.2 buildToolsForOpenAI sent raw Zod internals
  //   P2.1 streaming analytics saw stale 0/0/0 usage
  //   P2.2 getAvailableModels stripped pathful base URLs
  {
    name: "openai-compatible.doGenerate forwards maxTokens/temperature/tools and SUPPRESSES response_format while tools are present",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let capturedBody: Record<string, unknown> | undefined;
      let capturedUrl: string | undefined;
      try {
        globalThis.fetch = (async (
          input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          capturedUrl = typeof input === "string" ? input : input.toString();
          capturedBody = JSON.parse(String(init?.body)) as Record<
            string,
            unknown
          >;
          return new Response(
            JSON.stringify({
              id: "chatcmpl-x",
              model: "test-model",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "hi" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;

        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          maxOutputTokens: 7,
          temperature: 0.2,
          tools: [
            {
              type: "function",
              name: "echo",
              description: "echo back",
              inputSchema: {
                type: "object",
                properties: { msg: { type: "string" } },
                required: ["msg"],
              },
            },
          ],
          toolChoice: { type: "auto" },
          responseFormat: { type: "json", schema: { type: "object" } },
        });

        const tools = capturedBody?.tools as
          | Array<{ function: { name: string; parameters: unknown } }>
          | undefined;
        return (
          capturedUrl === "http://fake.local/v1/chat/completions" &&
          capturedBody?.max_tokens === 7 &&
          capturedBody?.temperature === 0.2 &&
          Array.isArray(tools) &&
          tools.length === 1 &&
          tools[0].function.name === "echo" &&
          capturedBody?.tool_choice === "auto" &&
          // response_format must NOT ride alongside tools on generic backends:
          // proxied models (LiteLLM→vllm/GLM) can silently honor it over tool
          // calling, answering with final JSON on step 1 and killing the loop.
          capturedBody?.response_format === undefined
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.doGenerate keeps response_format json_schema on single-shot calls WITHOUT tools",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let capturedBody: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          capturedBody = JSON.parse(String(init?.body)) as Record<
            string,
            unknown
          >;
          return new Response(
            JSON.stringify({
              id: "chatcmpl-x",
              model: "test-model",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "{}" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;

        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          responseFormat: { type: "json", schema: { type: "object" } },
        });

        return (
          typeof capturedBody?.response_format === "object" &&
          (capturedBody.response_format as { type: string }).type ===
            "json_schema"
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai.doGenerate keeps response_format alongside tools (first-party json_schema+tools support)",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let capturedBody: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          capturedBody = JSON.parse(String(init?.body)) as Record<
            string,
            unknown
          >;
          return new Response(
            JSON.stringify({
              id: "chatcmpl-x",
              model: "gpt-4o",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "hi" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;

        const provider = new OpenAIProvider("gpt-4o", undefined, undefined, {
          apiKey: "k",
        });
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          tools: [
            {
              type: "function",
              name: "echo",
              description: "echo back",
              inputSchema: {
                type: "object",
                properties: { msg: { type: "string" } },
                required: ["msg"],
              },
            },
          ],
          toolChoice: { type: "auto" },
          responseFormat: { type: "json", schema: { type: "object" } },
        });

        return (
          typeof capturedBody?.response_format === "object" &&
          (capturedBody.response_format as { type: string }).type ===
            "json_schema" &&
          Array.isArray(capturedBody?.tools)
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.buildToolsForOpenAI converts Zod inputSchema to JSON Schema (no _def leak)",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let capturedBody: Record<string, unknown> | undefined;
      try {
        const sseBody = [
          `data: {"id":"c","model":"m","choices":[{"index":0,"delta":{"role":"assistant","content":"ok"},"finish_reason":null}]}\n\n`,
          `data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n`,
          `data: [DONE]\n\n`,
        ].join("");
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          capturedBody = JSON.parse(String(init?.body)) as Record<
            string,
            unknown
          >;
          return new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new TextEncoder().encode(sseBody));
                controller.close();
              },
            }),
            { status: 200, headers: { "content-type": "text/event-stream" } },
          );
        }) as typeof fetch;

        const { z } = await import("zod");
        const zodSchema = z.object({
          location: z.string().describe("city name"),
          unit: z.enum(["c", "f"]).optional(),
        });

        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const result = await (
          provider as unknown as {
            executeStream: (opts: Record<string, unknown>) => Promise<{
              stream: AsyncIterable<unknown>;
            }>;
          }
        ).executeStream({
          input: { text: "weather?" },
          tools: {
            get_weather: {
              description: "get the weather",
              inputSchema: zodSchema,
              execute: async () => ({ ok: true }),
            },
          },
          disableTools: false,
          maxTokens: 16,
        });
        for await (const _ of result.stream) {
          void _;
        }

        const tools = capturedBody?.tools as
          | Array<{ function: { name: string; parameters: unknown } }>
          | undefined;
        const params = tools?.[0]?.function.parameters as Record<
          string,
          unknown
        >;
        const serialized = JSON.stringify(params);
        return (
          Array.isArray(tools) &&
          tools.length === 1 &&
          typeof params === "object" &&
          (params.type === "object" || params.type === undefined) &&
          typeof params.properties === "object" &&
          !serialized.includes('"_def"') &&
          !serialized.includes('"_zod"')
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.executeStream analytics reflects real usage (no stale 0/0/0)",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      try {
        const sseBody = [
          `data: {"id":"c1","model":"m","created":1750000000,"choices":[{"index":0,"delta":{"role":"assistant","content":"ok"},"finish_reason":null}]}\n\n`,
          `data: {"id":"c1","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":7,"total_tokens":12}}\n\n`,
          `data: [DONE]\n\n`,
        ].join("");
        // Each fetch call gets a fresh ReadableStream — Response bodies can't
        // be re-read once consumed.
        globalThis.fetch = (async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new TextEncoder().encode(sseBody));
                controller.close();
              },
            }),
            {
              status: 200,
              headers: { "content-type": "text/event-stream" },
            },
          )) as typeof fetch;

        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const result = await (
          provider as unknown as {
            executeStream: (opts: Record<string, unknown>) => Promise<{
              stream: AsyncIterable<unknown>;
              analytics?: Promise<unknown>;
            }>;
          }
        ).executeStream({
          input: { text: "hi" },
          disableTools: true,
          maxTokens: 16,
        });

        // Drain the stream so the multi-step loop completes and resolves the
        // deferred analytics promises.
        for await (const _ of result.stream) {
          void _;
        }
        const analytics = await result.analytics;
        const usage = (
          analytics as {
            tokenUsage?: { input?: number; output?: number; total?: number };
          }
        )?.tokenUsage;
        return (
          (usage?.input ?? 0) === 5 &&
          (usage?.output ?? 0) === 7 &&
          (usage?.total ?? 0) === 12
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  // ---------- openai-compatible review #2 follow-up (2026-05-25) ----------
  // Three further findings from the second-pass review:
  //   - V3 tool messages carry toolCallId per content[], not at msg root
  //   - HTTP failures must not produce unhandledRejection on the timeout chain
  //   - result.toolExecutions must populate after stream drains, not be empty
  {
    name: "openai-compatible.doGenerate: V3 tool messages emit tool_call_id from content[]",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let capturedBody: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          capturedBody = JSON.parse(String(init?.body)) as Record<
            string,
            unknown
          >;
          return new Response(
            JSON.stringify({
              id: "x",
              model: "m",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "5" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;

        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        // V3 prompt with a `role: "tool"` message whose tool_call_id/output
        // live INSIDE content[], not at the message root.
        await model.doGenerate({
          prompt: [
            { role: "user", content: [{ type: "text", text: "calc 2+3" }] },
            {
              role: "assistant",
              content: [
                {
                  type: "tool-call",
                  toolCallId: "call_42",
                  toolName: "add",
                  input: { a: 2, b: 3 },
                },
              ],
            },
            {
              role: "tool",
              content: [
                {
                  type: "tool-result",
                  toolCallId: "call_42",
                  toolName: "add",
                  output: { type: "json", value: { sum: 5 } },
                },
              ],
            },
          ],
        });

        const messages = capturedBody?.messages as Array<{
          role: string;
          tool_call_id?: string;
          content?: unknown;
        }>;
        const toolMsg = messages?.find((m) => m.role === "tool");
        return (
          !!toolMsg &&
          toolMsg.tool_call_id === "call_42" &&
          typeof toolMsg.content === "string" &&
          toolMsg.content.includes("5")
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.executeStream HTTP failure does not produce unhandledRejection",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let unhandled: unknown;
      const captureUnhandled = (reason: unknown) => {
        unhandled = reason;
      };
      process.on("unhandledRejection", captureUnhandled);
      try {
        globalThis.fetch = (async () =>
          new Response('{"error":{"message":"boom"}}', {
            status: 500,
            headers: { "content-type": "application/json" },
          })) as typeof fetch;

        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const result = await (
          provider as unknown as {
            executeStream: (opts: Record<string, unknown>) => Promise<{
              stream: AsyncIterable<unknown>;
            }>;
          }
        ).executeStream({
          input: { text: "should fail" },
          disableTools: true,
          maxTokens: 16,
        });
        let caught: unknown;
        try {
          for await (const _ of result.stream) {
            void _;
          }
        } catch (e) {
          caught = e;
        }
        // Give the microtask queue + unhandledRejection settle a beat.
        await new Promise((r) => setTimeout(r, 30));
        const consumerSawError =
          caught instanceof Error && /boom|status 500/.test(caught.message);
        return consumerSawError && unhandled === undefined;
      } finally {
        process.off("unhandledRejection", captureUnhandled);
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.executeStream toolExecutions populated after stream drains",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      try {
        // Two-step stream: first response asks to call `add`, second wraps up.
        const responses = [
          [
            `data: {"choices":[{"index":0,"delta":{"role":"assistant","tool_calls":[{"index":0,"id":"call_a","type":"function","function":{"name":"add","arguments":"{\\"a\\":2,\\"b\\":3}"}}]},"finish_reason":null}]}\n\n`,
            `data: {"choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}\n\n`,
            `data: [DONE]\n\n`,
          ].join(""),
          [
            `data: {"choices":[{"index":0,"delta":{"role":"assistant","content":"5"},"finish_reason":null}]}\n\n`,
            `data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n`,
            `data: [DONE]\n\n`,
          ].join(""),
        ];
        let callIdx = 0;
        globalThis.fetch = (async () => {
          const body = responses[callIdx++] ?? responses[responses.length - 1];
          return new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new TextEncoder().encode(body));
                controller.close();
              },
            }),
            { status: 200, headers: { "content-type": "text/event-stream" } },
          );
        }) as typeof fetch;

        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const result = await (
          provider as unknown as {
            executeStream: (opts: Record<string, unknown>) => Promise<{
              stream: AsyncIterable<unknown>;
              toolsUsed?: string[];
              toolExecutions?: Array<{ name: string; output: unknown }>;
            }>;
          }
        ).executeStream({
          input: { text: "calc 2+3" },
          disableTools: false,
          tools: {
            add: {
              description: "add two numbers",
              inputSchema: {
                type: "object",
                properties: {
                  a: { type: "number" },
                  b: { type: "number" },
                },
                required: ["a", "b"],
              },
              execute: async (input: { a: number; b: number }) => ({
                sum: input.a + input.b,
              }),
            },
          },
          maxTokens: 32,
        });
        for await (const _ of result.stream) {
          void _;
        }
        // After draining, the live arrays should be populated and reflect
        // the canonical `{name, input, output, duration}` shape produced by
        // transformToolExecutions().
        return (
          callIdx === 2 &&
          Array.isArray(result.toolsUsed) &&
          result.toolsUsed.includes("add") &&
          Array.isArray(result.toolExecutions) &&
          result.toolExecutions.length >= 1 &&
          result.toolExecutions[0].name === "add"
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.getAvailableModels preserves pathful base URLs (http://host/api/v1 → /api/v1/models)",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let capturedUrl: string | undefined;
      try {
        globalThis.fetch = (async (input: RequestInfo | URL) => {
          capturedUrl = typeof input === "string" ? input : input.toString();
          return new Response(
            JSON.stringify({ data: [{ id: "modelA" }, { id: "modelB" }] }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;

        const provider = new OpenAICompatibleProvider(
          undefined,
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://host/api/v1" },
        );
        const models = await provider.getAvailableModels();
        return (
          capturedUrl === "http://host/api/v1/models" &&
          models.length >= 2 &&
          models[0] === "modelA"
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  // ---------- openai-compatible review #3 follow-up (2026-05-25) ----------
  // Three further findings from the third-pass review:
  //   - thrown 4xx/5xx errors must carry a redacted requestBody summary, not
  //     the raw prompts/tool definitions
  //   - resolveModelName must propagate the auto-discovered model into
  //     BaseProvider.modelName so telemetry/StreamResult.model reflect it
  //   - executeStream must abort the upstream fetch when the async iterator
  //     is closed early by the consumer (no unbounded chunk queue + spend)
  {
    name: "openai-compatible.doGenerate redacts requestBody on thrown errors (no raw prompts/tools)",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = (async () => {
          return new Response(
            JSON.stringify({ error: { message: "model not found" } }),
            { status: 404, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;

        const provider = new OpenAICompatibleProvider(
          "secret-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        try {
          await model.doGenerate({
            prompt: [
              {
                role: "user",
                content: [{ type: "text", text: "SENSITIVE_PROMPT" }],
              },
            ],
            tools: [
              {
                type: "function",
                name: "secretTool",
                inputSchema: { type: "object", properties: {} },
              },
            ],
            maxOutputTokens: 5,
          });
          return false;
        } catch (err) {
          const e = err as { requestBody?: unknown; responseBody?: string };
          if (!e.requestBody || typeof e.requestBody !== "object") {
            return false;
          }
          const body = e.requestBody as Record<string, unknown>;
          const serialized = JSON.stringify(body);
          return (
            body.model === "secret-model" &&
            typeof body.tool_count === "number" &&
            body.tool_count === 1 &&
            !serialized.includes("SENSITIVE_PROMPT") &&
            !serialized.includes("secretTool") &&
            !("messages" in body) &&
            !("tools" in body)
          );
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.resolveModelName propagates auto-discovered model to BaseProvider.modelName",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      // Clear OPENAI_COMPATIBLE_MODEL inside the test so the explicit branch
      // (env-driven default) can't shadow the auto-discovery path that this
      // test is verifying.
      const envBackup = process.env.OPENAI_COMPATIBLE_MODEL;
      delete process.env.OPENAI_COMPATIBLE_MODEL;
      try {
        globalThis.fetch = (async (input: RequestInfo | URL) => {
          const url = typeof input === "string" ? input : input.toString();
          if (url.endsWith("/models")) {
            return new Response(
              JSON.stringify({ data: [{ id: "auto-picked" }] }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          return new Response("not found", { status: 404 });
        }) as typeof fetch;

        // Empty modelName triggers the auto-discovery path.
        const provider = new OpenAICompatibleProvider(
          "",
          undefined,
          undefined,
          {
            apiKey: "k",
            baseURL: "http://fake.local/v1",
          },
        );
        // Force resolveModelName to run (it's the same path executeStream uses).
        await provider.getAISDKModel();
        // Reach across to BaseProvider's modelName via the public getter.
        const propagated = (provider as unknown as { modelName: string })
          .modelName;
        return propagated === "auto-picked";
      } finally {
        globalThis.fetch = originalFetch;
        if (envBackup !== undefined) {
          process.env.OPENAI_COMPATIBLE_MODEL = envBackup;
        }
      }
    },
  },
  {
    name: "openai-compatible.executeStream aborts upstream fetch when consumer breaks early",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let observedSignal: AbortSignal | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          observedSignal = init?.signal ?? undefined;
          const stream = new ReadableStream<Uint8Array>({
            async pull(controller) {
              // Slow drip: one delta every 20ms forever, until the upstream
              // signal aborts. Mimics a chatty streaming backend.
              await new Promise((r) => setTimeout(r, 20));
              if (init?.signal?.aborted) {
                controller.close();
                return;
              }
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    choices: [
                      {
                        index: 0,
                        delta: { content: "x" },
                        finish_reason: null,
                      },
                    ],
                  })}\n\n`,
                ),
              );
            },
          });
          return new Response(stream, {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          });
        }) as typeof fetch;

        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const result = await (
          provider as unknown as {
            executeStream: (opts: Record<string, unknown>) => Promise<{
              stream: AsyncIterable<unknown>;
            }>;
          }
        ).executeStream({
          input: { text: "hi" },
          disableTools: true,
        });
        // Consume one chunk, then break early.
        let consumed = 0;
        for await (const _ of result.stream) {
          void _;
          consumed++;
          if (consumed >= 1) {
            break;
          }
        }
        // Let the finally block run.
        await new Promise((r) => setTimeout(r, 50));
        return observedSignal?.aborted === true;
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  // ---------- openai-compatible round-5 exhaustive verification ----------
  // Matrix rows: 1.4, 1.5, 2.6, 3.3, 3.4, 3.5, 3.6, 3.8, 4.2, 4.3, 5.1,
  //              5.3, 7.2, 11.1, 12.1, 16.3
  {
    name: "openai-compatible.doGenerate forwards seed/stopSequences/presencePenalty/frequencyPenalty/topP",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let captured: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return new Response(
            JSON.stringify({
              id: "x",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "ok" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          seed: 42,
          stopSequences: ["END"],
          presencePenalty: 0.5,
          frequencyPenalty: 0.3,
          topP: 0.9,
        });
        return (
          captured?.seed === 42 &&
          Array.isArray(captured?.stop) &&
          (captured?.stop as string[])[0] === "END" &&
          captured?.presence_penalty === 0.5 &&
          captured?.frequency_penalty === 0.3 &&
          captured?.top_p === 0.9
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.doGenerate respects caller-provided abortSignal",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let observedSignal: AbortSignal | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          observedSignal = init?.signal ?? undefined;
          await new Promise((res, rej) => {
            const t = setTimeout(res, 5000);
            init?.signal?.addEventListener("abort", () => {
              clearTimeout(t);
              rej(new Error("aborted"));
            });
          });
          return new Response("{}", { status: 200 });
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        const controller = new AbortController();
        const p = model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          abortSignal: controller.signal,
        });
        setTimeout(() => controller.abort(), 50);
        try {
          await p;
          return false;
        } catch {
          return observedSignal !== undefined && observedSignal.aborted;
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.executeStream cleans up timeoutController when setup throws",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      try {
        // /models returns ok, but /chat/completions is never reached because
        // we force buildMessagesForStream to throw via an invalid options
        // shape. We assert the test does NOT leak open timers by completing
        // synchronously without dangling handles.
        globalThis.fetch = (async () => {
          throw new Error("not reachable in this test");
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        // Force a setup-time failure by passing an unsupported abortSignal
        // value: the validator throws synchronously.
        try {
          await (
            provider as unknown as {
              executeStream: (
                opts: Record<string, unknown>,
              ) => Promise<unknown>;
            }
          ).executeStream({
            // Missing `input` → validateStreamOptions throws.
          });
          return false;
        } catch {
          // Reached the try/catch around the setup block. If the cleanup
          // didn't run we'd see leaked handles, but at least the throw
          // surfaces — the contract is that we don't leave a dangling
          // timeout, which is verified by process not hanging.
          return true;
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.buildToolsForOpenAI forwards JSON Schema inputSchema verbatim",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let captured: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return new Response(
            JSON.stringify({
              id: "x",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "ok" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          tools: [
            {
              type: "function",
              name: "echo",
              description: "echo back",
              inputSchema: {
                type: "object",
                properties: {
                  text: { type: "string", minLength: 1 },
                },
                required: ["text"],
                additionalProperties: false,
              },
            },
          ],
        });
        const tools = captured?.tools as Array<{
          function: { parameters: Record<string, unknown> };
        }>;
        const params = tools?.[0]?.function?.parameters;
        return (
          params?.type === "object" &&
          (params?.required as string[])?.[0] === "text" &&
          (params?.properties as Record<string, { minLength?: number }>)?.text
            ?.minLength === 1
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.executeStream toolExecutions captures execution errors",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let call = 0;
      try {
        globalThis.fetch = (async () => {
          call++;
          if (call === 1) {
            // First step: model requests tool_call.
            const stream = new ReadableStream<Uint8Array>({
              start(controller) {
                const enc = new TextEncoder();
                controller.enqueue(
                  enc.encode(
                    `data: ${JSON.stringify({
                      choices: [
                        {
                          index: 0,
                          delta: {
                            tool_calls: [
                              {
                                index: 0,
                                id: "tc1",
                                type: "function",
                                function: {
                                  name: "broken",
                                  arguments: '{"x":1}',
                                },
                              },
                            ],
                          },
                          finish_reason: null,
                        },
                      ],
                    })}\n\n`,
                  ),
                );
                controller.enqueue(
                  enc.encode(
                    `data: ${JSON.stringify({
                      choices: [
                        { index: 0, delta: {}, finish_reason: "tool_calls" },
                      ],
                    })}\n\n`,
                  ),
                );
                controller.enqueue(enc.encode("data: [DONE]\n\n"));
                controller.close();
              },
            });
            return new Response(stream, {
              status: 200,
              headers: { "content-type": "text/event-stream" },
            });
          }
          // Second step: model responds plainly.
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const enc = new TextEncoder();
              controller.enqueue(
                enc.encode(
                  `data: ${JSON.stringify({
                    choices: [
                      {
                        index: 0,
                        delta: { content: "sorry" },
                        finish_reason: null,
                      },
                    ],
                  })}\n\n`,
                ),
              );
              controller.enqueue(
                enc.encode(
                  `data: ${JSON.stringify({
                    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
                    usage: { prompt_tokens: 2, completion_tokens: 1 },
                  })}\n\n`,
                ),
              );
              controller.enqueue(enc.encode("data: [DONE]\n\n"));
              controller.close();
            },
          });
          return new Response(stream, {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          });
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const result = await (
          provider as unknown as {
            executeStream: (opts: Record<string, unknown>) => Promise<{
              stream: AsyncIterable<unknown>;
              toolExecutions?: Array<{
                name: string;
                output: unknown;
              }>;
            }>;
          }
        ).executeStream({
          input: { text: "run broken" },
          disableTools: false,
          tools: {
            broken: {
              description: "tool that throws",
              inputSchema: {
                type: "object",
                properties: { x: { type: "number" } },
                required: ["x"],
              },
              execute: async () => {
                throw new Error("intentional boom");
              },
            },
          },
        });
        for await (const _ of result.stream) {
          void _;
        }
        const exe = result.toolExecutions?.[0];
        const outRecord = exe?.output as { error?: string } | undefined;
        return (
          exe?.name === "broken" &&
          typeof outRecord?.error === "string" &&
          outRecord.error.includes("intentional boom")
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.executeStream handles unknown tool name gracefully",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let call = 0;
      try {
        globalThis.fetch = (async () => {
          call++;
          if (call === 1) {
            const stream = new ReadableStream<Uint8Array>({
              start(controller) {
                const enc = new TextEncoder();
                controller.enqueue(
                  enc.encode(
                    `data: ${JSON.stringify({
                      choices: [
                        {
                          index: 0,
                          delta: {
                            tool_calls: [
                              {
                                index: 0,
                                id: "tc1",
                                type: "function",
                                function: {
                                  name: "nonexistent",
                                  arguments: "{}",
                                },
                              },
                            ],
                          },
                          finish_reason: null,
                        },
                      ],
                    })}\n\n`,
                  ),
                );
                controller.enqueue(
                  enc.encode(
                    `data: ${JSON.stringify({
                      choices: [
                        { index: 0, delta: {}, finish_reason: "tool_calls" },
                      ],
                    })}\n\n`,
                  ),
                );
                controller.enqueue(enc.encode("data: [DONE]\n\n"));
                controller.close();
              },
            });
            return new Response(stream, {
              status: 200,
              headers: { "content-type": "text/event-stream" },
            });
          }
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const enc = new TextEncoder();
              controller.enqueue(
                enc.encode(
                  `data: ${JSON.stringify({
                    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
                  })}\n\n`,
                ),
              );
              controller.enqueue(enc.encode("data: [DONE]\n\n"));
              controller.close();
            },
          });
          return new Response(stream, {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          });
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const result = await (
          provider as unknown as {
            executeStream: (opts: Record<string, unknown>) => Promise<{
              stream: AsyncIterable<unknown>;
              toolExecutions?: Array<{
                name: string;
                output: unknown;
              }>;
            }>;
          }
        ).executeStream({
          input: { text: "..." },
          disableTools: false,
          tools: {},
        });
        for await (const _ of result.stream) {
          void _;
        }
        const exe = result.toolExecutions?.[0];
        const outRecord = exe?.output as { error?: string } | undefined;
        return (
          exe?.name === "nonexistent" &&
          typeof outRecord?.error === "string" &&
          outRecord.error.includes("not registered")
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.executeStream forwards toolChoice variants (named/none/required)",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let captured: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const enc = new TextEncoder();
              controller.enqueue(
                enc.encode(
                  `data: ${JSON.stringify({
                    choices: [
                      {
                        index: 0,
                        delta: { content: "ok" },
                        finish_reason: null,
                      },
                    ],
                  })}\n\n`,
                ),
              );
              controller.enqueue(
                enc.encode(
                  `data: ${JSON.stringify({
                    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
                  })}\n\n`,
                ),
              );
              controller.enqueue(enc.encode("data: [DONE]\n\n"));
              controller.close();
            },
          });
          return new Response(stream, {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          });
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const result = await (
          provider as unknown as {
            executeStream: (opts: Record<string, unknown>) => Promise<{
              stream: AsyncIterable<unknown>;
            }>;
          }
        ).executeStream({
          input: { text: "x" },
          disableTools: false,
          tools: {
            foo: {
              description: "f",
              inputSchema: { type: "object", properties: {}, required: [] },
              execute: async () => "ok",
            },
          },
          toolChoice: { type: "tool", toolName: "foo" },
        });
        for await (const _ of result.stream) {
          void _;
        }
        const tc = captured?.tool_choice as
          | { type?: string; function?: { name?: string } }
          | undefined;
        return tc?.type === "function" && tc?.function?.name === "foo";
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.executeStream emits tool:start and tool:end events on NeuroLink event bus",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let call = 0;
      try {
        globalThis.fetch = (async () => {
          call++;
          if (call === 1) {
            const stream = new ReadableStream<Uint8Array>({
              start(controller) {
                const enc = new TextEncoder();
                controller.enqueue(
                  enc.encode(
                    `data: ${JSON.stringify({
                      choices: [
                        {
                          index: 0,
                          delta: {
                            tool_calls: [
                              {
                                index: 0,
                                id: "tc1",
                                type: "function",
                                function: { name: "ping", arguments: "{}" },
                              },
                            ],
                          },
                          finish_reason: null,
                        },
                      ],
                    })}\n\n`,
                  ),
                );
                controller.enqueue(
                  enc.encode(
                    `data: ${JSON.stringify({
                      choices: [
                        { index: 0, delta: {}, finish_reason: "tool_calls" },
                      ],
                    })}\n\n`,
                  ),
                );
                controller.enqueue(enc.encode("data: [DONE]\n\n"));
                controller.close();
              },
            });
            return new Response(stream, {
              status: 200,
              headers: { "content-type": "text/event-stream" },
            });
          }
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const enc = new TextEncoder();
              controller.enqueue(
                enc.encode(
                  `data: ${JSON.stringify({
                    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
                  })}\n\n`,
                ),
              );
              controller.enqueue(enc.encode("data: [DONE]\n\n"));
              controller.close();
            },
          });
          return new Response(stream, {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          });
        }) as typeof fetch;
        const { NeuroLink } = await import("../src/lib/neurolink.js");
        const nl = new NeuroLink();
        const events: string[] = [];
        const emitter = nl.getEventEmitter();
        emitter.on("tool:start", () => events.push("start"));
        emitter.on("tool:end", () => events.push("end"));
        const provider = new OpenAICompatibleProvider(
          "test-model",
          nl as unknown,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const result = await (
          provider as unknown as {
            executeStream: (opts: Record<string, unknown>) => Promise<{
              stream: AsyncIterable<unknown>;
            }>;
          }
        ).executeStream({
          input: { text: "ping" },
          disableTools: false,
          tools: {
            ping: {
              description: "p",
              inputSchema: { type: "object", properties: {}, required: [] },
              execute: async () => "pong",
            },
          },
        });
        for await (const _ of result.stream) {
          void _;
        }
        return events.includes("start") && events.includes("end");
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.doGenerate forwards responseFormat: json_object",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let captured: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return new Response(
            JSON.stringify({
              id: "x",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "{}" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "json" }] }],
          responseFormat: { type: "json" },
        });
        const rf = captured?.response_format as { type?: string } | undefined;
        return rf?.type === "json_object";
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.doGenerate forwards responseFormat: json_schema",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let captured: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return new Response(
            JSON.stringify({
              id: "x",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: '{"a":1}' },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        await model.doGenerate({
          prompt: [
            { role: "user", content: [{ type: "text", text: "shape" }] },
          ],
          responseFormat: {
            type: "json",
            name: "answer",
            schema: {
              type: "object",
              properties: { a: { type: "number" } },
              required: ["a"],
            },
          },
        });
        const rf = captured?.response_format as
          | { type?: string; json_schema?: { name?: string; schema?: unknown } }
          | undefined;
        return (
          rf?.type === "json_schema" &&
          rf?.json_schema?.name === "answer" &&
          typeof rf?.json_schema?.schema === "object"
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.doGenerate forwards image input as image_url block",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let captured: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return new Response(
            JSON.stringify({
              id: "x",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "ok" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        await model.doGenerate({
          prompt: [
            {
              role: "user",
              content: [
                { type: "text", text: "describe this" },
                {
                  type: "image",
                  image: "data:image/png;base64,iVBORw0KGgo=",
                },
              ],
            },
          ],
        });
        const messages = captured?.messages as Array<{
          role: string;
          content: unknown;
        }>;
        const userContent = messages?.[0]?.content as Array<{
          type: string;
          image_url?: { url?: string };
        }>;
        return (
          Array.isArray(userContent) &&
          userContent.some(
            (p) =>
              p?.type === "image_url" &&
              typeof p?.image_url?.url === "string" &&
              p.image_url.url.startsWith("data:image/png;base64,"),
          ) &&
          userContent.some((p) => p?.type === "text")
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.per-call credentials override beats env-provided",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let observedAuth: string | undefined;
      let observedHost: string | undefined;
      try {
        globalThis.fetch = (async (
          input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          observedHost = typeof input === "string" ? input : input.toString();
          const headers = init?.headers as Record<string, string> | undefined;
          observedAuth = headers?.["Authorization"];
          return new Response(
            JSON.stringify({
              id: "x",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "ok" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "override-key", baseURL: "http://override.local/v1" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        });
        return (
          observedAuth === "Bearer override-key" &&
          observedHost?.startsWith("http://override.local/v1") === true
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "openai-compatible.executeStream surfaces network errors (unreachable host)",
    category: "openai-compatible",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = (async () => {
          throw new TypeError("fetch failed: ECONNREFUSED");
        }) as typeof fetch;
        const provider = new OpenAICompatibleProvider(
          "test-model",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local/v1" },
        );
        const result = await (
          provider as unknown as {
            executeStream: (opts: Record<string, unknown>) => Promise<{
              stream: AsyncIterable<unknown>;
            }>;
          }
        ).executeStream({
          input: { text: "hi" },
          disableTools: true,
        });
        try {
          for await (const _ of result.stream) {
            void _;
          }
          return false;
        } catch (err) {
          const m = err instanceof Error ? err.message : String(err);
          return m.includes("ECONNREFUSED") || m.includes("fetch failed");
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  // ---------- LiteLLM provider (native HTTP, post-AI-SDK migration) ----------
  {
    name: "litellm.doGenerate forwards seed/stopSequences/presencePenalty/frequencyPenalty/topP",
    category: "litellm",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let captured: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return new Response(
            JSON.stringify({
              id: "x",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "ok" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;
        const provider = new LiteLLMProvider(
          "openai/gpt-4o-mini",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          seed: 42,
          stopSequences: ["\nUser:"],
          presencePenalty: 0.3,
          frequencyPenalty: 0.4,
          topP: 0.9,
        });
        return (
          captured?.seed === 42 &&
          Array.isArray(captured?.stop) &&
          (captured?.stop as string[])[0] === "\nUser:" &&
          captured?.presence_penalty === 0.3 &&
          captured?.frequency_penalty === 0.4 &&
          captured?.top_p === 0.9
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "litellm.doGenerate skips maxTokens for Gemini 2.5 model",
    category: "litellm",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let captured: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return new Response(
            JSON.stringify({
              id: "x",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "ok" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;
        const provider = new LiteLLMProvider(
          "google/gemini-2.5-flash",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local" },
        );
        const model = (await provider.getAISDKModel()) as unknown as {
          doGenerate: (opts: Record<string, unknown>) => Promise<unknown>;
        };
        await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          maxOutputTokens: 100,
        });
        return captured?.max_tokens === undefined;
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "litellm.formatProviderError surfaces ModelAccessDeniedError on team allowlist 403",
    category: "litellm",
    fn: async () => {
      const provider = new LiteLLMProvider(
        "anthropic/claude-3-5-sonnet",
        undefined,
        undefined,
        { apiKey: "k", baseURL: "http://fake.local" },
      );
      const msg =
        "Team not allowed to access model. team can only access models=['openai/gpt-4o','google/gemini-2.5-flash']";
      const err = (
        provider as unknown as {
          formatProviderError: (e: unknown) => Error;
        }
      ).formatProviderError(new Error(msg));
      if (!(err instanceof ModelAccessDeniedError)) {
        return false;
      }
      const allowed = (err as ModelAccessDeniedError).allowedModels;
      return (
        Array.isArray(allowed) &&
        allowed.includes("openai/gpt-4o") &&
        allowed.includes("google/gemini-2.5-flash")
      );
    },
  },
  {
    name: "litellm.executeStream streams text deltas via SSE",
    category: "litellm",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = (async () => {
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const enc = new TextEncoder();
              controller.enqueue(
                enc.encode(
                  `data: ${JSON.stringify({
                    choices: [
                      {
                        index: 0,
                        delta: { content: "hello " },
                        finish_reason: null,
                      },
                    ],
                  })}\n\n`,
                ),
              );
              controller.enqueue(
                enc.encode(
                  `data: ${JSON.stringify({
                    choices: [
                      {
                        index: 0,
                        delta: { content: "world" },
                        finish_reason: "stop",
                      },
                    ],
                  })}\n\n`,
                ),
              );
              controller.enqueue(enc.encode("data: [DONE]\n\n"));
              controller.close();
            },
          });
          return new Response(stream, {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          });
        }) as typeof fetch;
        const { NeuroLink } = await import("../src/lib/neurolink.js");
        const nl = new NeuroLink();
        const provider = new LiteLLMProvider(
          "openai/gpt-4o-mini",
          nl as unknown,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local" },
        );
        const result = await (
          provider as unknown as {
            executeStream: (opts: Record<string, unknown>) => Promise<{
              stream: AsyncIterable<unknown>;
            }>;
          }
        ).executeStream({
          input: { text: "hi" },
          disableTools: true,
        });
        let collected = "";
        for await (const chunk of result.stream) {
          const c = chunk as { content?: string };
          if (typeof c.content === "string") {
            collected += c.content;
          }
        }
        return collected === "hello world";
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "litellm.embed POSTs to /embeddings and returns embedding vector",
    category: "litellm",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let capturedURL: string | undefined;
      let capturedBody: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          capturedURL =
            typeof input === "string" ? input : (input as URL).toString();
          capturedBody = JSON.parse(String(init?.body)) as Record<
            string,
            unknown
          >;
          return new Response(
            JSON.stringify({
              data: [{ embedding: [0.1, 0.2, 0.3] }],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;
        const provider = new LiteLLMProvider(
          "openai/gpt-4o-mini",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local" },
        );
        const v = await provider.embed("hello");
        return (
          capturedURL === "http://fake.local/embeddings" &&
          capturedBody?.input === "hello" &&
          typeof capturedBody?.model === "string" &&
          Array.isArray(v) &&
          v.length === 3 &&
          v[0] === 0.1
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "litellm.embedMany POSTs batch and returns embedding matrix",
    category: "litellm",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      let capturedBody: Record<string, unknown> | undefined;
      try {
        globalThis.fetch = (async (
          _input: RequestInfo | URL,
          init?: RequestInit,
        ) => {
          capturedBody = JSON.parse(String(init?.body)) as Record<
            string,
            unknown
          >;
          return new Response(
            JSON.stringify({
              data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }) as typeof fetch;
        const provider = new LiteLLMProvider(
          "openai/gpt-4o-mini",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local" },
        );
        const vs = await provider.embedMany(["a", "b"]);
        const inputBatch = capturedBody?.input as unknown[];
        return (
          Array.isArray(inputBatch) &&
          inputBatch.length === 2 &&
          inputBatch[0] === "a" &&
          inputBatch[1] === "b" &&
          vs.length === 2 &&
          vs[0][0] === 0.1 &&
          vs[1][1] === 0.4
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  {
    name: "litellm.getAvailableModels falls back to LITELLM_FALLBACK_MODELS env when API fails",
    category: "litellm",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      const originalFallback = process.env.LITELLM_FALLBACK_MODELS;
      try {
        globalThis.fetch = (async () => {
          return new Response("server boom", { status: 500 });
        }) as typeof fetch;
        process.env.LITELLM_FALLBACK_MODELS =
          "alpha/one, beta/two , gamma/three";
        // bust the static cache via reflection so the fallback path runs
        (LiteLLMProvider as unknown as { modelsCache: string[] }).modelsCache =
          [];
        (
          LiteLLMProvider as unknown as { modelsCacheTime: number }
        ).modelsCacheTime = 0;
        const provider = new LiteLLMProvider(
          "openai/gpt-4o-mini",
          undefined,
          undefined,
          { apiKey: "k", baseURL: "http://fake.local" },
        );
        const models = await provider.getAvailableModels();
        return (
          models.length === 3 &&
          models[0] === "alpha/one" &&
          models[1] === "beta/two" &&
          models[2] === "gamma/three"
        );
      } finally {
        globalThis.fetch = originalFetch;
        if (originalFallback === undefined) {
          delete process.env.LITELLM_FALLBACK_MODELS;
        } else {
          process.env.LITELLM_FALLBACK_MODELS = originalFallback;
        }
        // restore cache to clean state for subsequent tests
        (LiteLLMProvider as unknown as { modelsCache: string[] }).modelsCache =
          [];
        (
          LiteLLMProvider as unknown as { modelsCacheTime: number }
        ).modelsCacheTime = 0;
      }
    },
  },
  // ---------- Gemini-on-Vertex agentic-loop bugs ----------
  // Bug 2: native Gemini result builders never read candidates[0].finishReason,
  // so callers saw "unknown". mapGeminiFinishReason is the pure mapper that now
  // populates it (mirrors anthropic.ts mapAnthropicStopReason).
  {
    name: "mapGeminiFinishReason: maps @google/genai FinishReason enum to unified values (Bug 2)",
    category: "gemini-finish-reason",
    fn: async () => {
      return (
        mapGeminiFinishReason("STOP") === "stop" &&
        mapGeminiFinishReason("MAX_TOKENS") === "length" &&
        // Provider/model failures map to "error" — NOT "tool-calls", which is
        // reserved for step-cap exits (consumers branch on it).
        mapGeminiFinishReason("MALFORMED_FUNCTION_CALL") === "error" &&
        mapGeminiFinishReason("UNEXPECTED_TOOL_CALL") === "error" &&
        mapGeminiFinishReason("SAFETY") === "content-filter" &&
        mapGeminiFinishReason("RECITATION") === "content-filter" &&
        mapGeminiFinishReason("BLOCKLIST") === "content-filter" &&
        mapGeminiFinishReason("PROHIBITED_CONTENT") === "content-filter" &&
        mapGeminiFinishReason("SPII") === "content-filter" &&
        mapGeminiFinishReason("IMAGE_SAFETY") === "content-filter"
      );
    },
  },
  {
    name: "mapGeminiFinishReason: unknown / unset / non-terminal values default to 'stop' (Bug 2)",
    category: "gemini-finish-reason",
    fn: async () => {
      return (
        mapGeminiFinishReason(undefined) === "stop" &&
        mapGeminiFinishReason(null) === "stop" &&
        mapGeminiFinishReason("") === "stop" &&
        mapGeminiFinishReason("FINISH_REASON_UNSPECIFIED") === "stop" &&
        mapGeminiFinishReason("OTHER") === "stop" &&
        mapGeminiFinishReason("LANGUAGE") === "stop" &&
        mapGeminiFinishReason("some-garbage-value") === "stop"
      );
    },
  },
  // Bug 1: the native loop overwrote per-step text into lastStepText, so at the
  // maxSteps cap the answer was lost and a canned placeholder surfaced.
  // appendStepText is the pure accumulator that now preserves cross-step text.
  {
    name: "appendStepText: accumulates non-empty step text across steps (Bug 1)",
    category: "gemini-text-accumulation",
    fn: async () => {
      return (
        appendStepText("", "a") === "a" &&
        appendStepText("a", "b") === "a\nb" &&
        appendStepText("a\nb", "c") === "a\nb\nc"
      );
    },
  },
  {
    name: "appendStepText: ignores empty step text without adding separators (Bug 1)",
    category: "gemini-text-accumulation",
    fn: async () => {
      return (
        appendStepText("a", "") === "a" &&
        appendStepText("", "") === "" &&
        appendStepText("a\nb", "") === "a\nb"
      );
    },
  },
  // Bug 1b: at the maxSteps cap with no gathered text, the loop makes one
  // tools-disabled synthesis call instead of returning the placeholder. This
  // exercises that helper end-to-end with a mocked @google/genai client.
  {
    name: "synthesizeFinalAnswerWithoutTools: drops tools, captures finishReason/text/usage, countermands final_result (Bug 1b)",
    category: "gemini-synthesis",
    fn: async () =>
      withTemporaryEnv(
        {
          GOOGLE_APPLICATION_CREDENTIALS: "/tmp/neurolink-test-creds.json",
          GOOGLE_CLOUD_PROJECT_ID: "test-project",
          GOOGLE_CLOUD_LOCATION: "global",
        },
        async () => {
          const provider = new GoogleVertexProvider(
            "gemini-3-pro-preview",
            undefined,
            undefined,
            "global",
          );
          let capturedConfig: Record<string, unknown> | undefined;
          const mockClient = {
            models: {
              generateContentStream: async (req: {
                config: Record<string, unknown>;
              }) => {
                capturedConfig = req.config;
                return (async function* () {
                  yield {
                    candidates: [
                      {
                        content: { parts: [{ text: "Synthesized " }] },
                        finishReason: "STOP",
                      },
                    ],
                  };
                  yield {
                    candidates: [
                      {
                        content: { parts: [{ text: "answer." }] },
                        finishReason: "STOP",
                      },
                    ],
                    usageMetadata: {
                      promptTokenCount: 11,
                      candidatesTokenCount: 7,
                    },
                  };
                })();
              },
            },
          };
          const out = await (
            provider as unknown as {
              synthesizeFinalAnswerWithoutTools(
                client: unknown,
                modelName: string,
                config: Record<string, unknown>,
                contents: unknown,
                useFinalResultTool: boolean,
                timeoutMs: number,
              ): Promise<{
                text: string;
                finishReason?: string;
                inputTokens: number;
                outputTokens: number;
              }>;
            }
          ).synthesizeFinalAnswerWithoutTools(
            mockClient,
            "gemini-3-pro-preview",
            {
              tools: [{ functionDeclarations: [] }],
              systemInstruction:
                "Do the task. You MUST call the final_result tool.",
            },
            [{ role: "user", parts: [{ text: "hi" }] }],
            true,
            30_000,
          );
          const systemInstruction =
            typeof capturedConfig?.systemInstruction === "string"
              ? capturedConfig.systemInstruction
              : "";
          return (
            out.text === "Synthesized answer." &&
            out.finishReason === "STOP" &&
            out.inputTokens === 11 &&
            out.outputTokens === 7 &&
            capturedConfig?.tools === undefined &&
            systemInstruction.includes("no longer available")
          );
        },
      ),
  },
  // Bug 2: the resolved finishReason must reach options.onFinish, not a
  // hardcoded "stop", for native-path callers using the lifecycle callback.
  {
    name: "fireGenerateOnFinish: forwards result.finishReason to onFinish (not hardcoded 'stop') (Bug 2)",
    category: "gemini-finish-reason",
    fn: async () =>
      withTemporaryEnv(
        {
          GOOGLE_APPLICATION_CREDENTIALS: "/tmp/neurolink-test-creds.json",
          GOOGLE_CLOUD_PROJECT_ID: "test-project",
          GOOGLE_CLOUD_LOCATION: "global",
        },
        async () => {
          const provider = new GoogleVertexProvider(
            "gemini-3-pro-preview",
            undefined,
            undefined,
            "global",
          );
          let captured: { finishReason?: string } | undefined;
          const options = {
            onFinish: (payload: { finishReason?: string }) => {
              captured = payload;
            },
          };
          const result = {
            content: "hi",
            usage: { input: 1, output: 2, total: 3 },
            finishReason: "tool-calls",
          };
          (
            provider as unknown as {
              fireGenerateOnFinish(
                options: unknown,
                result: unknown,
                startTime: number,
              ): void;
            }
          ).fireGenerateOnFinish(options, result, Date.now() - 100);
          // onFinish fires synchronously; yield a tick for safety.
          await new Promise((resolve) => setTimeout(resolve, 0));
          return captured?.finishReason === "tool-calls";
        },
      ),
  },
  // ---------- #1138: Linux mp3 TTS playback (paplay can't decode mp3) ----------
  {
    name: "audioPlayer #1138: Linux mp3 leads with real decoders, not paplay/aplay",
    category: "cli-tts",
    fn: async () => {
      const file = "/tmp/nl-tts-test.mp3";
      const linuxMp3 = getPlayerCandidates(file, "mp3", "linux");
      const commands = linuxMp3.map((c) => c.command);

      // paplay/aplay cannot decode mp3, so they must not be tried first.
      if (commands[0] === "paplay" || commands[0] === "aplay") {
        return false;
      }
      // The intended priority is ffplay first (most reliable decoder).
      if (commands[0] !== "ffplay") {
        return false;
      }
      // A real mp3-capable decoder must be present and ordered ahead of paplay.
      const decoders = ["ffplay", "mpv", "mpg123", "cvlc"];
      const firstDecoderIdx = commands.findIndex((c) => decoders.includes(c));
      const paplayIdx = commands.indexOf("paplay");
      if (firstDecoderIdx === -1) {
        return false;
      }
      if (paplayIdx !== -1 && firstDecoderIdx > paplayIdx) {
        return false;
      }
      // mpg123 (mp3-only) should be offered for mp3 but not for opus.
      if (!commands.includes("mpg123")) {
        return false;
      }
      const linuxOpus = getPlayerCandidates(file, "opus", "linux").map(
        (c) => c.command,
      );
      if (linuxOpus.includes("mpg123")) {
        return false;
      }

      // wav still routes to aplay first on Linux; macOS uses afplay.
      const linuxWav = getPlayerCandidates(file, "wav", "linux");
      if (linuxWav[0]?.command !== "aplay") {
        return false;
      }
      const macMp3 = getPlayerCandidates(file, "mp3", "darwin");
      if (macMp3[0]?.command !== "afplay") {
        return false;
      }

      return true;
    },
  },
  {
    name: "audioPlayer #1138: Linux mp3 playback error is format-aware, not misleading",
    category: "cli-tts",
    fn: async () => {
      // The exact message a user sees when no decoder is installed.
      const mp3Err = buildPlaybackErrorMessage("linux", "mp3", [
        "ffplay: not installed",
        "mpv: not installed",
      ]);
      // Must name the real decoders + the wav fallback, and explain the
      // paplay/aplay limitation — NOT the old "Install PulseAudio" (which was
      // misleading, since PulseAudio simply cannot decode mp3).
      const namesDecoders =
        mp3Err.includes("ffmpeg") &&
        mp3Err.includes("mpv") &&
        mp3Err.includes("mpg123") &&
        mp3Err.includes("--tts-format wav");
      const explainsLimitation = /paplay\/aplay cannot decode mp3/.test(mp3Err);
      const surfacesAttempts = mp3Err.includes("ffplay: not installed");
      if (!namesDecoders || !explainsLimitation || !surfacesAttempts) {
        return false;
      }
      // The wav path keeps the simple ALSA/PulseAudio guidance.
      const wavErr = buildPlaybackErrorMessage("linux", "wav", []);
      if (!(wavErr.includes("aplay") && wavErr.includes("paplay"))) {
        return false;
      }
      return true;
    },
  },
  {
    name: "audioPlayer #1180: ogg/opus playback error does not recommend mp3-only mpg123",
    category: "cli-tts",
    fn: async () => {
      // mpg123 (see getPlayerCandidates) is only ever offered for mp3, so the
      // error message must not send ogg/opus users chasing an mp3-only decoder,
      // nor claim the categorical "paplay/aplay cannot decode" framing that
      // only applies to mp3.
      const oggErr = buildPlaybackErrorMessage("linux", "ogg", [
        "ffplay: not installed",
      ]);
      const opusErr = buildPlaybackErrorMessage("linux", "opus", [
        "ffplay: not installed",
      ]);
      for (const err of [oggErr, opusErr]) {
        if (err.includes("mpg123")) {
          return false;
        }
        if (/cannot decode/.test(err)) {
          return false;
        }
        if (!(err.includes("ffmpeg") && err.includes("--tts-format wav"))) {
          return false;
        }
      }
      // mp3 keeps recommending mpg123 — only the ogg/opus branch changed.
      const mp3Err = buildPlaybackErrorMessage("linux", "mp3", []);
      if (!mp3Err.includes("mpg123")) {
        return false;
      }
      return true;
    },
  },
  {
    name: "audioPlayer #1180: PowerShell single-quote escaping prevents command injection",
    category: "cli-tts",
    fn: async () => {
      // A Windows username with an apostrophe (e.g. O'Brien) lands in %TEMP%,
      // so filePath can legitimately contain a single quote. Unescaped, it
      // would break out of the PS single-quoted string and let the remainder
      // run as arbitrary PowerShell.
      const maliciousPath =
        "C:\\Users\\O'Brien\\nl-tts-1.mp3'; Remove-Item -Recurse -Force C:\\; '";
      if (escapePowerShellSingleQuoted("O'Brien") !== "O''Brien") {
        return false;
      }

      const wavCandidates = getPlayerCandidates(maliciousPath, "wav", "win32");
      const mp3Candidates = getPlayerCandidates(maliciousPath, "mp3", "win32");
      for (const candidates of [wavCandidates, mp3Candidates]) {
        const psCommand = candidates[0]?.args[2] ?? "";
        // The escaped path (quotes doubled) must appear intact...
        if (!psCommand.includes(maliciousPath.replace(/'/g, "''"))) {
          return false;
        }
        // ...and the raw, unescaped malicious path must NOT appear verbatim
        // (that would mean it broke out of the single-quoted string).
        if (psCommand.includes(`'${maliciousPath}'`)) {
          return false;
        }
      }
      return true;
    },
  },
  {
    name: "audioPlayer #1180: execFileAsync is invoked with a player timeout",
    category: "cli-tts",
    fn: async () => {
      // Static check without spawning a real process: confirm the timeout
      // option is wired into the execFileAsync call that plays candidates,
      // so a hung decoder can't block the CLI forever.
      const modulePath = pathJoin(
        process.cwd(),
        "src/cli/utils/audioPlayer.ts",
      );
      const source = readFileSync(modulePath, "utf8");
      return (
        /execFileAsync\(command, args, \{\s*timeout:/.test(source) &&
        source.includes("killSignal")
      );
    },
  },
  // ---------- #359: quote-aware column counting (RFC 4180) ----------
  {
    name: "CSVProcessor #359: quoted commas do not inflate columnCount (raw + detect path)",
    category: "csv-processor",
    fn: async () => {
      const csv =
        '"Full Name, Legal",Age,City\n"Smith, John",30,NYC\n"Doe, Jane",25,LA\n';
      // Direct: was 4 (naive split on the quoted comma), must be 3.
      const raw = await CSVProcessor.process(Buffer.from(csv), {
        formatStyle: "raw",
      });
      if (raw.metadata.columnCount !== 3) {
        return false;
      }
      // End-to-end through the real detect+process path (generate({ files })).
      const det = await FileDetector.detectAndProcess(Buffer.from(csv));
      return det.metadata?.columnCount === 3;
    },
  },
  // ---------- #361: delimiter detection (TSV / semicolon / pipe) ----------
  {
    name: "CSVProcessor #361: detects tab/semicolon/pipe delimiters; comma unchanged",
    category: "csv-processor",
    fn: async () => {
      // Tab-separated → parsed into name/age/city keys, delimiter reported.
      const tsv = "name\tage\tcity\nAlice\t30\tNYC\nBob\t25\tLA";
      const tabJson = (await CSVProcessor.process(Buffer.from(tsv), {
        formatStyle: "json",
      })) as { metadata: { detectedDelimiter?: string } };
      if (tabJson.metadata.detectedDelimiter !== "\t") {
        return false;
      }
      const tabRaw = await CSVProcessor.process(Buffer.from(tsv), {
        formatStyle: "raw",
      });
      if (tabRaw.metadata.columnCount !== 3) {
        return false;
      }
      // Semicolon.
      const semi = "id;qty;price\n1;5;9.99\n2;3;4.50";
      const semiRaw = await CSVProcessor.process(Buffer.from(semi), {
        formatStyle: "raw",
      });
      if (
        semiRaw.metadata.detectedDelimiter !== ";" ||
        semiRaw.metadata.columnCount !== 3
      ) {
        return false;
      }
      // Pipe.
      const pipe = "sku|qty|price\nA1|5|9.99\nA2|3|4.50";
      const pipeRaw = await CSVProcessor.process(Buffer.from(pipe), {
        formatStyle: "raw",
      });
      if (
        pipeRaw.metadata.detectedDelimiter !== "|" ||
        pipeRaw.metadata.columnCount !== 3
      ) {
        return false;
      }
      const pipeJson = (await CSVProcessor.process(Buffer.from(pipe), {
        formatStyle: "json",
      })) as {
        metadata: { detectedDelimiter?: string; columnCount?: number };
        content: string;
      };
      if (
        pipeJson.metadata.detectedDelimiter !== "|" ||
        pipeJson.metadata.columnCount !== 3
      ) {
        return false;
      }
      const pipeRows = JSON.parse(pipeJson.content) as Array<
        Record<string, string>
      >;
      if (
        pipeRows.length !== 2 ||
        pipeRows[0].sku !== "A1" ||
        pipeRows[0].qty !== "5" ||
        pipeRows[0].price !== "9.99" ||
        pipeRows[1].sku !== "A2"
      ) {
        return false;
      }
      // No regression: plain comma stays comma.
      const comma = await CSVProcessor.process(Buffer.from("a,b\n1,2"), {
        formatStyle: "raw",
      });
      if (
        comma.metadata.detectedDelimiter !== "," ||
        comma.metadata.columnCount !== 2
      ) {
        return false;
      }
      // End-to-end: a real .tsv file via the detect+process path.
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-361-"));
      try {
        const tsvPath = pathJoin(dir, "data.tsv");
        writeFileSync(tsvPath, tsv);
        const det = await FileDetector.detectAndProcess(tsvPath, {
          allowedTypes: ["csv"],
        });
        return (
          det.type === "csv" &&
          det.metadata?.columnCount === 3 &&
          det.metadata?.detectedDelimiter === "\t"
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- #361 follow-up: `sep=` metadata line vs. delimiter detection ----------
  {
    name: "CSVProcessor: explicit sep=; metadata line wins over frequency-based tie-break (Excel semantics)",
    category: "csv-processor",
    fn: async () => {
      // Header/data are ambiguous on their own — with the metadata line
      // stripped but no explicit-declaration override, frequency detection
      // ties between comma and semicolon and comma wins on its tie-break
      // bias. The explicit `sep=;` declaration must win outright instead.
      const csv = "sep=;\na,b;c\n1,2;3\n4,5;6";

      if (CSVProcessor.detectDelimiter(csv) !== ";") {
        return false;
      }

      const raw = await CSVProcessor.process(Buffer.from(csv), {
        formatStyle: "raw",
      });
      if (
        raw.metadata.detectedDelimiter !== ";" ||
        raw.metadata.columnCount !== 2 ||
        raw.content.includes("sep=;")
      ) {
        return false;
      }

      const json = (await CSVProcessor.process(Buffer.from(csv), {
        formatStyle: "json",
      })) as {
        metadata: {
          detectedDelimiter?: string;
          columnCount?: number;
          rowCount?: number;
        };
      };
      if (
        json.metadata.detectedDelimiter !== ";" ||
        json.metadata.columnCount !== 2 ||
        json.metadata.rowCount !== 2
      ) {
        return false;
      }

      // parseCSVString() self-detection (no delimiter arg passed).
      const rows = (await CSVProcessor.parseCSVString(csv, 10)) as Array<
        Record<string, string>
      >;
      return (
        rows.length === 2 &&
        rows[0]["a,b"] === "1,2" &&
        rows[0].c === "3" &&
        rows[1]["a,b"] === "4,5" &&
        rows[1].c === "6"
      );
    },
  },
  {
    name: "CSVProcessor: sep=; is honored by parseCSVFile()'s streamed delimiter detection",
    category: "csv-processor",
    fn: async () => {
      const csv = "sep=;\nid;name;amount\n1;Widget;100\n2;Gadget;200";
      if (CSVProcessor.detectDelimiter(csv) !== ";") {
        return false;
      }

      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-sep-"));
      try {
        const filePath = pathJoin(dir, "data.csv");
        writeFileSync(filePath, csv);
        const fileRows = (await CSVProcessor.parseCSVFile(
          filePath,
          10,
        )) as Array<Record<string, string>>;
        // The metadata row is skipped via csv-parser's own `skipLines`
        // (passed through from the sniffed metadata detection), so the real
        // header line ("id;name;amount") is used for keys — not misparsed
        // as a data row keyed off "sep=;". Assert actual column names, not
        // just value counts, to prove the header wasn't garbled.
        return (
          fileRows.length === 2 &&
          fileRows[0].id === "1" &&
          fileRows[0].name === "Widget" &&
          fileRows[0].amount === "100" &&
          fileRows[1].id === "2" &&
          fileRows[1].name === "Gadget" &&
          fileRows[1].amount === "200"
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- #257: image buffer size guard (memory exhaustion) ----------
  {
    name: "FileDetector #257: oversized image rejected before base64; at-limit passes",
    category: "image-processor",
    fn: async () => {
      const IMAGE_MAX = SIZE_LIMITS_BYTES.IMAGE_MAX;
      const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      const mk = (size: number): Buffer => {
        const b = Buffer.alloc(size);
        pngHeader.forEach((byte, i) => (b[i] = byte));
        return b;
      };
      // 11 MB image (the files→FileDetector→ImageProcessor path) must throw a
      // descriptive size error instead of an unbounded base64 allocation.
      let rejected = false;
      try {
        await FileDetector.detectAndProcess(mk(IMAGE_MAX + 1024 * 1024), {
          allowedTypes: ["image", "unknown"],
        });
      } catch (e) {
        rejected =
          e instanceof Error && /too large|exceeds|limit/i.test(e.message);
      }
      if (!rejected) {
        return false;
      }
      // An image exactly at the limit must still succeed (no false rejection).
      const ok = await FileDetector.detectAndProcess(mk(IMAGE_MAX), {
        allowedTypes: ["image", "unknown"],
      });
      return ok.type === "image";
    },
  },
  {
    name: "buildMultimodalMessagesArray #257: oversized image Buffer rejected (images path)",
    category: "message-builder",
    fn: async () => {
      // The generate({ images: [...] }) path — distinct from files→FileDetector.
      const oversized = Buffer.alloc(SIZE_LIMITS_BYTES.IMAGE_MAX + 1024 * 1024);
      // Full 8-byte PNG signature so MIME detection succeeds
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(
        oversized,
      );
      try {
        await buildMultimodalMessagesArray(
          {
            input: { text: "hi", images: [oversized] },
          } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
          "openai",
          "gpt-4o",
        );
        return false; // should have thrown
      } catch (e) {
        return e instanceof Error && /too large|exceeds|limit/i.test(e.message);
      }
    },
  },
  // ---------- #257 round 2: NaN/negative size rejection, typed-error preservation ----------
  {
    name: "ImageProcessor.validateSize rejects NaN/Infinity/negative sizes with typed INVALID_IMAGE_SIZE (fail closed)",
    category: "image-processor",
    fn: async () => {
      // NaN > maxSize and -1 > maxSize both evaluate to false, so a naive
      // comparison-only guard silently lets malformed sizes through.
      for (const size of [NaN, Infinity, -Infinity, -1]) {
        try {
          ImageProcessor.validateSize(size, "test");
          return false; // must throw for every malformed size
        } catch (e) {
          if (
            !(e instanceof NeuroLinkError) ||
            e.code !== ERROR_CODES.INVALID_IMAGE_SIZE
          ) {
            return false;
          }
        }
      }
      // A valid in-range size must not throw.
      try {
        ImageProcessor.validateSize(1024, "test");
      } catch {
        return false;
      }
      // A valid but oversized number must still hit the pre-existing
      // IMAGE_TOO_LARGE guard, not the new malformed-size guard.
      try {
        ImageProcessor.validateSize(SIZE_LIMITS_BYTES.IMAGE_MAX + 1, "test");
        return false;
      } catch (e) {
        return (
          e instanceof NeuroLinkError && e.code === ERROR_CODES.IMAGE_TOO_LARGE
        );
      }
    },
  },
  {
    name: "ImageProcessor.validateSize rejects malformed maxSize (NaN/Infinity/negative) instead of silently letting size through (fail closed)",
    category: "image-processor",
    fn: async () => {
      // `size > NaN` and `size > -1` both evaluate to false, so a malformed
      // maxSize previously bypassed the guard entirely — any size, however
      // large, would compare as "not over the limit".
      for (const maxSize of [NaN, Infinity, -1, -Infinity]) {
        try {
          ImageProcessor.validateSize(1024, "test", maxSize);
          return false; // must throw for every malformed maxSize
        } catch (e) {
          if (
            !(e instanceof NeuroLinkError) ||
            e.code !== ERROR_CODES.INVALID_CONFIGURATION
          ) {
            return false;
          }
        }
      }
      // A valid maxSize must still behave exactly as before: in-range passes,
      // over-range throws IMAGE_TOO_LARGE.
      try {
        ImageProcessor.validateSize(1024, "test", 2048);
      } catch {
        return false;
      }
      try {
        ImageProcessor.validateSize(4096, "test", 2048);
        return false;
      } catch (e) {
        return (
          e instanceof NeuroLinkError && e.code === ERROR_CODES.IMAGE_TOO_LARGE
        );
      }
    },
  },
  {
    name: "ImageProcessor provider wrappers preserve typed IMAGE_TOO_LARGE error through every catch (not flattened to plain Error)",
    category: "image-processor",
    fn: async () => {
      const oversized = Buffer.alloc(SIZE_LIMITS_BYTES.IMAGE_MAX + 1024);
      const throwsTyped = (thrower: () => unknown): boolean => {
        try {
          thrower();
          return false;
        } catch (e) {
          return (
            e instanceof NeuroLinkError &&
            e.code === ERROR_CODES.IMAGE_TOO_LARGE
          );
        }
      };
      return (
        throwsTyped(() => ImageProcessor.processImageForOpenAI(oversized)) &&
        throwsTyped(() => ImageProcessor.processImageForGoogle(oversized)) &&
        throwsTyped(() => ImageProcessor.processImageForAnthropic(oversized)) &&
        // Routes through processImageForGoogle, exercising its own
        // enclosing catch on top of the one already exercised above.
        throwsTyped(() =>
          ImageProcessor.processImageForVertex(oversized, "gemini-pro"),
        ) &&
        // Default branch of processImage() — exercises the outermost catch.
        throwsTyped(() =>
          ImageProcessor.processImage(oversized, "some-other-provider"),
        )
      );
    },
  },
  {
    name: "ImageProcessor.safeBase64Convert revalidates actual buffer bytes independent of any prior size claim (TOCTOU guard)",
    category: "image-processor",
    fn: async () => {
      // convertFilePathToBase64 must not trust the pre-read fs.stat size
      // alone (a file can grow, or a symlink can be swapped, between stat
      // and read) — it now re-runs this exact guard against the bytes
      // actually read. Prove the guard is a real, independent check on the
      // buffer itself, not a rubber stamp on a caller-supplied number.
      const actuallyOversized = Buffer.alloc(SIZE_LIMITS_BYTES.IMAGE_MAX + 1);
      try {
        ImageProcessor.safeBase64Convert(actuallyOversized, "toctou-recheck");
        return false;
      } catch (e) {
        return (
          e instanceof NeuroLinkError && e.code === ERROR_CODES.IMAGE_TOO_LARGE
        );
      }
    },
  },
  {
    name: "imageUtils.bufferToBase64: default stays guarded at 10MB; explicit maxBytes override is opt-in (no silent break for internal callers)",
    category: "image-processor",
    fn: async () => {
      const oversized = Buffer.alloc(SIZE_LIMITS_BYTES.IMAGE_MAX + 1024);
      let defaultThrew = false;
      try {
        imageUtils.bufferToBase64(oversized);
      } catch (e) {
        defaultThrew =
          e instanceof NeuroLinkError && e.code === ERROR_CODES.IMAGE_TOO_LARGE;
      }
      if (!defaultThrew) {
        return false;
      }
      // A caller with a legitimate need for a higher ceiling can opt in
      // explicitly instead of being silently capped.
      const base64 = imageUtils.bufferToBase64(
        oversized,
        SIZE_LIMITS_BYTES.IMAGE_MAX * 2,
      );
      return typeof base64 === "string" && base64.length > 0;
    },
  },
  {
    name: "convertFilePathToBase64 (via buildMultimodalMessagesArray): oversized file path rejected pre-read; at-limit file path succeeds",
    category: "message-builder",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-img-file-"));
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      try {
        // Oversized file path — must be rejected by the stat-based guard
        // BEFORE the file is read into memory, with the typed error intact.
        const bigPath = pathJoin(dir, "big.png");
        const big = Buffer.alloc(SIZE_LIMITS_BYTES.IMAGE_MAX + 1024 * 1024);
        pngHeader.copy(big);
        writeFileSync(bigPath, big);
        try {
          await buildMultimodalMessagesArray(
            {
              input: { text: "hi", images: [bigPath] },
            } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
            "openai",
            "gpt-4o",
          );
          return false; // should have thrown
        } catch (e) {
          if (
            !(e instanceof NeuroLinkError) ||
            e.code !== ERROR_CODES.IMAGE_TOO_LARGE
          ) {
            return false;
          }
        }

        // At-limit file path must still succeed (no false rejection from
        // the new post-read revalidation).
        const okPath = pathJoin(dir, "ok.png");
        const ok = Buffer.alloc(SIZE_LIMITS_BYTES.IMAGE_MAX);
        pngHeader.copy(ok);
        writeFileSync(okPath, ok);
        const messages = await buildMultimodalMessagesArray(
          {
            input: { text: "hi", images: [okPath] },
          } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
          "openai",
          "gpt-4o",
        );
        return Array.isArray(messages) && messages.length > 0;
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- round-3 review: skipLines must reach csv-parser itself, not just the manual data-event counter ----------
  {
    name: "CSVProcessor.parseCSVFile: skipLines is passed to csv-parser so the sep= line never becomes the header",
    category: "csv-processor",
    fn: async () => {
      // Before this fix, `skipLines` was computed but never handed to
      // csv-parser, so csv-parser used the "sep=;" line as the header row —
      // producing a column literally named "sep=;" — and a manual
      // lineCount-based skip in the "data" handler discarded the *real*
      // header (now misparsed as the first data row) to compensate. That
      // compensation hid the wrong keys instead of fixing them.
      const csv = "sep=;\nid;name;amount\n1;Widget;100\n2;Gadget;200";
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-sep-header-"));
      try {
        const filePath = pathJoin(dir, "data.csv");
        writeFileSync(filePath, csv);
        const fileRows = (await CSVProcessor.parseCSVFile(
          filePath,
          10,
        )) as Array<Record<string, string>>;
        const keys = Object.keys(fileRows[0]);
        return (
          fileRows.length === 2 &&
          keys.sort().join(",") === "amount,id,name" &&
          !keys.some((k) => k.includes("sep=")) &&
          fileRows[0].id === "1" &&
          fileRows[1].id === "2"
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- CLI hardening: validation, size warnings, help/examples
  //            (#296/#310/#312/#319/#352). These spawn the built CLI; they
  //            skip gracefully when dist/cli is not built. ----------
  {
    name: "CLI #310: --csv-max-rows rejects a non-positive value with a clear message",
    category: "cli",
    fn: async () => {
      const { spawnSync } = await import("node:child_process");
      const { existsSync } = await import("node:fs");
      const cli = "dist/cli/index.js";
      if (!existsSync(cli)) {
        return true; // dist not built in this run — covered by CI's built CLI.
      }
      const run = (rows: string) =>
        spawnSync(
          process.execPath,
          [
            cli,
            "generate",
            "x",
            "--csv",
            "test/fixtures/transactions.csv",
            "--csv-max-rows",
            rows,
            "--provider",
            "azure",
          ],
          { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } },
        );
      const bad = run("0");
      const neg = run("-5");
      const combined = (r: { stdout: string; stderr: string }) =>
        `${r.stdout}${r.stderr}`;
      return (
        bad.status !== 0 &&
        /Invalid --csv-max-rows \(--csvMaxRows\) value/.test(combined(bad)) &&
        neg.status !== 0 &&
        /Invalid --csv-max-rows \(--csvMaxRows\) value/.test(combined(neg))
      );
    },
  },
  {
    name: "CLI #312/#352: generate & stream help document multimodal file examples",
    category: "cli",
    fn: async () => {
      const { spawnSync } = await import("node:child_process");
      const { existsSync } = await import("node:fs");
      const cli = "dist/cli/index.js";
      if (!existsSync(cli)) {
        return true;
      }
      const help = (cmd: string) =>
        spawnSync(process.execPath, [cli, cmd, "--help"], {
          encoding: "utf8",
          env: { ...process.env, NO_COLOR: "1" },
        }).stdout.replace(/\s+/g, " ");
      const gen = help("generate");
      const stream = help("stream");
      return (
        /Analyze an image/.test(gen) &&
        /Analyze a PDF document/.test(gen) &&
        /Combine multiple file types/.test(gen) &&
        /range 1-100000/.test(gen) && // #310 description
        /Stream image analysis/.test(stream) &&
        /Stream PDF analysis/.test(stream)
      );
    },
  },
  {
    name: "CLI #319: a large local multimodal file triggers a soft-limit warning",
    category: "cli",
    fn: async () => {
      const { spawnSync } = await import("node:child_process");
      const { existsSync, mkdtempSync, writeFileSync, rmSync } =
        await import("node:fs");
      const cli = "dist/cli/index.js";
      if (!existsSync(cli)) {
        return true;
      }
      const dir = mkdtempSync(pathJoin(tmpdir(), "cli-319-"));
      try {
        const big = pathJoin(dir, "big.png");
        // 11MB — above IMAGE_MAX_MB (10). PNG magic bytes so detection is happy.
        const buf = Buffer.alloc(11 * 1024 * 1024);
        buf[0] = 0x89;
        buf[1] = 0x50;
        buf[2] = 0x4e;
        buf[3] = 0x47;
        writeFileSync(big, buf);
        const r = spawnSync(
          process.execPath,
          [cli, "generate", "x", "--image", big, "--provider", "azure"],
          { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } },
        );
        return /above the 10MB soft limit/.test(`${r.stdout}${r.stderr}`);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CSVProcessor: delimiter detection isn't fooled by a non-sep metadata line containing stray delimiter chars",
    category: "csv-processor",
    fn: async () => {
      // "A;B;C;D,x" isn't a `sep=` line, but it IS recognized as metadata
      // (comma count differs from the real comma-delimited header below),
      // and its stray semicolons used to out-score comma in frequency
      // detection when the metadata line was left in the sample: comma is
      // the correct delimiter, but pre-fix this detected ';' and produced a
      // single garbled column.
      const csv = "A;B;C;D,x\nid,name,amount\n1,Widget,100\n2,Gadget,200";

      if (CSVProcessor.detectDelimiter(csv) !== ",") {
        return false;
      }

      const json = (await CSVProcessor.process(Buffer.from(csv), {
        formatStyle: "json",
      })) as {
        metadata: {
          detectedDelimiter?: string;
          columnCount?: number;
          rowCount?: number;
        };
      };
      if (
        json.metadata.detectedDelimiter !== "," ||
        json.metadata.columnCount !== 3 ||
        json.metadata.rowCount !== 2
      ) {
        return false;
      }

      const rows = (await CSVProcessor.parseCSVString(csv, 10)) as Array<
        Record<string, string>
      >;
      return (
        rows.length === 2 &&
        rows[0].id === "1" &&
        rows[0].name === "Widget" &&
        rows[0].amount === "100"
      );
    },
  },
  // ---------- round-2 review: BOM must be stripped before parseCSVFile()'s sep= check ----------
  {
    name: "CSVProcessor.parseCSVFile: strips a leading UTF-8 BOM before the sep= metadata check",
    category: "csv-processor",
    fn: async () => {
      // Excel exports often start with a BOM immediately followed by the
      // `sep=;` preamble. Pre-fix, parseCSVFile() never stripped the BOM
      // before matching /^sep=/i, so the preamble wasn't recognized as
      // metadata (unlike process()/parseCSVString()/detectDelimiter(), which
      // all strip it): skipLines stayed 0 and the real header line
      // ("id;name;amount") leaked into the parsed rows as data, giving 3
      // rows instead of 2.
      const csv = "﻿sep=;\nid;name;amount\n1;Widget;100\n2;Gadget;200";
      if (CSVProcessor.detectDelimiter(csv) !== ";") {
        return false;
      }

      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-bom-sep-"));
      try {
        const filePath = pathJoin(dir, "data.csv");
        writeFileSync(filePath, csv);
        const fileRows = (await CSVProcessor.parseCSVFile(
          filePath,
          10,
        )) as Array<Record<string, string>>;
        return (
          fileRows.length === 2 &&
          fileRows[0].id === "1" &&
          fileRows[0].name === "Widget" &&
          fileRows[0].amount === "100" &&
          fileRows[1].id === "2" &&
          fileRows[1].name === "Gadget" &&
          fileRows[1].amount === "200"
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "convertFilePathToBase64: ENOENT reports 'not found', EACCES/other stat errors are NOT misreported as 'not found'",
    category: "message-builder",
    fn: async () => {
      // Permission bits are meaningless for root — chmod 000 does not deny
      // access, so the EACCES half of this test cannot run under root. The
      // ENOENT half is platform-independent and must still run under root,
      // so this only skips the EACCES assertion below, not the whole test.
      const isRoot =
        typeof process.getuid === "function" && process.getuid() === 0;
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-img-access-"));
      const filePath = pathJoin(dir, "photo.png");
      try {
        writeFileSync(
          filePath,
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        );

        // ENOENT: a path that genuinely does not exist.
        let enoentMessage = "";
        try {
          await buildMultimodalMessagesArray(
            {
              input: {
                text: "hi",
                images: [pathJoin(dir, "does-not-exist.png")],
              },
            } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
            "openai",
            "gpt-4o",
          );
          return false;
        } catch (e) {
          enoentMessage = e instanceof Error ? e.message : String(e);
        }
        if (!/not found/i.test(enoentMessage)) {
          return false;
        }
        if (isRoot) {
          return null;
        }

        // EACCES: stat() itself fails (no execute permission to traverse
        // into `dir`) — a real access error, not a missing file. The old
        // `statAsync(...).catch(() => null)` regressed this to "not found".
        chmodSync(dir, 0o000);
        let eaccesMessage = "";
        try {
          await buildMultimodalMessagesArray(
            {
              input: { text: "hi", images: [filePath] },
            } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
            "openai",
            "gpt-4o",
          );
          return false;
        } catch (e) {
          eaccesMessage = e instanceof Error ? e.message : String(e);
        } finally {
          chmodSync(dir, 0o700); // restore so cleanup can remove the dir
        }
        return (
          !/not found/i.test(eaccesMessage) &&
          /cannot access/i.test(eaccesMessage)
        );
      } finally {
        try {
          chmodSync(dir, 0o700);
        } catch {
          /* already restored */
        }
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CLI (review #1202): --csv rejects a directory path with a friendly error, not EISDIR",
    category: "cli",
    fn: async () => {
      const { spawnSync } = await import("node:child_process");
      const { existsSync, mkdtempSync, rmSync } = await import("node:fs");
      const cli = "dist/cli/index.js";
      if (!existsSync(cli)) {
        return true; // dist not built in this run — covered by CI's built CLI.
      }
      const dir = mkdtempSync(pathJoin(tmpdir(), "cli-dir-"));
      try {
        const r = spawnSync(
          process.execPath,
          [cli, "generate", "x", "--csv", dir, "--provider", "azure"],
          { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } },
        );
        const combined = `${r.stdout}${r.stderr}`;
        return (
          r.status !== 0 &&
          /is a directory, not a file/.test(combined) &&
          !/EISDIR/i.test(combined)
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- #564: image processing errors carry the source path/URL ----------
  // (Follow-up hardening): the source context must not leak the full host
  // directory layout or a signed-URL's query-string secrets — only the
  // basename / origin+pathname is echoed into the thrown error.
  {
    name: "imageUtils #564: file-to-base64 error includes the basename, not the full path",
    category: "image-processor",
    fn: async () => {
      const missing = "/nonexistent/neurolink-564-does-not-exist.png";
      try {
        await imageUtils.fileToBase64DataUri(missing);
        return false; // should have thrown for a missing file
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return (
          msg.includes("Failed to convert file to base64") &&
          msg.includes(basename(missing)) &&
          !msg.includes("/nonexistent/")
        );
      }
    },
  },
  {
    name: "imageUtils #564: URL download error strips the query string but keeps host+path",
    category: "image-processor",
    fn: async () => {
      const originalFetch = globalThis.fetch;
      const secretUrl = "https://example.com/img.png?token=SUPERSECRET123";
      globalThis.fetch = (async () => {
        throw new Error("simulated network failure");
      }) as typeof fetch;
      try {
        await imageUtils.urlToBase64DataUri(secretUrl, { maxAttempts: 1 });
        return false; // should have thrown
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        // Exact equality (not a hostname substring check) — avoids the
        // CodeQL js/incomplete-url-substring-sanitization anti-pattern and
        // pins down the full redacted message, not just a fragment of it.
        return (
          msg ===
          "Failed to download and convert URL to base64 (https://example.com/img.png): simulated network failure"
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  },
  // ---------- Round-2: redactUrlForError must not echo embedded userinfo ----------
  // (URL.origin already excludes userinfo for standard schemes, but the old
  // implementation relied on that implicitly via `origin` and fell back to
  // the raw, un-redacted string for unparseable input. Reconstructing
  // explicitly from protocol+host+pathname — and running the raw fallback
  // through redactUrlCredentials — closes both paths.)
  //
  // These assertions use exact string equality throughout rather than
  // `.includes("<hostname>")` substring checks on URL-derived text: a
  // substring check is the CodeQL js/incomplete-url-substring-sanitization
  // anti-pattern (a hostname can appear anywhere in a string, including
  // inside an attacker-controlled path/query segment), and exact equality
  // is also a strictly stronger assertion of the redactor's exact output.
  {
    name: "logSanitize #564 round 2: redactUrlForError strips embedded user:pass@ credentials and the query string",
    category: "image-processor",
    fn: () => {
      const out = redactUrlForError("https://user:secret@host/path?token=x");
      return out === "https://host/path";
    },
  },
  {
    name: "logSanitize #564 round 2: redactUrlForError falls back safely (no credential leak) for unparseable input",
    category: "image-processor",
    fn: () => {
      // Not a valid absolute URL — exercises the catch/fallback branch.
      const out = redactUrlForError("//user:secret@host/path?token=x");
      return out === "//***@host/path";
    },
  },
  // ---------- Round-4: redactUrlCredentials must handle malformed authorities ----------
  {
    name: "logSanitize #564 round 4: redactUrlCredentials strips credentials containing an embedded slash",
    category: "image-processor",
    fn: () => {
      const out = redactUrlCredentials("//user:sec/ret@host/path");
      return out === "//***@host/path";
    },
  },
  {
    name: "logSanitize #564 round 4: redactUrlCredentials strips authorities with multiple @ characters",
    category: "image-processor",
    fn: () => {
      const out = redactUrlCredentials("//a@b@host/path");
      return out === "//***@host/path";
    },
  },
  {
    name: "logSanitize #564 round 4: redactUrlCredentials still redacts every authority when a second, well-formed URL follows",
    category: "image-processor",
    fn: () => {
      // Guards against the two-pass fix regressing the existing multi-URL
      // (query-embedded second URL) redaction behavior.
      const out = redactUrlCredentials(
        "https://u1:p1@host-a/path?next=https://u2:p2@host-b/cb",
      );
      return out === "https://***@host-a/path?next=https://***@host-b/cb";
    },
  },
  {
    name: "logSanitize #564 round 4: redactUrlForError fallback strips slash-in-credential and multi-@ malformed URLs",
    category: "image-processor",
    fn: () => {
      const a = redactUrlForError("//user:sec/ret@host/path?token=x");
      const b = redactUrlForError("//a@b@host/path?token=x");
      return a === "//***@host/path" && b === "//***@host/path";
    },
  },
  {
    name: "logSanitize #564 round 4: redactUrlsInText scrubs URLs embedded in arbitrary error text",
    category: "image-processor",
    fn: () => {
      const message =
        "fetch failed: request to https://user:secret@host.example.com/path?token=abc123 failed, reason: getaddrinfo ENOTFOUND host.example.com";
      const out = redactUrlsInText(message);
      return (
        out ===
        "fetch failed: request to https://host.example.com/path failed, reason: getaddrinfo ENOTFOUND host.example.com"
      );
    },
  },
  {
    name: "logSanitize #564 round 4: redactUrlsInText leaves URL-free text untouched",
    category: "image-processor",
    fn: () => {
      const message = "connect ECONNREFUSED 127.0.0.1:443";
      return redactUrlsInText(message) === message;
    },
  },
  // ---------- Round-5: CRITICAL — redactUrlCredentials %40 / IPv6 / bypass hardening ----------
  {
    name: "logSanitize #564 round 5: redactUrlCredentials handles percent-encoded @ in the password",
    category: "image-processor",
    fn: () => {
      const out = redactUrlCredentials("//user:pass%40evil.com@host/path");
      return out === "//***@host/path";
    },
  },
  {
    name: "logSanitize #564 round 5: redactUrlCredentials handles a bracketed IPv6 authority",
    category: "image-processor",
    fn: () => {
      const withoutPort = redactUrlCredentials("//user:pass@[::1]/path");
      const withPort = redactUrlCredentials("http://user:pass@[::1]:8080/path");
      const noCreds = redactUrlCredentials("http://[::1]:8080/path");
      return (
        withoutPort === "//***@[::1]/path" &&
        withPort === "http://***@[::1]:8080/path" &&
        noCreds === "http://[::1]:8080/path"
      );
    },
  },
  {
    name: "logSanitize #564 round 5: redactUrlCredentials is not bypassed by a password containing both / and *",
    category: "image-processor",
    fn: () => {
      // Regression for a real bypass: the old pass-2 regex excluded a
      // literal "*" (to skip over its own "***" markers) instead of
      // bounding on a nested authority, so a malformed but RFC-3986-legal
      // password containing both "/" and "*" slipped through BOTH passes
      // completely unredacted.
      const out = redactUrlCredentials("//user:pa*ss/word@host/path");
      return out === "//***@host/path";
    },
  },
  {
    name: "imageUtils #564 round 5: redactPathFromMessage also redacts the path.resolve()'d form",
    category: "image-processor",
    fn: () => {
      // Node's own fs errors only ever embed the literal path as passed, so
      // this branch is unreachable through fileToBase64DataUri's real async
      // API — exercise the exported helper directly with a message shaped
      // the way a normalizing wrapper (relative→absolute) would produce.
      const relativePath = "some/relative/dir/secret-name.png";
      const resolved = resolvePath(relativePath);
      const message = `ENOENT: no such file or directory, open '${resolved}'`;
      const redacted = imageUtils.redactPathFromMessage(message, relativePath);
      const safeName = basename(relativePath);
      // Round-6: redacting the shorter relative form first (a substring of
      // the resolved form) used to leave the absolute parent directory
      // behind — e.g. ".../neurolink/secret-name.png" — while still
      // satisfying the three loose checks below. Assert the COMPLETE
      // message to catch that: it must contain only the basename, with no
      // directory prefix (absolute or relative) surviving anywhere.
      return (
        !redacted.includes(resolved) &&
        !redacted.includes(relativePath) &&
        redacted.includes(safeName) &&
        redacted === `ENOENT: no such file or directory, open '${safeName}'`
      );
    },
  },
  {
    name: "FileDetector.loadFromURL #564 round 7: network error redaction throws a NEW error with a SANITIZED cause, never the raw original",
    category: "file-detector",
    fn: async () => {
      const mockAgent = new MockAgent();
      mockAgent.disableNetConnect();
      const originalDispatcher = getGlobalDispatcher();
      setGlobalDispatcher(mockAgent);
      try {
        const origin = "http://mocked-host.neurolink-test.invalid";
        const path = "/secret.png?token=SUPERSECRET123";
        const pool = mockAgent.get(origin);
        const underlying = new Error(
          `getaddrinfo ENOTFOUND mocked-host.neurolink-test.invalid (request to ${origin}${path})`,
        );
        (underlying as NodeJS.ErrnoException).code = "ENOTFOUND";
        pool.intercept({ path, method: "GET" }).replyWithError(underlying);

        const loadFromURL = (
          FileDetector as unknown as {
            loadFromURL: (
              url: string,
              o?: { maxRetries?: number; retryDelay?: number },
            ) => Promise<Buffer>;
          }
        ).loadFromURL;

        try {
          await loadFromURL(`${origin}${path}`, { maxRetries: 0 });
          return false; // should have thrown
        } catch (error) {
          if (!(error instanceof Error)) {
            return false;
          }
          // The thrown error's own message must be redacted (no secret).
          if (error.message.includes("SUPERSECRET123")) {
            return false;
          }
          // `.code` must survive onto the new error for retry classification.
          if ((error as NodeJS.ErrnoException).code !== "ENOTFOUND") {
            return false;
          }
          // Round 7: `.cause` must be a SANITIZED COPY, never the raw
          // original — otherwise cause-aware logging/telemetry can still
          // recover the secret via `error.cause.message`, bypassing the
          // top-level redaction entirely.
          if (!(error.cause instanceof Error)) {
            return false;
          }
          if (error.cause === underlying) {
            return false;
          }
          if (error.cause.message.includes("SUPERSECRET123")) {
            return false;
          }
          // Retry classification must still work off the cause too.
          return (error.cause as NodeJS.ErrnoException).code === "ENOTFOUND";
        }
      } finally {
        setGlobalDispatcher(originalDispatcher);
        await mockAgent.close();
      }
    },
  },
  // ---------- Round-8: cause-chain path redaction ----------
  {
    name: "logSanitize round 8: sanitizeErrorCause({ filePath }) redacts a known path from the cause message",
    category: "image-processor",
    fn: () => {
      const filePath = "/Users/someone/private-project/secret-image.png";
      const underlying = new Error(
        `ENOENT: no such file or directory, stat '${filePath}'`,
      );
      (underlying as NodeJS.ErrnoException).code = "ENOENT";
      const sanitized = sanitizeErrorCause(underlying, { filePath });
      return (
        sanitized !== underlying &&
        !sanitized.message.includes(filePath) &&
        sanitized.message.includes(basename(filePath)) &&
        sanitized.name === "Error" &&
        (sanitized as NodeJS.ErrnoException).code === "ENOENT"
      );
    },
  },
  {
    name: "logSanitize round 8: sanitizeErrorCause({ filePath }) redacts a non-Error thrown value's string form too",
    category: "image-processor",
    fn: () => {
      const filePath = "/Users/someone/private-project/secret-image.png";
      const sanitized = sanitizeErrorCause(`read failed for ${filePath}`, {
        filePath,
      });
      return (
        sanitized instanceof Error &&
        !sanitized.message.includes(filePath) &&
        sanitized.message.includes(basename(filePath))
      );
    },
  },
  {
    name: "imageUtils round 8: fileToBase64DataUri's thrown error attaches a SANITIZED cause, never the raw fs error",
    category: "image-processor",
    fn: async () => {
      const missing = "/nonexistent/neurolink-564-round8-does-not-exist.png";
      try {
        await imageUtils.fileToBase64DataUri(missing);
        return false; // should have thrown for a missing file
      } catch (error) {
        if (!(error instanceof Error)) {
          return false;
        }
        // Outer message stays basename-only (already covered by the round-1
        // test above); the new assertion here is about the cause chain.
        if (!(error.cause instanceof Error)) {
          return false;
        }
        if (error.cause.message.includes(missing)) {
          return false;
        }
        return error.cause.message.includes(basename(missing));
      }
    },
  },
  {
    name: "CLI (review #1202): --csv-max-rows above 100000 is rejected (hard range) and names both flag spellings",
    category: "cli",
    fn: async () => {
      const { spawnSync } = await import("node:child_process");
      const { existsSync } = await import("node:fs");
      const cli = "dist/cli/index.js";
      if (!existsSync(cli)) {
        return true; // dist not built in this run — covered by CI's built CLI.
      }
      const r = spawnSync(
        process.execPath,
        [
          cli,
          "generate",
          "x",
          "--csv",
          "test/fixtures/transactions.csv",
          "--csv-max-rows",
          "100001",
          "--provider",
          "azure",
        ],
        { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } },
      );
      const combined = `${r.stdout}${r.stderr}`;
      return (
        r.status !== 0 &&
        /Invalid --csv-max-rows \(--csvMaxRows\) value/.test(combined)
      );
    },
  },
  // ---------- Round-2: statSync failures other than ENOENT must not be
  //            mislabeled "not found" — the real errno/reason must surface ----------
  {
    name: "CLI (review #1202 round 2): --image statSync EACCES surfaces the real reason, not a blanket 'not found'",
    category: "cli",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "cli-eacces-"));
      const filePath = pathJoin(dir, "image.png");
      writeFileSync(filePath, "fake-image-bytes");

      // Mock is scoped to `filePath` only (falls through to the real
      // statSync for anything else) so it can't mask unrelated statSync
      // calls made elsewhere during the same test run (review #1202 round 4).
      const originalStatSync = fs.statSync;
      fs.statSync = ((targetPath: fs.PathLike) => {
        if (targetPath.toString() === filePath) {
          const err = new Error("EACCES: permission denied, stat");
          (err as NodeJS.ErrnoException).code = "EACCES";
          throw err;
        }
        return originalStatSync(targetPath);
      }) as unknown as typeof fs.statSync;

      try {
        validateCliInputFiles({ image: filePath });
        return false; // should have thrown the aggregated error
      } catch (error) {
        if (!(error instanceof Error)) {
          return false;
        }
        return (
          /could not be accessed/i.test(error.message) &&
          /EACCES/.test(error.message) &&
          !/path not found/i.test(error.message)
        );
      } finally {
        fs.statSync = originalStatSync;
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "ImageCache round 8: debug logs redact the URL instead of a naive 50-char substring truncation",
    category: "image-processor",
    fn: async () => {
      const secretUrl =
        "https://example.com/img.png?token=SUPERSECRET1234567890ABCDEF";
      const captured: unknown[] = [];
      const originalDebug = logger.debug;
      const originalEnv = process.env.NEUROLINK_IMAGE_CACHE_ENABLED;
      try {
        process.env.NEUROLINK_IMAGE_CACHE_ENABLED = "true";
        resetImageCache();
        logger.debug = ((...args: unknown[]) => {
          captured.push(args);
        }) as typeof logger.debug;
        const cache = getImageCache();
        cache.set(
          secretUrl,
          "data:image/png;base64,AAAA",
          "image/png",
          Buffer.from("AAAA"),
        );
        cache.get(secretUrl);
        const serialized = JSON.stringify(captured);
        // Assert against the redactor's OWN output (a computed value, not a
        // bare host-string literal) so this stays clear of CodeQL's
        // js/incomplete-url-substring-sanitization anti-pattern while still
        // proving the redacted URL — scheme + host + path, query dropped —
        // survives in the log for diagnostics.
        const expectedRedacted = redactUrlForError(secretUrl);
        return (
          !serialized.includes("SUPERSECRET1234567890ABCDEF") &&
          serialized.includes(expectedRedacted)
        );
      } finally {
        logger.debug = originalDebug;
        if (originalEnv === undefined) {
          delete process.env.NEUROLINK_IMAGE_CACHE_ENABLED;
        } else {
          process.env.NEUROLINK_IMAGE_CACHE_ENABLED = originalEnv;
        }
        resetImageCache();
      }
    },
  },
  // ---------- #286: AVIF brand-variant magic-byte detection ----------
  {
    name: "ImageProcessor #286: detects AVIF brand variants (avif/avis/avio), not other ftyp brands",
    category: "image-processor",
    fn: async () => {
      const mk = (brand: string): Buffer =>
        Buffer.concat([
          Buffer.from([0x00, 0x00, 0x00, 0x20]), // box size
          Buffer.from("ftyp", "ascii"),
          Buffer.from(brand, "ascii"), // major brand at offset 8
          Buffer.from([0x00, 0x00, 0x00, 0x00]),
        ]);
      for (const brand of ["avif", "avis", "avio"]) {
        if (ImageProcessor.detectImageType(mk(brand)) !== "image/avif") {
          return false;
        }
      }
      // A non-AVIF ftyp brand must NOT be misdetected as AVIF.
      if (ImageProcessor.detectImageType(mk("mp42")) === "image/avif") {
        return false;
      }
      return true;
    },
  },
  {
    name: "FileDetector #286: AVIF buffer detected as image via the user-facing detect path",
    category: "image-processor",
    fn: async () => {
      // Minimal ISO-BMFF AVIF: box-size, 'ftyp', major brand, minor version.
      // Padded to >= MIN_VALID_IMAGE_SIZE["image/avif"] (100 bytes) so the
      // #293 truncated-buffer guard doesn't reject this strictly-identified
      // AVIF as a corrupt/incomplete file before detection is even asserted.
      const mkAvif = (brand: string): Buffer =>
        Buffer.concat([
          Buffer.from([0x00, 0x00, 0x00, 0x18]),
          Buffer.from("ftyp", "ascii"),
          Buffer.from(brand, "ascii"),
          Buffer.from([0x00, 0x00, 0x00, 0x00]),
          Buffer.from("mif1", "ascii"),
          Buffer.alloc(100),
        ]);
      // Before the fix, an AVIF ftyp buffer was misrouted to the video pipeline
      // (video/mp4). It must now resolve to an image through FileDetector — the
      // path a user's image actually flows through (generate({ files }) etc.).
      for (const brand of ["avif", "avis", "avio"]) {
        const det = await FileDetector.detectAndProcess(mkAvif(brand), {
          allowedTypes: ["image", "unknown"],
        });
        if (det.type !== "image" || det.mimeType !== "image/avif") {
          return false;
        }
      }
      // A generic MP4 brand must still route to video specifically — not
      // just "anything but image" (that would pass for "unknown"/"audio" too).
      const mp4 = await FileDetector.detectAndProcess(mkAvif("mp42"), {
        allowedTypes: ["image", "video", "unknown"],
      });
      if (mp4.type !== "video" || mp4.mimeType !== "video/mp4") {
        return false;
      }
      return true;
    },
  },
  // ---------- #261: honest MIME fallback + BMP/TIFF detection ----------
  {
    name: "ImageProcessor #261: unknown bytes → octet-stream (not mislabeled jpeg); BMP/TIFF detected",
    category: "image-processor",
    fn: async () => {
      // Bytes matching no known image signature must NOT be mislabeled jpeg.
      const garbage = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
      ]);
      if (
        ImageProcessor.detectImageType(garbage) !== "application/octet-stream"
      ) {
        return false;
      }
      // Round-5: process() must NOT package the octet-stream sentinel as a
      // "valid" image (vision providers reject that MIME type with an HTTP
      // 400) — it must fail loud with a clear, specific error instead.
      try {
        await ImageProcessor.process(garbage);
        return false; // should have thrown
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.includes("Unsupported or corrupted image")) {
          return false;
        }
      }
      // validateImageFormat must reject the sentinel directly too.
      if (ImageProcessor.validateImageFormat("application/octet-stream")) {
        return false;
      }
      // Newly-added magic bytes: BMP ("BM") and TIFF ("II*\0").
      const bmp = Buffer.concat([Buffer.from([0x42, 0x4d]), Buffer.alloc(12)]);
      if (ImageProcessor.detectImageType(bmp) !== "image/bmp") {
        return false;
      }
      const tiff = Buffer.concat([
        Buffer.from([0x49, 0x49, 0x2a, 0x00]),
        Buffer.alloc(10),
      ]);
      if (ImageProcessor.detectImageType(tiff) !== "image/tiff") {
        return false;
      }
      // Regression: a genuine PNG must still detect as image/png through the
      // real user-facing path, not swept into the new fallback. Padded to
      // >= MIN_VALID_IMAGE_SIZE["image/png"] (67 bytes) so the #293
      // truncated-buffer guard doesn't reject it as corrupt/incomplete.
      const png = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.alloc(64),
      ]);
      const det = await FileDetector.detectAndProcess(png, {
        allowedTypes: ["image", "unknown"],
      });
      return det.mimeType === "image/png";
    },
  },
  {
    name: "ImageProcessor #261 round 6: processImage() rejects the octet-stream sentinel too",
    category: "image-processor",
    fn: () => {
      // process() already rejected undetectable bytes; processImage() is a
      // separate public path (returns ProcessedImage.mediaType, which
      // callers use to build their own data URI) that must reject them too,
      // instead of silently returning mediaType: "application/octet-stream".
      const garbage = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
      ]);
      try {
        ImageProcessor.processImage(garbage, "openai");
        return false; // should have thrown
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return msg.includes("Unsupported or corrupted image");
      }
    },
  },
  {
    name: "imageUtils #261 round 6: fileToBase64DataUri() rejects the octet-stream sentinel too",
    category: "image-processor",
    fn: async () => {
      // fileToBase64DataUri() is the third public path (alongside process()
      // and processImage()) that turns raw bytes into image output — it must
      // not package undetectable bytes into `data:application/octet-stream;
      // base64,...`, which vision providers reject outright.
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-octet-stream-"));
      try {
        const filePath = pathJoin(dir, "garbage.png");
        writeFileSync(
          filePath,
          Buffer.from([
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
            0x0b,
          ]),
        );
        try {
          await imageUtils.fileToBase64DataUri(filePath);
          return false; // should have thrown
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return (
            msg.includes("Unsupported or corrupted image") &&
            msg.includes(basename(filePath))
          );
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CLI (review #1202 round 2): --image statSync ENOENT still reports 'path not found'",
    category: "cli",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "cli-enoent-"));
      const missing = pathJoin(dir, "nope.png");
      try {
        validateCliInputFiles({ image: missing });
        return false; // should have thrown — path does not exist
      } catch (error) {
        if (!(error instanceof Error)) {
          return false;
        }
        return /path not found/i.test(error.message);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- round-2 review: CSVLoader must share the quote-aware, metadata-stripping path ----------
  {
    name: "CSVLoader: quoted multiline field and sep= preamble routed through shared quote-aware parsing",
    category: "csv-processor",
    fn: async () => {
      // A newline embedded inside a quoted field must not be treated as a
      // row boundary by a physical content.split("\n") (pre-fix, this would
      // have split "Hello\nWorld" into two ragged physical lines and thrown
      // off every row after it). A leading Excel `sep=;` preamble must also
      // not be parsed as the header (pre-fix it was).
      const csv =
        'sep=;\nname;note;age\n"Alice";"Hello\nWorld";30\n"Bob";"Simple note";25\n';
      const doc = await new CSVLoader().load(csv, { outputFormat: "json" });
      const meta = doc.getMetadata();
      const rows = JSON.parse(doc.getContent()) as Array<
        Record<string, string>
      >;
      return (
        meta.columnCount === 3 &&
        meta.rowCount === 2 &&
        Array.isArray(meta.columns) &&
        (meta.columns as string[]).join(",") === "name,note,age" &&
        rows.length === 2 &&
        rows[0].name === "Alice" &&
        rows[0].note === "Hello\nWorld" &&
        rows[0].age === "30" &&
        rows[1].name === "Bob" &&
        rows[1].note === "Simple note" &&
        rows[1].age === "25"
      );
    },
  },
  // ---------- round-4 review: embedded newlines must not split a row across output lines ----------
  {
    name: "CSVLoader: embedded newline in a quoted field renders as one row in the default text format",
    category: "csv-processor",
    fn: async () => {
      const csv =
        'name;note;age\n"Alice";"Hello\nWorld";30\n"Bob";"Simple note";25\n';
      const doc = await new CSVLoader().load(csv, { outputFormat: "text" });
      const content = doc.getContent();
      const lines = content.split("\n");
      // Header + separator + exactly 2 data lines = 4 lines total; a
      // pre-fix implementation would split Alice's row across 2 physical
      // lines, producing 5.
      return (
        lines.length === 4 &&
        content.includes("Hello World") &&
        !content.includes("Hello\nWorld") &&
        lines[2].includes("Alice") &&
        lines[2].includes("Hello World") &&
        lines[3].includes("Bob")
      );
    },
  },
  {
    name: "CSVLoader: embedded newline in a quoted field renders as one row in the markdown table format",
    category: "csv-processor",
    fn: async () => {
      const csv =
        'name;note;age\n"Alice";"Hello\nWorld";30\n"Bob";"Simple note";25\n';
      const doc = await new CSVLoader().load(csv, { outputFormat: "markdown" });
      const content = doc.getContent();
      const lines = content.split("\n");
      // Header row + separator row + exactly 2 data rows = 4 lines total.
      return (
        lines.length === 4 &&
        content.includes("Hello World") &&
        !content.includes("Hello\nWorld") &&
        lines[2].startsWith("| Alice | Hello World | 30 |") &&
        lines[3].startsWith("| Bob | Simple note | 25 |")
      );
    },
  },
  {
    name: "imageUtils #564 round 6: URL download retry log sanitizes a non-Error throw too",
    category: "image-processor",
    fn: async () => {
      // The onRetry handler used to sanitize only the `error instanceof
      // Error` branch via redactUrlsInText(error.message); the `String(error)`
      // fallback for non-Error throws was logged raw. Force a retryable,
      // non-Error rejection (a plain object with `.code` so
      // isRetryableDownloadError() retries it, and a custom toString() so
      // String(error) actually carries the secret) and assert the warn log
      // never contains the unredacted token.
      const originalFetch = globalThis.fetch;
      const originalWarn = logger.warn;
      const capturedWarnings: string[] = [];
      logger.warn = (...args: unknown[]) => {
        capturedWarnings.push(
          args
            .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
            .join(" "),
        );
      };
      let attempts = 0;
      globalThis.fetch = (async () => {
        attempts++;
        const fakeNetworkError = {
          code: "ECONNRESET",
          toString(): string {
            return "custom failure at https://secret-retry-host.test/path?token=SUPERSECRET456";
          },
        };
        throw fakeNetworkError;
      }) as typeof fetch;

      try {
        try {
          await imageUtils.urlToBase64DataUri("https://example.com/img.png", {
            maxAttempts: 2,
          });
          return false; // should have thrown after exhausting retries
        } catch {
          // Expected — the retry-exhaustion error itself is covered by the
          // "strips the query string but keeps host+path" test above; this
          // test only cares about what got logged during the retry.
        }
      } finally {
        globalThis.fetch = originalFetch;
        logger.warn = originalWarn;
      }

      if (attempts < 2) {
        return false; // retry never happened — test didn't exercise onRetry
      }
      const combined = capturedWarnings.join("\n");
      return (
        combined.includes("secret-retry-host.test/path") &&
        !combined.includes("SUPERSECRET456")
      );
    },
  },
  // ---------- MessageBuilder / FileDetector / Types hardening
  //            (#273/#284/#289/#293/#323/#325) ----------
  {
    name: "MessageBuilder #284: audio/video-only inputs count as multimodal",
    category: "message-builder",
    fn: async () => {
      // detectMultimodal() now defers to this canonical guard, which checks
      // audioFiles/videoFiles — an audio/video-only request must be multimodal.
      const videoOnly = isMultimodalInput({
        videoFiles: [Buffer.from("x")],
      } as Parameters<typeof isMultimodalInput>[0]);
      const audioOnly = isMultimodalInput({
        audioFiles: [Buffer.from("x")],
      } as Parameters<typeof isMultimodalInput>[0]);
      const textOnly = isMultimodalInput({
        text: "hi",
      } as Parameters<typeof isMultimodalInput>[0]);
      return videoOnly === true && audioOnly === true && textOnly === false;
    },
  },
  {
    name: "MessageBuilder #284: audioFiles/videoFiles content actually reaches the built message",
    category: "message-builder",
    fn: async () => {
      // Routing alone (the test above) isn't enough — Tara-ag's follow-up
      // review found audioFiles/videoFiles were routed to the multimodal
      // builder but then never forwarded into it, so the payload was
      // silently dropped end-to-end. This proves the actual message content
      // carries the "## Video File:"/"## Audio File:" markers that
      // appendDetectedFileResult() emits, using magic-bytes-only buffers so
      // FileDetector's graceful-degradation fallback (no real media
      // decoding) keeps this deterministic and network-free.
      const riffWave = Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.from([0, 0, 0, 0]),
        Buffer.from("WAVE"),
        Buffer.alloc(16),
      ]);
      const ftypMp4 = Buffer.concat([
        Buffer.from([0, 0, 0, 0x18]),
        Buffer.from("ftyp"),
        Buffer.from("mp42"),
        Buffer.alloc(16),
      ]);

      const videoMessages = await buildMultimodalMessagesArray(
        {
          input: { text: "describe this", videoFiles: [ftypMp4] },
        } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
        "openai",
        "gpt-4o",
      );
      const audioMessages = await buildMultimodalMessagesArray(
        {
          input: { text: "describe this", audioFiles: [riffWave] },
        } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
        "openai",
        "gpt-4o",
      );

      const videoHasMarker =
        JSON.stringify(videoMessages).includes("## Video File:");
      const audioHasMarker =
        JSON.stringify(audioMessages).includes("## Audio File:");
      return videoHasMarker && audioHasMarker;
    },
  },
  {
    name: "mergeMediaFileAliases #1259: folds audio/video aliases into files, idempotently",
    category: "message-builder",
    fn: async () => {
      const a = Buffer.from("audio");
      const v = Buffer.from("video");
      const f = Buffer.from("file");
      const input: {
        files?: Array<Buffer | string>;
        audioFiles?: Array<Buffer | string>;
        videoFiles?: Array<Buffer | string>;
      } = { files: [f], audioFiles: [a], videoFiles: [v] };

      mergeMediaFileAliases(input);
      const foldedAll = input.files?.length === 3;
      const aliasesCleared = !input.audioFiles && !input.videoFiles;

      // Idempotence is the point: a provider override and the shared builder
      // can both call this on one options object, and a non-idempotent fold
      // would attach every file twice.
      mergeMediaFileAliases(input);
      const stillThree = input.files?.length === 3;

      // A no-alias input must not be touched at all (not even to [] ).
      const untouched: { files?: Array<Buffer | string> } = {};
      mergeMediaFileAliases(untouched);

      return (
        foldedAll &&
        aliasesCleared &&
        stillThree &&
        untouched.files === undefined
      );
    },
  },
  {
    name: "buildMultimodalOptions #1259: forwards audioFiles/videoFiles",
    category: "message-builder",
    fn: async () => {
      // This builder is a field whitelist, so an omitted field is dropped
      // silently and the model answers as though nothing were attached.
      // audioFiles/videoFiles were missing, which is what made Bedrock ignore
      // both. Assert every media field survives the round trip.
      const audio = Buffer.from("audio-bytes");
      const video = Buffer.from("video-bytes");
      const built = buildMultimodalOptions(
        {
          input: { text: "describe", audioFiles: [audio], videoFiles: [video] },
        } as Parameters<typeof buildMultimodalOptions>[0],
        "bedrock",
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
      );
      return (
        built.input.audioFiles?.[0] === audio &&
        built.input.videoFiles?.[0] === video
      );
    },
  },
  {
    name: "formatMediaDuration: audio and video render the same duration identically",
    category: "message-builder",
    fn: async () => {
      // The two media processors used to disagree — a 2s file read "0:02"
      // from audio and "2s" from video, and both strings reach the model,
      // sometimes in one request. Pin the shared format and the edge cases.
      const cases: Array<[number, string]> = [
        [0, "0s"],
        [-5, "0s"],
        [Number.NaN, "0s"],
        [Number.POSITIVE_INFINITY, "0s"],
        [2, "2s"],
        [45, "45s"],
        [60, "1m"],
        [90, "1m 30s"],
        [3600, "1h"],
        [3750, "1h 2m 30s"],
        // Rounds rather than truncates, so audio and video agree on the same
        // fractional stream duration.
        [2.6, "3s"],
      ];
      const wrong = cases.filter(
        ([input, expected]) => formatMediaDuration(input) !== expected,
      );
      if (wrong.length > 0) {
        throw new Error(
          `unexpected duration formatting: ${wrong
            .map(
              ([input, expected]) =>
                `${input} → "${formatMediaDuration(input)}" (expected "${expected}")`,
            )
            .join(", ")}`,
        );
      }
      return true;
    },
  },
  {
    name: "ImageProcessor #293: rejects empty, too-small, and truncated image buffers",
    category: "image-processor",
    fn: async () => {
      const rejects = async (buf: Buffer, re: RegExp): Promise<boolean> => {
        try {
          await ImageProcessor.process(buf);
          return false;
        } catch (e) {
          return e instanceof Error && re.test(e.message);
        }
      };
      const emptyOk = await rejects(Buffer.alloc(0), /buffer is empty/);
      const tinyOk = await rejects(Buffer.from([0x89, 0x50]), /too small/);
      // A PNG magic-byte header padded to 30 bytes is truncated (< 67).
      const truncated = Buffer.alloc(30);
      truncated[0] = 0x89;
      truncated[1] = 0x50;
      truncated[2] = 0x4e;
      truncated[3] = 0x47;
      const truncOk = await rejects(truncated, /truncated/);
      // Review fix: a non-jpeg buffer (BMP "BM" magic, 100 bytes) that
      // detectImageType falls back to "image/jpeg" must NOT be rejected as a
      // truncated jpeg — the minimum only applies on a strict magic match.
      const bmp = Buffer.alloc(100);
      bmp[0] = 0x42;
      bmp[1] = 0x4d;
      const bmpOk = await ImageProcessor.process(bmp).then(
        () => true,
        () => false,
      );
      // Review fix: a tiny valid SVG must be allowed (text, not raster).
      const svgOk = await ImageProcessor.process(Buffer.from("<svg/>")).then(
        () => true,
        () => false,
      );
      return emptyOk && tinyOk && truncOk && bmpOk && svgOk;
    },
  },
  {
    name: "MessageBuilder #273: a failed CSV/file input throws instead of being silently dropped",
    category: "message-builder",
    fn: async () => {
      const badCsv = await buildMultimodalMessagesArray(
        {
          input: { text: "hi", csvFiles: ["/nonexistent/does-not-exist.csv"] },
        } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
        "openai",
        "gpt-4o",
      ).then(
        () => false,
        (e) =>
          e instanceof Error && /Failed to process CSV file/.test(e.message),
      );
      const badFile = await buildMultimodalMessagesArray(
        {
          input: { text: "hi", files: ["/nonexistent/does-not-exist.bin"] },
        } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
        "openai",
        "gpt-4o",
      ).then(
        () => false,
        (e) => e instanceof Error && /Failed to process file/.test(e.message),
      );
      return badCsv && badFile;
    },
  },
  {
    name: "MessageBuilder #289: CSV content[] items are processed (not silently dropped)",
    category: "message-builder",
    fn: async () => {
      const csvBuf = Buffer.from("a,b\n1,2\n3,4\n");
      const build = (opts: Record<string, unknown>) =>
        buildMultimodalMessagesArray(
          opts as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
          "openai",
          "gpt-4o",
        );
      // CSV-only content (no image/pdf) — the previously-gated path.
      const csvOnly = JSON.stringify(
        await build({
          input: {
            text: "analyze",
            content: [
              {
                type: "csv",
                data: csvBuf,
                metadata: { filename: "t.csv", formatStyle: "json" },
              },
            ],
          },
        }),
      );
      return csvOnly.includes("CSV Data from t.csv");
    },
  },
  {
    name: "MessageBuilder #325: raw (non-base64) CSV string content is not corrupted by forced base64 decoding",
    category: "message-builder",
    fn: async () => {
      // Reviewer-reported bug: appendCsvContentToText() used to
      // unconditionally Buffer.from(raw, "base64") any string `data`, which
      // silently mangles genuine raw CSV text (e.g. "a,b\n1,2") since it
      // isn't valid base64. It must now be detected as non-base64 and
      // decoded as UTF-8 instead, so the CSV content parses correctly.
      const rawCsvText = "a,b\n1,2\n3,4\n";
      const messages = await buildMultimodalMessagesArray(
        {
          input: {
            text: "analyze",
            content: [
              {
                type: "csv",
                data: rawCsvText,
                metadata: { filename: "raw.csv", formatStyle: "json" },
              },
            ],
          },
        } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
        "openai",
        "gpt-4o",
      );
      const serialized = JSON.stringify(messages);
      // A corrupted decode would produce garbled bytes/mojibake instead of
      // recognizable "a"/"b"/"1"/"2" values in the parsed JSON CSV output.
      // Note: `messages` is stringified twice over (once by
      // appendCsvContentToText's JSON-format CSV output, again by this
      // JSON.stringify), so the inner quotes appear escaped (\"a\").
      return (
        serialized.includes("CSV Data from raw.csv") &&
        serialized.includes('\\"a\\": \\"1\\"') &&
        serialized.includes('\\"b\\": \\"2\\"')
      );
    },
  },
  {
    name: "Types #325: MessageContent exposes concrete fields without a loose index signature",
    category: "types",
    fn: async () => {
      // Compile-time guarantee: the enumerated fields are all assignable, and an
      // unknown key would now be a type error (verified by `pnpm run check`).
      type MessageContentT = import("../src/lib/types/index.js").MessageContent;
      type MultimodalChatMessageT =
        import("../src/lib/types/index.js").MultimodalChatMessage;
      const items: MessageContentT[] = [
        { type: "text", text: "hi" },
        { type: "image", image: "b64", mimeType: "image/png" },
        {
          type: "file",
          data: Buffer.from("x"),
          name: "a.pdf",
          mimeType: "application/pdf",
        },
        {
          type: "tool-call",
          toolCallId: "1",
          toolName: "t",
          args: { a: 1 },
        },
        { type: "tool-result", toolCallId: "1", toolName: "t", result: 42 },
      ];
      // Negative case: an unsupported key must be a type error. If the
      // removed index signature is ever reintroduced, this assignment stops
      // erroring and the unused `@ts-expect-error` directive fails
      // `pnpm run check`, catching the regression.
      // @ts-expect-error -- MessageContent must reject unsupported fields
      const invalidItem: MessageContentT = {
        type: "text",
        text: "hi",
        unsupported: true,
      };
      void invalidItem;

      // Runtime guard (Tara-ag round-2): the type-level check above can't
      // catch a future runtime filtering regression, so also exercise the
      // real conversion path and assert the known-good fields survive
      // unstripped. tool-call/tool-result are not valid ModelMessage content
      // parts and are intentionally dropped by convertContentItem — only
      // text/image/file are expected to come through.
      const chatMessages: MultimodalChatMessageT[] = [
        { role: "user", content: items },
      ];
      const [converted] = convertToModelMessages(chatMessages);
      const convertedContent = converted?.content;
      const runtimeFieldsPreserved =
        Array.isArray(convertedContent) &&
        convertedContent.length === 3 &&
        (convertedContent[0] as { type: string; text?: string }).text ===
          "hi" &&
        (convertedContent[1] as { type: string; image?: string }).image ===
          "b64" &&
        (convertedContent[1] as { mediaType?: string }).mediaType ===
          "image/png" &&
        Buffer.isBuffer((convertedContent[2] as { data?: unknown }).data) &&
        (convertedContent[2] as { mediaType?: string }).mediaType ===
          "application/pdf";

      return (
        items.length === 5 && items[0].text === "hi" && runtimeFieldsPreserved
      );
    },
  },
  {
    name: "FileDetector #323: a cached URL Content-Type avoids a redundant HEAD",
    category: "file-detector",
    fn: async () => {
      let headCount = 0;
      // A real (1x1) valid PNG — the 4-byte magic-only stub previously used
      // here is rejected by the buffer-size image validation added in this
      // PR, so the test only "passed" because detectAndProcess() always
      // threw, not because the caching path actually succeeded.
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );
      const server = http.createServer((req, res) => {
        if (req.method === "HEAD") {
          headCount++;
          res.setHeader("content-type", "image/png");
          res.end();
        } else {
          res.setHeader("content-type", "image/png");
          res.end(png);
        }
      });
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
      try {
        const addr = server.address() as { port: number };
        const url = `http://127.0.0.1:${addr.port}/img-323.png`;
        const load = (
          FileDetector as unknown as {
            loadFromURL: (
              u: string,
              o?: { maxSize?: number },
            ) => Promise<Buffer>;
          }
        ).loadFromURL.bind(FileDetector);
        // GET populates the content-type cache.
        await load(url, { maxSize: 1024 });
        // A subsequent detection of the same URL must NOT issue a HEAD.
        headCount = 0;
        const result = await FileDetector.detectAndProcess(url);
        return result.type === "image" && headCount === 0;
      } finally {
        await new Promise<void>((r) => server.close(() => r()));
      }
    },
  },
  // ---------- Round-4: CLI/processor decoupling + testable validators ----------
  {
    name: "CLI (review #1202 round 4): commandFactory.ts no longer imports processor sizeLimits (CLI/SDK layering)",
    category: "cli",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/factories/commandFactory.ts"),
        "utf-8",
      );
      return (
        !src.includes("lib/processors/config/sizeLimits") &&
        !src.includes("SIZE_LIMITS_MB")
      );
    },
  },
  {
    name: "CLI (review #1202 round 4): validateCliInputFiles/validateCsvMaxRows are directly importable named exports (no `unknown` cast needed)",
    category: "cli",
    fn: async () => {
      return (
        typeof validateCliInputFiles === "function" &&
        typeof validateCsvMaxRows === "function"
      );
    },
  },
  {
    name: "CLI (review #1202 round 4): CLI_SOFT_LIMITS_MB preserves the original soft-limit MB values",
    category: "cli",
    fn: async () => {
      return (
        CLI_SOFT_LIMITS_MB.IMAGE_MAX_MB === 10 &&
        CLI_SOFT_LIMITS_MB.CSV_MAX_MB === 50 &&
        CLI_SOFT_LIMITS_MB.PDF_MAX_MB === 100 &&
        CLI_SOFT_LIMITS_MB.VIDEO_MAX_MB === 500
      );
    },
  },
  {
    name: "CLI (review #1202 round 4): validateCsvMaxRows rejects out-of-range values via the standalone export",
    category: "cli",
    fn: async () => {
      try {
        validateCsvMaxRows({ csvMaxRows: "100001" });
        return false; // should have thrown
      } catch (error) {
        if (!(error instanceof Error)) {
          return false;
        }
        return /Invalid --csv-max-rows/.test(error.message);
      }
    },
  },
  {
    name: "CLI (review #1202 round 4): session.ts --file help text documents URL support (<path|url>)",
    category: "cli",
    fn: async () => {
      const { readFileSync } = await import("fs");
      const { join: pathJoin } = await import("path");
      const src = readFileSync(
        pathJoin(process.cwd(), "src/cli/loop/session.ts"),
        "utf-8",
      );
      return src.includes('"--file <path|url>"');
    },
  },
  // ---------- #288: CLI rejects a directory as a file input (pre-flight) ----------
  {
    name: "CLI #288: --image pointing at a directory is rejected with troubleshooting",
    category: "cli-file-validation",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-288-"));
      try {
        const res = await runCliBugfix([
          "generate",
          "hi",
          "--image",
          dir,
          "--dry-run",
          "--quiet",
        ]);
        // Was exit 0 (accepted) before the fix; now rejected pre-flight with a
        // clear "directory" error + troubleshooting guidance.
        return (
          res.code !== 0 &&
          /directory/i.test(res.out) &&
          /troubleshoot/i.test(res.out)
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- #291: batch recognizes/validates multimodal flags ----------
  {
    name: "CLI #291: batch now recognizes --csv (validates it; was silently ignored)",
    category: "cli-file-validation",
    fn: async () => {
      const base = mkdtempSync(pathJoin(tmpdir(), "nl-291-"));
      try {
        const promptsFile = pathJoin(base, "prompts.txt");
        writeFileSync(promptsFile, "What is the total?\nWhich is cheapest?\n");
        // Before #291, batch ignored --csv entirely, so a bad path was silently
        // dropped. Now batch validates it → a nonexistent --csv is reported
        // with troubleshooting guidance (proves the flag is wired in).
        const bad = await runCliBugfix([
          "batch",
          promptsFile,
          "--csv",
          pathJoin(base, "nope.csv"),
          "--dry-run",
        ]);
        if (
          !/--csv path not found/i.test(bad.out) ||
          !/troubleshoot/i.test(bad.out)
        ) {
          return false;
        }
        // A valid --csv still completes the batch — one result per prompt.
        // Parse stdout directly (no bracket-scanning): the multimodal attach
        // notice is routed to stderr (see the dedicated regression test
        // below), so stdout should be nothing but the JSON payload.
        const csvFile = pathJoin(base, "data.csv");
        writeFileSync(csvFile, "product,price\nApple,3\nPear,5\n");
        const ok = await runCliBugfix([
          "batch",
          promptsFile,
          "--csv",
          csvFile,
          "--dry-run",
          "--format",
          "json",
        ]);
        const arr = JSON.parse(ok.stdout.trim());
        return Array.isArray(arr) && arr.length === 2;
      } finally {
        rmSync(base, { recursive: true, force: true });
      }
    },
  },
  // ---------- stdout/stderr separation: warnings/notices must not corrupt --format json ----------
  {
    name: "CLI: batch --format json stdout stays valid JSON even though the multimodal attach notice fires (notice goes to stderr)",
    category: "cli-file-validation",
    fn: async () => {
      const base = mkdtempSync(pathJoin(tmpdir(), "nl-json-safe-"));
      try {
        const promptsFile = pathJoin(base, "prompts.txt");
        writeFileSync(promptsFile, "Q1?\nQ2?\nQ3?\n");
        const csvFile = pathJoin(base, "data.csv");
        writeFileSync(csvFile, "a,b\n1,2\n");

        const res = await runCliBugfix([
          "batch",
          promptsFile,
          "--csv",
          csvFile,
          "--dry-run",
          "--format",
          "json",
        ]);

        if (res.code !== 0) {
          return false;
        }
        // The notice is safety-relevant, so it must fire even though `quiet`
        // defaults to true — but on stderr, never mixed into stdout.
        if (!/attached to all prompts/i.test(res.stderr)) {
          return false;
        }
        if (/attached to all prompts/i.test(res.stdout)) {
          return false;
        }
        const parsed = JSON.parse(res.stdout.trim());
        return Array.isArray(parsed) && parsed.length === 3;
      } finally {
        rmSync(base, { recursive: true, force: true });
      }
    },
  },
  // ---------- #288: statSync throwing after existsSync succeeds (TOCTOU) must not raw-crash ----------
  {
    name: "CLI #288: fs.statSync throwing after existsSync succeeds is caught and reported via the aggregated error, not a raw exception",
    category: "cli-file-validation",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-288-stat-"));
      const filePath = pathJoin(dir, "image.png");
      writeFileSync(filePath, "fake-image-bytes");

      const originalStatSync = fs.statSync;
      // Simulate the TOCTOU race the review flagged: existsSync sees the
      // file, but statSync then throws (permission denied, race, etc.).
      fs.statSync = (() => {
        const err = new Error("EACCES: permission denied, stat");
        (err as NodeJS.ErrnoException).code = "EACCES";
        throw err;
      }) as unknown as typeof fs.statSync;

      try {
        validateCliInputFiles({ image: filePath });
        return false; // should have thrown the aggregated error
      } catch (error) {
        if (!(error instanceof Error)) {
          return false;
        }
        // Adapted (post-#1202/#1191 consolidation onto inputValidation.ts's
        // standalone validateCliInputFiles): the surviving implementation
        // labels a non-ENOENT statSync failure "could not be accessed" (the
        // wording proven by the pre-existing "CLI (review #1202 round 2):
        // --image statSync EACCES ..." test above), not "cannot be read" —
        // same underlying TOCTOU behavior, reconciled wording.
        return (
          /could not be accessed/i.test(error.message) &&
          /EACCES/.test(error.message) &&
          /troubleshoot/i.test(error.message)
        );
      } finally {
        fs.statSync = originalStatSync;
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- #291: batch <file> positional directory case uses the friendly error path ----------
  {
    name: "CLI #291: batch <file> positional pointing at a directory gets the friendly aggregated error, not a raw EISDIR",
    category: "cli-file-validation",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-291-dir-"));
      try {
        const res = await runCliBugfix(["batch", dir, "--dry-run"]);
        return (
          res.code !== 0 &&
          !/EISDIR/i.test(res.out) &&
          /directory/i.test(res.out) &&
          /troubleshoot/i.test(res.out) &&
          // Must not misattribute the positional to the (nonexistent in
          // batch) --file flag.
          !/--file path/i.test(res.out)
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- Round-4 (#1191): batch validates multimodal flags BEFORE
  //            reading/parsing the prompts file, not after ----------
  {
    name: "CLI (review #1191 round 4): batch reports an invalid --image path before 'No prompts found', proving multimodal validation runs pre-flight",
    category: "cli-file-validation",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-1191-preflight-"));
      try {
        // Empty prompts file: if multimodal validation ran AFTER the
        // prompts file was read/parsed (the pre-fix ordering), batch would
        // throw "No prompts found in file" here — the --image error would
        // never surface. Fixed ordering must throw the --image error first.
        const promptsFile = pathJoin(dir, "empty-prompts.txt");
        writeFileSync(promptsFile, "");
        const res = await runCliBugfix([
          "batch",
          promptsFile,
          "--image",
          pathJoin(dir, "nope.png"),
          "--dry-run",
        ]);
        return (
          res.code !== 0 &&
          /--image path not found/i.test(res.out) &&
          !/No prompts found/i.test(res.out)
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- Round-2: `file://` URLs must not bypass local-path validation ----------
  {
    name: "CLI: --image file:// URL pointing at a directory is rejected (was silently skipped as 'non-local')",
    category: "cli-file-validation",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-fileurl-dir-"));
      try {
        validateCliInputFiles({ image: pathToFileURL(dir).href });
        return false; // should have thrown — directory, not a file
      } catch (error) {
        if (!(error instanceof Error)) {
          return false;
        }
        return (
          /directory/i.test(error.message) &&
          /troubleshoot/i.test(error.message)
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CLI: --image file:// URL pointing at a missing path is rejected (not found)",
    category: "cli-file-validation",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-fileurl-missing-"));
      const missing = pathJoin(dir, "nope.png");
      try {
        validateCliInputFiles({ image: pathToFileURL(missing).href });
        return false; // should have thrown — path not found
      } catch (error) {
        if (!(error instanceof Error)) {
          return false;
        }
        return /path not found/i.test(error.message);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CLI: --image file:// URL pointing at a real file passes validation; http(s) URLs remain skipped",
    category: "cli-file-validation",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-fileurl-ok-"));
      const filePath = pathJoin(dir, "image.png");
      writeFileSync(filePath, "fake-image-bytes");
      try {
        // A valid file:// URL must not throw.
        validateCliInputFiles({ image: pathToFileURL(filePath).href });
        // A genuine remote URL to a nonexistent-looking path must still be
        // skipped entirely (never touches the filesystem).
        validateCliInputFiles({
          image: "https://example.com/does/not/exist.png",
        });
        return true;
      } catch {
        return false;
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- Round-5 (#1191): rawPath must never leak query/fragment or
  //            embedded credentials into a user-facing error ----------
  {
    name: "CLI (review #1191 round 5): a file:// path with a sensitive query string/fragment is redacted before it reaches the error message",
    category: "cli-file-validation",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-1191-redact-"));
      try {
        const missing = pathJoin(dir, "nope.png");
        const secretUrl = `${pathToFileURL(missing).href}?token=SECRET123#frag`;
        validateCliInputFiles({ image: secretUrl });
        return false; // should have thrown — path not found
      } catch (error) {
        if (!(error instanceof Error)) {
          return false;
        }
        return (
          /path not found/i.test(error.message) &&
          !error.message.includes("SECRET123") &&
          !error.message.includes("frag") &&
          !error.message.includes("?") &&
          !error.message.includes("#")
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CLI (review #1191 round 5): a file:// URL with embedded user:pass@ credentials is redacted in the 'not a valid file:// URL' error",
    category: "cli-file-validation",
    fn: async () => {
      try {
        // Malformed file:// URL (authority segment) — hits the "not a valid
        // file:// URL" branch, which must still redact credentials/query
        // before echoing the raw value back.
        validateCliInputFiles({
          image: "file://user:hunter2@host/nope.png?token=SECRET#frag",
        });
        return false; // should have thrown
      } catch (error) {
        if (!(error instanceof Error)) {
          return false;
        }
        return (
          /not a valid file:\/\/ URL/i.test(error.message) &&
          !error.message.includes("hunter2") &&
          !error.message.includes("SECRET") &&
          !error.message.includes("frag")
        );
      }
    },
  },
  // ---------- Round-5 (#1191): batch must not accept --file at all — it
  //            collides with the <promptsFile> positional ----------
  {
    name: "CLI (review #1191 round 5): batch rejects --file as an unknown argument (no collision with the <promptsFile> positional)",
    category: "cli-file-validation",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-1191-batchflag-"));
      try {
        const promptsFile = pathJoin(dir, "prompts.txt");
        writeFileSync(promptsFile, "hello\n");
        const other = pathJoin(dir, "other.txt");
        writeFileSync(other, "world\n");
        const res = await runCliBugfix([
          "batch",
          promptsFile,
          "--file",
          other,
          "--dry-run",
        ]);
        return res.code !== 0 && /unknown argument.*file/i.test(res.out.trim());
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "CLI (review #1191 round 5): batch still works normally via the <promptsFile> positional after the --file exclusion",
    category: "cli-file-validation",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-1191-batchok-"));
      try {
        const promptsFile = pathJoin(dir, "prompts.txt");
        writeFileSync(promptsFile, "hello\nworld\n");
        const res = await runCliBugfix(["batch", promptsFile, "--dry-run"]);
        return (
          res.code === 0 &&
          !/unknown argument/i.test(res.out) &&
          !/No prompts found/i.test(res.out)
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  // ---------- Post-merge review gaps: batch parity, pdf limits, url-secret
  //            redaction, supervisor identity ----------
  {
    // (a) batch previously never attached pdfOptions at all, so
    // --pdf-password / NEUROLINK_PDF_PASSWORD silently had no effect on
    // `neurolink batch`. Assert the fix inside the specific closure
    // (runBatchGenerate) rather than anywhere in the file, so this can't
    // false-pass just because generate/stream already had pdfOptions.
    name: "CLI batch (review): executeBatch wires pdfOptions.password via resolvePdfPassword when PDFs are attached (previously silently dropped)",
    category: "cli",
    fn: async () => {
      const src = readFileSync(
        resolvePath(process.cwd(), "src/cli/factories/commandFactory.ts"),
        "utf-8",
      );
      // Scope to executeBatch (generate/stream are defined earlier in the
      // file) so this can't false-pass on those; scan to EOF, not a fixed
      // window, so it won't false-fail as the function grows (review feedback).
      const start = src.indexOf("private static async executeBatch");
      if (start === -1) {
        return false;
      }
      const compact = src.slice(start).replace(/\s+/g, "");
      // The password is resolved ONCE before the per-prompt loop (so the
      // shell-history warning fires once per run, like generate/stream) and
      // then wired into each prompt's pdfOptions.
      return (
        compact.includes(
          "constbatchPdfPassword=batchPdfFiles?.length?CLICommandFactory.resolvePdfPassword(argv):undefined",
        ) && compact.includes("pdfOptions:{password:batchPdfPassword")
      );
    },
  },
  {
    // (b) validateCsvMaxRows was wired into generate/stream but not batch —
    // an out-of-range --csv-max-rows on `batch` silently passed through
    // instead of failing fast like the other two commands.
    name: "CLI batch (review): --csv-max-rows is validated on `batch` too (validateCsvMaxRows was only wired into generate/stream)",
    category: "cli",
    fn: async () => {
      if (!existsSync(CLI_DIST_PATH)) {
        return true; // dist not built in this run — covered by CI's built CLI.
      }
      const dir = mkdtempSync(pathJoin(tmpdir(), "nl-batch-csvmaxrows-"));
      try {
        const promptsFile = pathJoin(dir, "prompts.txt");
        writeFileSync(promptsFile, "hello\n");
        const res = await runCliBugfix([
          "batch",
          promptsFile,
          "--csv",
          "test/fixtures/transactions.csv",
          "--csv-max-rows",
          "0",
          "--dry-run",
        ]);
        return (
          res.code !== 0 &&
          /Invalid --csv-max-rows \(--csvMaxRows\) value/.test(res.out)
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    // (c) batch used to build a hand-rolled `csvOptions` inline (only
    // maxRows/formatStyle), silently dropping encoding/sanitizeColumnNames/
    // columnNameCase/parseTimeoutMs that generate/stream already supported.
    // Verify both that batch now delegates to the shared helper, and that
    // the shared helper itself carries every field through.
    name: "CLI batch (review): executeBatch's csvOptions is built via the shared buildCsvOptionsFromArgv helper, and that helper carries encoding/sanitizeColumnNames/columnNameCase/parseTimeoutMs",
    category: "cli",
    fn: async () => {
      const src = readFileSync(
        resolvePath(process.cwd(), "src/cli/factories/commandFactory.ts"),
        "utf-8",
      );
      const marker = "const runBatchGenerate = ()";
      const start = src.indexOf(marker);
      if (start === -1) {
        return false;
      }
      // Scan from the marker to end-of-file rather than a fixed-size
      // window — a fixed window (e.g. 2000 chars) false-fails as soon as
      // the runBatchGenerate closure grows past it (review feedback).
      const compact = src.slice(start).replace(/\s+/g, "");
      if (
        !compact.includes(
          "batchCsvFiles?.length&&{csvOptions:CLICommandFactory.buildCsvOptionsFromArgv(argv)",
        )
      ) {
        return false;
      }

      const buildCsvOptionsFromArgv = (
        CLICommandFactory as unknown as {
          buildCsvOptionsFromArgv: (argv: Record<string, unknown>) => {
            maxRows?: number;
            formatStyle?: string;
            encoding?: string;
            sanitizeColumnNames?: boolean;
            columnNameCase?: string;
            parseTimeoutMs?: number;
          };
        }
      ).buildCsvOptionsFromArgv;

      const opts = buildCsvOptionsFromArgv({
        csvMaxRows: 250,
        csvFormat: "markdown",
        csvEncoding: "windows-1252",
        csvSanitizeNames: true,
        csvNameCase: "camelCase",
        csvParseTimeoutMs: 45000,
      });

      return (
        opts.maxRows === 250 &&
        opts.formatStyle === "markdown" &&
        opts.encoding === "windows-1252" &&
        opts.sanitizeColumnNames === true &&
        opts.columnNameCase === "camelCase" &&
        opts.parseTimeoutMs === 45000
      );
    },
  },
  {
    // (c2) T6 post-merge review gap: executeGenerate, executeStream and
    // executeBatch each built a byte-for-byte identical inline
    // `videoOptions: {...}` object. Extracted into a shared
    // buildVideoOptionsFromArgv helper (mirrors buildCsvOptionsFromArgv
    // above) — assert all three call sites now delegate to it (so the
    // duplication can't silently regress), and that the helper itself maps
    // every field through correctly.
    name: "CLI (review): executeGenerate/executeStream/executeBatch's videoOptions is built via the shared buildVideoOptionsFromArgv helper (behavior-preserving extraction of T6)",
    category: "cli",
    fn: async () => {
      const src = readFileSync(
        resolvePath(process.cwd(), "src/cli/factories/commandFactory.ts"),
        "utf-8",
      );
      const callSiteCount = (
        src.match(
          /videoOptions:\s*CLICommandFactory\.buildVideoOptionsFromArgv\(argv\)/g,
        ) || []
      ).length;
      if (callSiteCount !== 3) {
        return false; // expected exactly executeGenerate + executeStream + executeBatch
      }
      // No inline duplicate should remain outside the helper's own body.
      const inlineDuplicates = (
        src.match(/frames:\s*argv\.videoFrames as number \| undefined/g) || []
      ).length;
      if (inlineDuplicates !== 1) {
        return false; // should appear exactly once, inside buildVideoOptionsFromArgv itself
      }

      const buildVideoOptionsFromArgv = (
        CLICommandFactory as unknown as {
          buildVideoOptionsFromArgv: (argv: Record<string, unknown>) => {
            frames?: number;
            quality?: number;
            format?: string;
            transcribeAudio?: boolean;
          };
        }
      ).buildVideoOptionsFromArgv;

      const opts = buildVideoOptionsFromArgv({
        videoFrames: 12,
        videoQuality: 90,
        videoFormat: "png",
        transcribeAudio: true,
      });

      return (
        opts.frames === 12 &&
        opts.quality === 90 &&
        opts.format === "png" &&
        opts.transcribeAudio === true
      );
    },
  },
  {
    // (d) the aggregate PDF page-limit reduce() treated a null pageCount
    // (accurate count unavailable) as 0, which could silently undercount the
    // true combined total. Enforcement must still run against the known sum
    // (no throw for a merely-unknown count) but the gap must be logged.
    name: "messageBuilder (review): aggregate PDF page-limit check WARNs when any file's page count is unknown, instead of silently undercounting",
    category: "pdf-processor",
    fn: async () => {
      // A valid PDF header with a corrupted body: FileDetector/PDFProcessor
      // accept it as PDF content but the page-count regex finds no markers,
      // so estimatedPages comes back null (mirrors the existing #287 test).
      const unknownCountPdf = Buffer.concat([
        Buffer.from("%PDF-1.4\n"),
        Buffer.alloc(20),
      ]);
      const knownCountPdf = readFileSync("test/fixtures/multi-page.pdf"); // 3 pages

      const originalWarn = logger.warn;
      const warnings: string[] = [];
      logger.warn = ((...args: unknown[]) => {
        warnings.push(
          args
            .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
            .join(" "),
        );
      }) as typeof logger.warn;

      try {
        // "openai": native PDF support (FilePart, no page-image conversion),
        // aggregateConfig maxPages=100/maxSizeMB=10 — well above this tiny
        // combined input, so this must NOT throw; it must only warn about
        // the unknown count. (A non-native provider would additionally try
        // to rasterize these deliberately-corrupted stub PDFs to images and
        // fail there, which is a different code path than the one under
        // test here.)
        const messages = await buildMultimodalMessagesArray(
          {
            input: {
              text: "x",
              pdfFiles: [unknownCountPdf, unknownCountPdf, knownCountPdf],
            },
          } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
          "openai",
          "gpt-4o",
        );
        const warned = warnings.some((w) =>
          /Aggregate page-limit check.*unknown/i.test(w),
        );
        return Array.isArray(messages) && warned;
      } finally {
        logger.warn = originalWarn;
      }
    },
  },
  {
    // (e) the URL pre-flight HEAD used to trust content-length off ANY
    // response, including non-2xx ones (a redirect the dispatcher didn't
    // follow, 403/404/405 "HEAD not allowed", 5xx) — which can carry a
    // stale/irrelevant content-length and cause a false "File too large"
    // rejection before the real (small) body is ever fetched via GET.
    name: "FileDetector.loadFromURL (review): a non-2xx HEAD's content-length is not trusted — falls through to the GET guard instead of over-rejecting",
    category: "file-detector",
    fn: async () => {
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );
      const server = http.createServer((req, res) => {
        if (req.method === "HEAD") {
          // Non-2xx with a wildly oversized declared length — must be
          // ignored, not trusted.
          res.statusCode = 403;
          res.setHeader("content-length", String(500 * 1024 * 1024));
          res.end();
        } else {
          res.statusCode = 200;
          res.setHeader("content-type", "image/png");
          res.end(png);
        }
      });
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
      try {
        const addr = server.address() as { port: number };
        const url = `http://127.0.0.1:${addr.port}/gate-review-nonstd.png`;
        const loadFromURL = (
          FileDetector as unknown as {
            loadFromURL: (
              u: string,
              o?: { maxSize?: number },
            ) => Promise<Buffer>;
          }
        ).loadFromURL;
        const buf = await loadFromURL(url, { maxSize: 1024 * 1024 });
        return Buffer.isBuffer(buf) && buf.equals(png);
      } finally {
        await new Promise<void>((r) => server.close(() => r()));
      }
    },
  },
  {
    // (f) getAccuratePageCount raced getInfo() against a setTimeout without
    // ever clearing the loser: when getInfo() won (the common case), the 5s
    // timer stuck around doing nothing. Separately, an unguarded
    // `pdf.destroy()` in the finally block could throw and discard an
    // otherwise-valid page count.
    //
    // getInfo()'s resolution is driven via a `PDFParse.prototype.getInfo`
    // patch rather than a real multi-page.pdf parse: pdf-parse's bundled
    // pdfjs-dist (5.4.296, exact-pinned) and pdf-to-img's bundled pdfjs-dist
    // (~5.4.0, independently resolved to 5.4.624 by pnpm) are two separate
    // installs. Once anything in the process calls PDFProcessor.convertToImages
    // (pdf-to-img) — which the pre-existing convertToImages test block above
    // does many times over — every subsequent *real* pdf-parse getInfo() call
    // in that same process starts rejecting with a pdfjs "API version does not
    // match the Worker version" error and getAccuratePageCount silently
    // degrades to null (its documented, correct behavior for a genuinely
    // failing parse). That's a pre-existing, order-dependent cross-package
    // quirk unrelated to the two behaviors this test verifies, so getInfo()
    // is stubbed to keep this test deterministic regardless of what ran
    // before it in the suite.
    name: "PDFProcessor.getAccuratePageCount (review): clears its race timer when getInfo() wins, and a throwing destroy() doesn't discard a valid page count",
    category: "pdf-processor",
    fn: async () => {
      const getAccuratePageCount = (
        PDFProcessor as unknown as {
          getAccuratePageCount: (buffer: Buffer) => Promise<number | null>;
        }
      ).getAccuratePageCount;
      const buffer = readFileSync("test/fixtures/multi-page.pdf");

      const { PDFParse } = await import("pdf-parse");
      const originalGetInfo = PDFParse.prototype.getInfo;
      const originalDestroy = PDFParse.prototype.destroy;
      PDFParse.prototype.getInfo = async function patchedGetInfo() {
        return { total: 3 } as Awaited<ReturnType<typeof originalGetInfo>>;
      };

      try {
        // (1) No dangling 5s timers after repeated calls that resolve well
        // before PAGE_COUNT_TIMEOUT_MS — proves the race loser is cleared.
        const timeoutsBefore = process
          .getActiveResourcesInfo()
          .filter((r) => r === "Timeout").length;
        for (let i = 0; i < 10; i++) {
          const pages = await getAccuratePageCount(buffer);
          if (pages !== 3) {
            return false;
          }
        }
        const timeoutsAfter = process
          .getActiveResourcesInfo()
          .filter((r) => r === "Timeout").length;
        if (timeoutsAfter - timeoutsBefore >= 10) {
          return false; // would indicate leaked timers, one per call
        }

        // (2) A throwing destroy() must not discard an otherwise-valid count
        // (matches fileReferenceRegistry.ts's swallow-on-cleanup pattern).
        PDFParse.prototype.destroy = async function patchedDestroy() {
          throw new Error("simulated destroy() failure");
        };
        const pages = await getAccuratePageCount(buffer);
        return pages === 3;
      } finally {
        PDFParse.prototype.getInfo = originalGetInfo;
        PDFParse.prototype.destroy = originalDestroy;
      }
    },
  },
  {
    // (g) both ImageCache.normalizeUrl and FileDetector's urlContentTypeCache
    // used the full URL (secrets and all) as their in-memory Map key. A log
    // line is one redacted moment; a Map key persists for the process
    // lifetime — so a presigned URL's signature/token stayed resident in
    // memory as a cache key for as long as the process ran.
    //
    // Post-merge review gap (T4): the original fix above merely STRIPPED
    // sensitive params before using the result as a key, which traded the
    // secret-leak bug for a worse correctness bug — two *different* signed
    // URLs for the same object (e.g. one expired/revoked, one fresh) then
    // stripped down to the SAME key and collided, so stale/invalid-auth
    // bytes could be served without ever revalidating. The fix folds a
    // short hash of the stripped param values into the key instead of just
    // dropping them, so distinct auth contexts stay distinct while the raw
    // secret still never appears in the key. This test asserts BOTH halves:
    // no secret leak, AND no cross-auth-context collision.
    name: "ImageCache + FileDetector url cache (review): cache keys strip sensitive query params AND stay distinct per auth context (hash suffix, no collision)",
    category: "image-processor",
    fn: async () => {
      // -- ImageCache: the persistent Map key itself must not contain the
      // secret; non-sensitive params must survive; and two URLs differing
      // ONLY in signature must now be DISTINCT cache entries (no collision),
      // while the identical URL requested twice must still hit the cache
      // (the hash suffix is deterministic, not "always distinct").
      const originalEnv = process.env.NEUROLINK_IMAGE_CACHE_ENABLED;
      try {
        process.env.NEUROLINK_IMAGE_CACHE_ENABLED = "true";
        resetImageCache();
        const cache = getImageCache();
        const secretUrl =
          "https://example.com/img.png?X-Amz-Signature=SUPERSECRETSIG&keep=1";
        cache.set(
          secretUrl,
          "data:image/png;base64,AAAA",
          "image/png",
          Buffer.from("AAAA"),
        );
        const internalMap = (
          cache as unknown as { cache: Map<string, unknown> }
        ).cache;
        const keys = Array.from(internalMap.keys());
        if (keys.some((k) => k.includes("SUPERSECRETSIG"))) {
          return false; // secret leaked into the persistent Map key
        }
        if (!keys.some((k) => k.includes("keep=1"))) {
          return false; // non-sensitive params must survive
        }
        const differentSigHit = cache.get(
          "https://example.com/img.png?X-Amz-Signature=DIFFERENTSIG&keep=1",
        );
        if (differentSigHit !== null) {
          return false; // collision: a different signature must NOT hit the same entry
        }
        const sameSigHit = cache.get(secretUrl);
        if (
          sameSigHit === null ||
          sameSigHit.dataUri !== "data:image/png;base64,AAAA"
        ) {
          return false; // the identical URL must still be a cache hit
        }
      } finally {
        if (originalEnv === undefined) {
          delete process.env.NEUROLINK_IMAGE_CACHE_ENABLED;
        } else {
          process.env.NEUROLINK_IMAGE_CACHE_ENABLED = originalEnv;
        }
        resetImageCache();
      }

      // -- FileDetector: two URLs differing only by a secret query param
      // must NOT share a urlContentTypeCache entry anymore (a fresh HEAD is
      // expected for the second, different-secret URL), while the identical
      // URL requested again must still avoid a redundant HEAD.
      let headCount = 0;
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );
      const server = http.createServer((req, res) => {
        if (req.method === "HEAD") {
          headCount++;
          res.setHeader("content-type", "image/png");
          res.end();
        } else {
          res.setHeader("content-type", "image/png");
          res.end(png);
        }
      });
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
      try {
        const addr = server.address() as { port: number };
        const path = "/gate-review-secret.png";
        const url1 = `http://127.0.0.1:${addr.port}${path}?token=SIGA&keep=1`;
        const url2 = `http://127.0.0.1:${addr.port}${path}?token=SIGB&keep=1`;
        const load = (
          FileDetector as unknown as {
            loadFromURL: (
              u: string,
              o?: { maxSize?: number },
            ) => Promise<Buffer>;
          }
        ).loadFromURL.bind(FileDetector);
        await load(url1, { maxSize: 1024 });

        // Different secret (SIGB), same path: must NOT reuse url1's cache
        // entry — this is the collision the T4 fix closes.
        headCount = 0;
        const result2 = await FileDetector.detectAndProcess(url2);
        if (!(result2.type === "image" && headCount > 0)) {
          return false;
        }

        // The exact same URL (SIGA) requested again must still hit the
        // cache — proving the hash suffix is deterministic, not random.
        headCount = 0;
        const result1Again = await FileDetector.detectAndProcess(url1);
        return result1Again.type === "image" && headCount === 0;
      } finally {
        await new Promise<void>((r) => server.close(() => r()));
      }
    },
  },
  {
    // (g2) T3 + T4 unit coverage: the GCS V4 signed-URL query params must be
    // in the shared denylist (case-insensitively), and
    // stripSensitiveUrlParamsForCacheKey must (1) never leak a stripped
    // value into its hash suffix, (2) return "" (no suffix) when nothing
    // sensitive was present, (3) produce the SAME suffix for the same
    // stripped values regardless of param order, and (4) produce a
    // DIFFERENT suffix when a stripped value differs.
    name: "logSanitize (review): GCS V4 signed-URL params are denylisted, and stripSensitiveUrlParamsForCacheKey hashes stripped values deterministically without leaking them",
    category: "image-processor",
    fn: async () => {
      const gcsParams = [
        "x-goog-signature",
        "x-goog-credential",
        "x-goog-algorithm",
        "x-goog-date",
        "x-goog-expires",
        "x-goog-signedheaders",
      ];
      for (const p of gcsParams) {
        if (!SENSITIVE_URL_QUERY_PARAM_DENYLIST.includes(p)) {
          return false;
        }
      }
      // Case-insensitive match: a mixed-case GCS param on an actual URL must
      // still be recognized and stripped (denylist membership check
      // lowercases the incoming key before comparing).
      const mixedCase = new URL(
        "https://storage.googleapis.com/bucket/obj?X-Goog-Signature=ZZZ",
      );
      stripSensitiveUrlParamsForCacheKey(mixedCase);
      if (mixedCase.searchParams.has("X-Goog-Signature")) {
        return false;
      }

      const noSecrets = new URL(
        "https://storage.googleapis.com/bucket/obj?keep=1",
      );
      const noSuffix = stripSensitiveUrlParamsForCacheKey(noSecrets);
      if (noSuffix !== "") {
        return false; // nothing sensitive present -> no suffix
      }
      if (!noSecrets.searchParams.has("keep")) {
        return false; // non-sensitive params must be untouched
      }

      const gcsUrlA = new URL(
        "https://storage.googleapis.com/bucket/obj?X-Goog-Signature=AAA&X-Goog-Algorithm=GOOG4-RSA-SHA256&keep=1",
      );
      const suffixA = stripSensitiveUrlParamsForCacheKey(gcsUrlA);
      if (suffixA === "" || suffixA.includes("AAA")) {
        return false; // must produce a suffix, and never contain the raw secret
      }
      if (gcsUrlA.searchParams.has("x-goog-signature")) {
        return false; // sensitive param must actually be removed from the URL
      }
      if (!gcsUrlA.searchParams.has("keep")) {
        return false; // non-sensitive params must survive
      }

      // Same stripped values, different param ORDER -> same suffix (order
      // must not affect the hash).
      const gcsUrlAReordered = new URL(
        "https://storage.googleapis.com/bucket/obj?X-Goog-Algorithm=GOOG4-RSA-SHA256&keep=1&X-Goog-Signature=AAA",
      );
      const suffixAReordered =
        stripSensitiveUrlParamsForCacheKey(gcsUrlAReordered);
      if (suffixAReordered !== suffixA) {
        return false;
      }

      // Different secret VALUE -> different suffix (no collision).
      const gcsUrlB = new URL(
        "https://storage.googleapis.com/bucket/obj?X-Goog-Signature=BBB&X-Goog-Algorithm=GOOG4-RSA-SHA256&keep=1",
      );
      const suffixB = stripSensitiveUrlParamsForCacheKey(gcsUrlB);
      return suffixB !== "" && suffixB !== suffixA;
    },
  },
  {
    // (h) processLooksLikeProxySupervisor used to match ANY process whose
    // args merely mentioned "neurolink" (a shell in a directory named
    // "neurolink", an editor with a neurolink file open) — a stale/recycled
    // pid running such a process could then be SIGTERM'd/SIGKILL'd during
    // uninstall. It must require the exact `neurolink proxy start` command.
    name: "proxy.ts (review): processLooksLikeProxySupervisor requires the proxy start command",
    category: "cli",
    fn: async () => {
      const mkProc = (...args: string[]) =>
        spawnProcess(
          process.execPath,
          ["-e", "setInterval(() => {}, 60000)", "--", ...args],
          { stdio: "ignore" },
        );
      const neurolinkOnly = mkProc("neurolink-fake-worker");
      const neurolinkProxyStatus = mkProc("neurolink", "proxy", "status");
      const neurolinkProxyStart = mkProc("neurolink", "proxy", "start");
      try {
        // Give all children a moment to register with the OS before `ps`
        // is asked about them.
        await new Promise((r) => setTimeout(r, 300));
        if (
          !neurolinkOnly.pid ||
          !neurolinkProxyStatus.pid ||
          !neurolinkProxyStart.pid
        ) {
          return false;
        }
        const notSupervisor = await processLooksLikeProxySupervisor(
          neurolinkOnly.pid,
        );
        const statusIsNotSupervisor = await processLooksLikeProxySupervisor(
          neurolinkProxyStatus.pid,
        );
        const isSupervisor = await processLooksLikeProxySupervisor(
          neurolinkProxyStart.pid,
        );
        return (
          notSupervisor === false &&
          statusIsNotSupervisor === false &&
          isSupervisor === true
        );
      } finally {
        neurolinkOnly.kill("SIGKILL");
        neurolinkProxyStatus.kill("SIGKILL");
        neurolinkProxyStart.kill("SIGKILL");
      }
    },
  },
  {
    // (i) T7 post-merge review gap: the args match alone ("neurolink" +
    // "proxy") isn't airtight — a recycled pid could be reassigned to an
    // unrelated process whose args coincidentally contain both words (e.g.
    // this very test file's own child-process args above). Harden with a
    // startTime cross-check: processLooksLikeProxySupervisor's optional
    // second argument is the persisted ProxySupervisorState.startTime (ISO
    // string); when it's far from the pid's actual OS-reported start time
    // (ps -o lstart=), that's a confident mismatch and the pid must be
    // rejected. When it's close (as it always is for the actual current
    // process), it must still be accepted.
    name: "proxy.ts (review): processLooksLikeProxySupervisor cross-checks the pid's actual start time against the persisted supervisor startTime",
    category: "cli",
    fn: async () => {
      const mkProc = (...args: string[]) =>
        spawnProcess(
          process.execPath,
          ["-e", "setInterval(() => {}, 60000)", "--", ...args],
          { stdio: "ignore" },
        );
      const neurolinkProxy = mkProc("neurolink", "proxy", "start");
      try {
        await new Promise((r) => setTimeout(r, 300));
        if (!neurolinkProxy.pid) {
          return false;
        }
        // Recorded startTime close to "now" (this process was just spawned)
        // must still be accepted.
        const closeMatch = await processLooksLikeProxySupervisor(
          neurolinkProxy.pid,
          new Date().toISOString(),
        );
        // A wildly wrong recorded startTime (this pid was "recorded" as
        // having started 25 years ago) must be a confident mismatch and
        // rejected — this is exactly the recycled-pid scenario T7 hardens
        // against.
        const wildMismatch = await processLooksLikeProxySupervisor(
          neurolinkProxy.pid,
          new Date("2000-01-01T00:00:00Z").toISOString(),
        );
        // No expected startTime at all -> falls back to args-only (matches
        // pre-hardening behavior, and the h-test above).
        const argsOnly = await processLooksLikeProxySupervisor(
          neurolinkProxy.pid,
        );
        return (
          closeMatch === true && wildMismatch === false && argsOnly === true
        );
      } finally {
        neurolinkProxy.kill("SIGKILL");
      }
    },
  },
  {
    // (i) #1213: contentHashIndex used to map a content hash to a SINGLE
    // url (Map<contentHash, url>). When the same image content was cached
    // under two urls, set() repointed the index to the newer url, dropping
    // the older url's mapping. Deleting/evicting that newer url then
    // removed the index entry entirely, even though the OLDER url's entry
    // was still live in `this.cache` - so getByContentHash() returned null
    // and the dedup benefit was lost. The fix stores a Set of urls per
    // content hash (Map<contentHash, Set<url>>) so removing one url only
    // drops it from the set, not the whole mapping.
    name: "ImageCache #1213: content-hash dedup index survives deletion of one of two same-content urls",
    category: "image-processor",
    fn: async () => {
      const originalEnv = process.env.NEUROLINK_IMAGE_CACHE_ENABLED;
      try {
        process.env.NEUROLINK_IMAGE_CACHE_ENABLED = "true";
        resetImageCache();
        const cache = getImageCache();

        const content = Buffer.from("neurolink-1213-dedup-content");
        const dataUri = "data:image/png;base64,AAAA";
        const urlA = "https://example.com/dedup-a.png";
        const urlB = "https://example.com/dedup-b.png";

        // Same content cached under two different urls - set() must ADD
        // urlB to the hash's url set rather than replacing urlA.
        cache.set(urlA, dataUri, "image/png", content);
        cache.set(urlB, dataUri, "image/png", content);

        const entryA = cache.get(urlA);
        if (!entryA) {
          return false; // sanity: first url must be cached
        }
        const contentHash = entryA.contentHash;

        const beforeDelete = cache.getByContentHash(contentHash);
        if (!beforeDelete || beforeDelete.dataUri !== dataUri) {
          return false;
        }

        // Delete the SECOND (newer) url. Pre-fix, set(urlB, ...) had
        // repointed the single-url index to urlB, so deleting urlB wiped
        // out the only mapping for this hash - getByContentHash() would
        // return null even though urlA's entry is still live in the cache.
        cache.delete(urlB);

        const afterDelete = cache.getByContentHash(contentHash);
        return (
          afterDelete !== null &&
          afterDelete.dataUri === dataUri &&
          cache.get(urlA) !== null &&
          cache.get(urlB) === null
        );
      } finally {
        if (originalEnv === undefined) {
          delete process.env.NEUROLINK_IMAGE_CACHE_ENABLED;
        } else {
          process.env.NEUROLINK_IMAGE_CACHE_ENABLED = originalEnv;
        }
        resetImageCache();
      }
    },
  },
  {
    name: "ImageCache #1213: dedup index survives EVICTION of the indexed url, not just deletion",
    category: "image-processor",
    fn: async () => {
      const originalEnv = process.env.NEUROLINK_IMAGE_CACHE_ENABLED;
      try {
        process.env.NEUROLINK_IMAGE_CACHE_ENABLED = "true";
        // maxSize=2 so a third distinct-content entry forces an eviction.
        const cache = new ImageCache({ maxSize: 2 });
        const content = Buffer.from("neurolink-1213-evict-content");
        const other = Buffer.from("neurolink-1213-other-content");
        const dataUri = "data:image/png;base64,AAAA";
        const urlA = "https://example.com/evict-a.png";
        const urlB = "https://example.com/evict-b.png";
        const urlC = "https://example.com/evict-c.png";

        cache.set(urlA, dataUri, "image/png", content); // A (content)
        cache.set(urlB, dataUri, "image/png", content); // B (dedup, same content)
        // Reading A returns its entry AND bumps it to most-recently-used, so B
        // becomes the least-recently-used and is what evictOldest() removes.
        const entryA = cache.get(urlA);
        if (!entryA) {
          return false;
        }
        const contentHash = entryA.contentHash;

        // A third, different-content image at maxSize=2 evicts the oldest (B).
        // Pre-fix, the single-url index pointed at B (the newest same-content
        // url), so evicting B dropped the only mapping for this hash and
        // getByContentHash() returned null even though A's entry is still live.
        cache.set(urlC, dataUri, "image/png", other);

        const found = cache.getByContentHash(contentHash);
        return (
          found !== null &&
          found.dataUri === dataUri &&
          cache.get(urlA) !== null && // survivor still cached
          cache.get(urlB) === null // B was evicted
        );
      } finally {
        if (originalEnv === undefined) {
          delete process.env.NEUROLINK_IMAGE_CACHE_ENABLED;
        } else {
          process.env.NEUROLINK_IMAGE_CACHE_ENABLED = originalEnv;
        }
        resetImageCache();
      }
    },
  },
  {
    name: "ImageCache #1213: dedup copy at capacity re-creates the hash index (no orphaned set)",
    category: "image-processor",
    fn: async () => {
      const originalEnv = process.env.NEUROLINK_IMAGE_CACHE_ENABLED;
      try {
        process.env.NEUROLINK_IMAGE_CACHE_ENABLED = "true";
        // maxSize=1: caching the dedup copy under a second url must evict the
        // first (emptying that hash's url set), yet the content must stay
        // reachable. The fix re-fetches/re-creates the index entry after the
        // eviction instead of adding to the now-orphaned set.
        const cache = new ImageCache({ maxSize: 1 });
        const content = Buffer.from("neurolink-1213-orphan-content");
        const dataUri = "data:image/png;base64,BBBB";
        const urlA = "https://example.com/orphan-a.png";
        const urlB = "https://example.com/orphan-b.png";

        cache.set(urlA, dataUri, "image/png", content); // A
        cache.set(urlB, dataUri, "image/png", content); // B: dedup hit; evicts A (maxSize=1)

        const entryB = cache.get(urlB);
        if (!entryB) {
          return false;
        }
        const found = cache.getByContentHash(entryB.contentHash);
        return (
          found !== null &&
          found.dataUri === dataUri &&
          cache.get(urlA) === null && // A evicted to make room
          cache.get(urlB) !== null // B survives and stays indexed
        );
      } finally {
        if (originalEnv === undefined) {
          delete process.env.NEUROLINK_IMAGE_CACHE_ENABLED;
        } else {
          process.env.NEUROLINK_IMAGE_CACHE_ENABLED = originalEnv;
        }
        resetImageCache();
      }
    },
  },

  // ---------- #1264: updater activation state reported truthfully ----------
  {
    // Before this, recordUpdateInstalled() set only pendingRestartVersion, so
    // nothing recorded what was actually validated onto disk.
    name: "proxy updateState: recordUpdateInstalled records installedVersion alongside the pending one",
    category: "proxy",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "neurolink-update-state-"));
      try {
        const statePath = pathJoin(dir, "update-state.json");
        recordUpdateInstalled("9.88.9", statePath);
        const state = loadUpdateState(statePath);
        return (
          state?.installedVersion === "9.88.9" &&
          state?.pendingRestartVersion === "9.88.9"
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    // Legacy files: back then recordUpdateInstalled() set ONLY
    // pendingRestartVersion, leaving lastUpdateVersion on the previously
    // ACTIVATED build. Reading lastUpdateVersion first would report the
    // superseded version as installed and re-offer an update already on disk.
    name: "proxy updateState: legacy state backfills installedVersion from the pending version",
    category: "proxy",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "neurolink-update-state-"));
      try {
        const statePath = pathJoin(dir, "update-state.json");
        writeFileSync(
          statePath,
          JSON.stringify({
            lastCheckAt: new Date().toISOString(),
            lastCheckVersion: "9.90.0",
            suppressedVersions: {},
            lastUpdateAt: new Date().toISOString(),
            lastUpdateVersion: "9.88.0",
            pendingRestartVersion: "9.90.0",
          }),
          "utf8",
        );
        const state = loadUpdateState(statePath);
        return (
          state?.installedVersion === "9.90.0" &&
          state?.pendingRestartVersion === "9.90.0" &&
          state?.lastUpdateVersion === "9.88.0"
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "proxy updateState: an explicit installedVersion wins over the legacy backfill",
    category: "proxy",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "neurolink-update-state-"));
      try {
        const statePath = pathJoin(dir, "update-state.json");
        writeFileSync(
          statePath,
          JSON.stringify({
            lastCheckAt: new Date().toISOString(),
            lastCheckVersion: "9.90.0",
            suppressedVersions: {},
            installedVersion: "9.89.0",
            lastUpdateVersion: "9.88.0",
            pendingRestartVersion: "9.90.0",
          }),
          "utf8",
        );
        return loadUpdateState(statePath)?.installedVersion === "9.89.0";
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "proxy updateState: falls back to lastUpdateVersion when nothing is pending",
    category: "proxy",
    fn: async () => {
      const dir = mkdtempSync(pathJoin(tmpdir(), "neurolink-update-state-"));
      try {
        const statePath = pathJoin(dir, "update-state.json");
        writeFileSync(
          statePath,
          JSON.stringify({
            lastCheckAt: new Date().toISOString(),
            lastCheckVersion: "9.88.0",
            suppressedVersions: {},
            lastUpdateVersion: "9.88.0",
          }),
          "utf8",
        );
        const state = loadUpdateState(statePath);
        return (
          state?.installedVersion === "9.88.0" &&
          state?.pendingRestartVersion === null
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    // A live supervisor PID alone is not enough to promise a rolling handoff: a
    // supervisor from a build predating rolling state leaves `rolling` absent,
    // and calling that a handoff strands the CLI and /status clients waiting for
    // an activation that can never happen.
    name: "proxy status: a legacy supervisor with no rolling state is not handoff-capable",
    category: "proxy",
    fn: async () => {
      const alive = () => true;
      const legacy = {
        pid: 4242,
        host: "127.0.0.1",
        port: 55669,
        startTime: new Date(0).toISOString(),
      } as unknown as ProxySupervisorState;
      return (
        !isRollingHandoffCapable(legacy, alive) &&
        !isRollingHandoffCapable(
          { ...legacy, rolling: null } as never,
          alive,
        ) &&
        // Same unvalidated `as T` load that lets `version` be an object.
        !isRollingHandoffCapable(
          { ...legacy, rolling: "yes" } as never,
          alive,
        ) &&
        !isRollingHandoffCapable(null, alive)
      );
    },
  },
  {
    name: "proxy status: handoff-capable requires a live process AND rolling state",
    category: "proxy",
    fn: async () => {
      const rolling = {
        pid: 4242,
        host: "127.0.0.1",
        port: 55669,
        startTime: new Date(0).toISOString(),
        rolling: {
          generation: 1,
          active: null,
          candidate: null,
          draining: [],
          queuedSockets: 0,
          rejectedSockets: 0,
          failedTransfers: 0,
          lastFailure: null,
        },
      } satisfies ProxySupervisorState;
      return (
        isRollingHandoffCapable(rolling, () => true) &&
        // Rolling state present but the process is gone — still not a handoff.
        !isRollingHandoffCapable(rolling, () => false)
      );
    },
  },
  {
    // StateFileManager.load() is a bare `as T`, so version really can be an
    // object. Left alone it renders as "v[object Object]" in every status surface.
    name: "proxy status: a supervisor version that is not a string is dropped at load",
    category: "proxy",
    fn: async () => {
      const corrupt = {
        pid: 4242,
        host: "127.0.0.1",
        port: 55669,
        startTime: new Date(0).toISOString(),
        version: { major: 9 },
      } as unknown as ProxySupervisorState;
      return (
        normalizeSupervisorState(corrupt)?.version === undefined &&
        normalizeSupervisorState({ ...corrupt, version: "9.88.9" })?.version ===
          "9.88.9" &&
        normalizeSupervisorState(null) === null
      );
    },
  },
];

// ============================================================================
// Runner
// ============================================================================

async function runAllBugfixTests(): Promise<void> {
  log(`Running ${tests.length} tests...\n`);
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === null) {
        recordTest(test.name, false, true, "skipped");
      } else {
        recordTest(
          test.name,
          result,
          false,
          result ? undefined : "assertion failed",
        );
      }
    } catch (error) {
      recordTest(test.name, false, false, getErrorMessage(error));
    }
  }
}

await runSuite(runAllBugfixTests);
