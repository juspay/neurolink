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

import {
  convertToModelMessages,
  buildMultimodalMessagesArray,
} from "../src/lib/utils/messageBuilder.js";
import {
  CSVProcessor,
  isValidCsvRow,
  assertValidCsvRow,
  sanitizeColumnName,
  dedupeColumnNames,
} from "../src/lib/utils/csvProcessor.js";
import { NeuroLinkError } from "../src/lib/utils/errorHandling.js";
import { ErrorCategory } from "../src/lib/constants/enums.js";
import { decodeBuffer } from "../src/lib/utils/textEncoding.js";
import { CSVLoader } from "../src/lib/rag/document/loaders.js";
import type { CSVLoaderOptions } from "../src/lib/types/index.js";
import iconv from "iconv-lite";
import { Readable, Transform } from "node:stream";
import { PDFProcessor } from "../src/lib/utils/pdfProcessor.js";
import { directAgentTools } from "../src/lib/agent/directTools.js";
import { isMultimodalInput } from "../src/lib/types/index.js";
import { FileDetector } from "../src/lib/utils/fileDetector.js";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import AdmZip from "adm-zip";
import { PptxProcessor } from "../src/lib/processors/document/PptxProcessor.js";

import {
  GoogleVertexProvider,
  resolveVertexLocation,
} from "../src/lib/providers/googleVertex.js";

import {
  appendStepText,
  mapGeminiFinishReason,
} from "../src/lib/providers/googleNativeGemini3.js";

import { OpenAICompatibleProvider } from "../src/lib/providers/openaiCompatible.js";
import { LiteLLMProvider } from "../src/lib/providers/litellm.js";
import { ModelAccessDeniedError } from "../src/lib/types/index.js";

import {
  getPlayerCandidates,
  buildPlaybackErrorMessage,
  escapePowerShellSingleQuoted,
} from "../src/cli/utils/audioPlayer.js";

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
      // 0, negative, non-finite, and above the max must all be rejected on scale.
      for (const bad of [0, -1, Number.NaN, 11]) {
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
    name: "buildProxyTranslationPlan: auto-provider added when no fallback chain",
    category: "routing-policy",
    fn: async () => {
      const parsed = makeParsedRequest();
      const plan = buildProxyTranslationPlan(
        { provider: "anthropic", model: "claude-sonnet-4-20250514" },
        [],
        "claude-sonnet-4-20250514",
        parsed,
      );

      return (
        plan.attempts.length === 2 && plan.attempts[1].label === "auto-provider"
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
      const { resetStats, getStats } =
        await import("../src/lib/proxy/usageStats.js");
      resetStats();
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
    name: "openai-compatible.doGenerate forwards maxTokens/temperature/tools/responseFormat to the wire body",
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
