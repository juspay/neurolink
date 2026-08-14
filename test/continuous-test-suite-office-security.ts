#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Office decompression bounds.
 *
 * ## What this suite is for
 *
 * .docx, .xlsx, .pptx and .odt are ZIP containers, so they inherit the archive
 * formats' exposure: what arrives is compressed, what gets parsed is expanded,
 * and `maxSizeMB` only ever measured the first of those.
 *
 * Only two of the four turned out to be exploitable. .pptx and .odt read their
 * entries directly and expanded a 400MB bomb in full — 817MB and 841MB peak.
 * .docx and .xlsx hand their unzipping to mammoth and exceljs, which refuse
 * the same bomb by themselves at 46MB and 53MB, so they are covered here by
 * characterization tests rather than by a guard: adding one was measured at
 * 133MB, tripling the cost of every ordinary document to fix nothing.
 *
 * That distinction only exists because the numbers were taken. The plan going
 * in was to guard all four.
 *
 * ## Why memory is measured in a child process
 *
 * `process.resourceUsage().maxRSS` is a monotonic high-water mark. Measured
 * in-process across several tests, everything after the first big allocation
 * reads zero growth and passes regardless of what it did. Each probe therefore
 * runs in its own process.
 *
 * It also has to be `maxRSS` rather than a sampled `memoryUsage()`: the
 * inflate is synchronous and holds the event loop for its whole duration, so a
 * timer-based sampler never fires while the memory is live.
 *
 * ## The other half
 *
 * A bound that refuses everything satisfies every memory assertion here, so
 * each format is also given an ordinary document of exactly the same shape and
 * required to return its contents. Those fixtures are real: mammoth, exceljs,
 * PptxProcessor and OpenDocumentProcessor each parse their own.
 *
 * Run: npx tsx test/continuous-test-suite-office-security.ts
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { defineSuite, assert, tempDir, Skip } from "./helpers/harness.js";
import { BOMB_MB } from "./helpers/archiveBombFixtures.js";
import {
  docxMembers,
  odtMembers,
  pptxMembers,
  writeOfficeZip,
} from "./helpers/officeBombFixtures.js";
import { WordProcessor } from "../src/lib/processors/document/WordProcessor.js";
import { ExcelProcessor } from "../src/lib/processors/document/ExcelProcessor.js";
import { PptxProcessor } from "../src/lib/processors/document/PptxProcessor.js";
import { OpenDocumentProcessor } from "../src/lib/processors/document/OpenDocumentProcessor.js";
import { NeuroLink } from "../src/lib/neurolink.js";

const execFileAsync = promisify(execFile);
const { test, runSuite } = defineSuite("Office decompression bounds");

const dir = tempDir("neurolink-office-security-");

/** Hidden in every ordinary fixture; no prior, so it can only be read. */
const TOKEN = "84317";

/**
 * Ceiling for a bounded run, in MB.
 *
 * Half the bomb, which separates the two outcomes with room on both sides.
 */
const BOUNDED_CEILING_MB = BOMB_MB / 2;

const PROVIDER = process.env.MM_TEST_PROVIDER ?? "vertex";

function hasCredentials(): boolean {
  switch (PROVIDER) {
    case "vertex":
    case "google-vertex":
      return Boolean(
        process.env.GOOGLE_VERTEX_PROJECT ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      );
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    default:
      return false;
  }
}

type ProbeResult = { rssGrowthMb: number; outcome: string; detail: string };

/** Run one format's bomb in a fresh process and read back its peak memory. */
async function probe(scenario: string, fixture: string): Promise<ProbeResult> {
  // fileURLToPath rather than `new URL(...).pathname`: the latter keeps a
  // leading slash on Windows drive paths and leaves spaces percent-encoded,
  // so the child path would be wrong for anyone whose checkout sits under a
  // directory with a space in its name.
  const child = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "helpers",
    "officeProbeChild.ts",
  );
  const { stdout } = await execFileAsync(
    process.execPath,
    ["--import", "tsx", child, scenario, fixture],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  const line = stdout.trim().split("\n").filter(Boolean).pop() ?? "{}";
  return JSON.parse(line) as ProbeResult;
}

function fileInfoFor(file: string, name: string, mimetype: string) {
  const buffer = fs.readFileSync(file);
  return { id: name, name, mimetype, size: buffer.length, buffer };
}

/**
 * A genuine .xlsx, written by exceljs itself rather than approximated.
 *
 * The namespace is normalised the way the processor's own `loadExcelJS` does:
 * exceljs is CommonJS, so under Node ESM the constructor sits on `default`
 * rather than on the namespace, while esModuleInterop types it as present on
 * both. A bare `new ExcelJS.Workbook()` typechecks and throws at runtime —
 * which is exactly how this fixture failed the first time.
 */
async function writeRealWorkbook(file: string): Promise<string> {
  const excelNamespace = await import("exceljs");
  const ns = excelNamespace as unknown as {
    Workbook?: unknown;
    default?: typeof excelNamespace;
  };
  const ExcelJS = ns.Workbook ? excelNamespace : (ns.default ?? excelNamespace);
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Sheet1").addRow(["access code", TOKEN]);
  await workbook.xlsx.writeFile(file);
  return file;
}

// ---------------------------------------------------------------------------
// Word — mammoth owns the unzipping and takes no output bound
// ---------------------------------------------------------------------------

await test("mammoth refuses a Word bomb on its own, without a guard in front", async () => {
  // A characterization test, not a regression test for our code — there is
  // deliberately no bound here. Measured at 46MB peak against a 400MB bomb in
  // word/document.xml, because mammoth reads only the parts it needs and
  // gives up on this one. Adding a pre-scan in front of it was measured at
  // 133MB, so the "fix" cost roughly 3x on every ordinary document and bought
  // nothing. This test exists so that if mammoth ever stops refusing, the
  // decision not to guard it gets revisited rather than silently inherited.
  const fixture = await writeOfficeZip(path.join(dir, "bomb.docx"), [
    ...docxMembers(TOKEN).filter((m) => m.name !== "word/document.xml"),
    { name: "word/document.xml", bombMb: BOMB_MB },
  ]);
  const result = await probe("word", fixture);
  assert(
    result.rssGrowthMb < BOUNDED_CEILING_MB,
    "the bomb was refused without being expanded",
  );
  assert(
    result.detail.includes("success=false"),
    "the document was rejected rather than accepted",
  );
});

await test("an ordinary Word document still yields its text", async () => {
  const fixture = await writeOfficeZip(
    path.join(dir, "ok.docx"),
    docxMembers(TOKEN),
  );
  const result = (await new WordProcessor().processFile(
    fileInfoFor(
      fixture,
      "ok.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ) as never,
  )) as { success?: boolean; data?: unknown };
  assert(result.success === true, "the document processed successfully");
  assert(
    JSON.stringify(result.data ?? "").includes(TOKEN),
    "the document's text reached the caller",
  );
});

// ---------------------------------------------------------------------------
// Excel — exceljs parses the whole workbook before the row and sheet caps
// ---------------------------------------------------------------------------

await test("exceljs refuses an Excel bomb on its own, without a guard in front", async () => {
  // Characterization, for the same reason as the Word case above: measured at
  // 53MB peak against a 400MB bomb, so no guard was added.
  //
  // Built from a REAL workbook with only the sheet part swapped, because a
  // bomb in a hand-made container never gets read — exceljs stops long before
  // it, and the test would pass without exercising anything.
  const real = await writeRealWorkbook(path.join(dir, "real-for-bomb.xlsx"));
  const admZip = await import("adm-zip");
  const SHEET_PART = "xl/worksheets/sheet1.xml";
  const entries = new admZip.default(fs.readFileSync(real))
    .getEntries()
    .filter((e) => !e.isDirectory);
  assert(
    entries.some((e) => e.entryName === SHEET_PART),
    "the fixture workbook contains the sheet part the bomb replaces",
  );
  const fixture = await writeOfficeZip(
    path.join(dir, "bomb.xlsx"),
    entries.map((e) =>
      e.entryName === SHEET_PART
        ? { name: e.entryName, bombMb: BOMB_MB }
        : { name: e.entryName, text: e.getData().toString("utf-8") },
    ),
  );

  const result = await probe("excel", fixture);
  assert(
    result.rssGrowthMb < BOUNDED_CEILING_MB,
    "the bomb was refused without being expanded",
  );
  assert(
    result.detail.includes("success=false"),
    "the workbook was rejected rather than accepted",
  );
});

await test("an ordinary Excel workbook still yields its rows", async () => {
  const file = await writeRealWorkbook(path.join(dir, "ok.xlsx"));
  const result = (await new ExcelProcessor().processFile(
    fileInfoFor(
      file,
      "ok.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ) as never,
  )) as { success?: boolean; data?: unknown };
  assert(result.success === true, "the workbook processed successfully");
  assert(
    JSON.stringify(result.data ?? "").includes(TOKEN),
    "the workbook's cell values reached the caller",
  );
});

// ---------------------------------------------------------------------------
// PowerPoint — a static utility with no size limit of its own at all
// ---------------------------------------------------------------------------

await test("a PowerPoint deck cannot inflate past the limit", async () => {
  // The bomb has to BE a slide. This processor reads only entries matching
  // ppt/slides/slideN.xml, so a bomb parked anywhere else is never touched —
  // by the fix or by the code before it — and the test passes either way
  // while demonstrating nothing.
  const fixture = await writeOfficeZip(path.join(dir, "bomb.pptx"), [
    ...pptxMembers(TOKEN).filter((m) => m.name !== "ppt/slides/slide1.xml"),
    { name: "ppt/slides/slide1.xml", bombMb: BOMB_MB },
  ]);
  const result = await probe("pptx", fixture);
  assert(
    result.rssGrowthMb < BOUNDED_CEILING_MB,
    "the deck's entries were bounded rather than expanded in full",
  );
});

await test("an ordinary PowerPoint deck still yields its slide text", async () => {
  const fixture = await writeOfficeZip(
    path.join(dir, "ok.pptx"),
    pptxMembers(TOKEN),
  );
  const text = await PptxProcessor.extractText(fs.readFileSync(fixture));
  assert((text ?? "").includes(TOKEN), "the slide's text reached the caller");
});

// ---------------------------------------------------------------------------
// OpenDocument
// ---------------------------------------------------------------------------

await test("an OpenDocument file cannot inflate past the limit", async () => {
  const fixture = await writeOfficeZip(
    path.join(dir, "bomb.odt"),
    // The bomb IS content.xml here: the entry the processor actually reads.
    [
      { name: "mimetype", text: "application/vnd.oasis.opendocument.text" },
      { name: "content.xml", bombMb: BOMB_MB },
    ],
  );
  const result = await probe("odt", fixture);
  assert(
    result.rssGrowthMb < BOUNDED_CEILING_MB,
    "content.xml was bounded rather than expanded in full",
  );
});

await test("an ordinary OpenDocument file still yields its text", async () => {
  const fixture = await writeOfficeZip(
    path.join(dir, "ok.odt"),
    odtMembers(TOKEN),
  );
  const result = (await new OpenDocumentProcessor().processFile(
    fileInfoFor(
      fixture,
      "ok.odt",
      "application/vnd.oasis.opendocument.text",
    ) as never,
  )) as { success?: boolean; data?: unknown };
  assert(result.success === true, "the document processed successfully");
  assert(
    JSON.stringify(result.data ?? "").includes(TOKEN),
    "the document's text reached the caller",
  );
});

// ---------------------------------------------------------------------------
// Live — the whole point is that ordinary documents still reach the model
// ---------------------------------------------------------------------------

await test("an ordinary Word document still reaches the model through generate()", async () => {
  if (!hasCredentials()) {
    throw new Skip(
      `no credentials for provider "${PROVIDER}" — skipping live assertion`,
    );
  }
  const fixture = await writeOfficeZip(
    path.join(dir, "ok.docx"),
    docxMembers(TOKEN),
  );
  const result = await new NeuroLink().generate({
    input: {
      text: "What is the access code in the attached document? Reply with only the digits.",
      files: [fixture],
    },
    provider: PROVIDER,
    maxTokens: 128,
    timeout: 120_000,
  });
  assert(
    (result.content ?? "").includes(TOKEN),
    "the document's contents reached the model and came back",
  );
});

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();
