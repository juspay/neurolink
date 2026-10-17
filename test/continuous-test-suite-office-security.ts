#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Office documents reach the model.
 *
 * Attaches an ordinary .docx and requires its text to come back through
 * `generate()`. The Office paths bound how far a zip member may inflate; this
 * suite is what fails if that bound is ever tightened into refusing legitimate
 * documents.
 *
 * ## Attack coverage: docx / xlsx XML-entity payloads
 *
 * `WordProcessor` (mammoth → `@xmldom/xmldom`) and `ExcelProcessor` (exceljs →
 * saxes) have no *application-level* DOCTYPE/ENTITY guard of their own —
 * unlike `XmlProcessor.checkXxeVectors()`, which rejects a raw `.xml`
 * attachment before it is ever parsed (see the reachability note below).
 * Empirically, both underlying XML parsers fail closed anyway: a
 * `<!DOCTYPE …[ <!ENTITY … SYSTEM "…"> ]>` external-entity payload and a
 * classic "billion laughs" nested-internal-entity payload both throw a parse
 * error ("entity not found", "undefined entity") in single-digit
 * milliseconds, for every payload tried, with no entity resolution or
 * expansion observed. The tests below prove that end-to-end through
 * `generate()` — a mock chat server captures the exact request body NeuroLink
 * would have sent, so the assertion is "the secret/expansion marker never
 * left the process," not "the model didn't repeat it back." Each is wrapped
 * in a wall-clock timeout as a defensive measure, in case a future dependency
 * bump changes this fail-closed behaviour into something that hangs instead.
 *
 * Not covered here: raw `.xml` attachments. `XmlProcessor`'s XXE guard is
 * real and correct but is not reachable from `generate()`/`stream()` today —
 * `src/lib/processors/config/fileTypeRegistry.ts` has no `"xml"` entry,
 * `mimeTypeHints.ts` maps `application/xml`/`text/xml` to the generic `"text"`
 * type, and `messageBuilder.ts`'s `allowedTypes` whitelist has no `"xml"`
 * entry either — so a `.xml` attachment is always routed to inert generic-text
 * handling and `XmlProcessor` is never invoked. A test asserting the guard
 * "fires" through the public surface would therefore test nothing; per rule
 * 15 (end-to-end only) this is recorded as a finding, not a test. `.pptx` is
 * excluded by design, not by gap: `PptxProcessor` extracts text with a single
 * regex over raw bytes (no DOM/SAX parser in its path at all), so it has no
 * entity-expansion surface to attack.
 *
 * ## Bound coverage: peak memory, measured in a child process
 *
 * A size limit checked against the finished buffer is arithmetically correct
 * and useless: the allocation it exists to prevent has already happened, and the
 * outcome looks identical either way. Each case therefore attaches a 400 MB
 * bomb to `generate()` in a fresh process and reads
 * `process.resourceUsage().maxRSS` (`helpers/boundedGenerateChild.ts`, which
 * imports only `dist/`), after an ordinary file of the same shape has gone
 * through the same child so one-off module loading is not charged to the bomb.
 *
 * That ordinary file has to reach the request, which is what stops a bound that
 * refuses everything from passing. It is DEFLATED, like the bomb and like a real
 * document: the zip reader copies a STORED member out without decoding it, so a
 * stored warm-up would never touch the bounded inflate and a regression that
 * refuses every inflate would leave it green.
 *
 *   - **pptx and odt**: SDK code bounds these. Both read their parts through
 *     `readZipEntryWithinLimit`, the archive reader's function, each with its own
 *     limit (100 MB). The bomb member declares size 0 and has to BE the part the
 *     processor reads (a slide, or `content.xml`); parked anywhere else it is
 *     never opened and the case proves nothing. Measured growth with the bound
 *     in place is 55-90 MB (pptx) and 55-91 MB (odt), against 755-773 MB with it
 *     removed. Regression cases.
 *   - **docx and xlsx**: no SDK bound at all. mammoth and exceljs unzip for
 *     themselves. Measured growth is 0-11 MB (docx) and 0-5 MB (xlsx). These
 *     cases are characterization of what those libraries cost today, kept so a
 *     dependency bump that starts allocating the bomb fails here instead of
 *     being silently inherited. They cannot tell a bomb the library opened and
 *     refused from one it never read: both end in the same refusal notice and
 *     low memory, and nothing here records the library failing on the bomb part.
 *     The xlsx bomb replaces the sheet part of a real workbook, because a bomb
 *     in a hand-made container is never read.
 *
 * The request alone cannot say whether the bound is there: with `maxOutputLength`
 * removed the pptx and odt bombs are still turned away ("no usable content"), so
 * the body matches the bounded run. Peak memory is the one observable that
 * differs; calibration, with the bound removed from a scratch copy of `dist/`, is
 * in `helpers/boundedGenerateProbe.ts`.
 *
 * ## One case that is not driven through generate()
 *
 * "a failed on-demand PowerPoint extraction names the file in its warning"
 * drives the package's `./files` export (`FileReferenceRegistry`). The
 * registry's lazy PowerPoint path cannot be reached from `generate()`, because
 * a `.pptx` attachment is processed eagerly and never registered for on-demand
 * extraction. Determinism buys a fixture no real deck can be: a ZIP signature
 * with no central directory, which makes the extractor fail every time.
 *
 * Run: npx tsx test/continuous-test-suite-office-security.ts
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import AdmZip from "adm-zip";
import { defineSuite, assert, tempDir, Skip } from "./helpers/harness.js";
import { BOMB_MB } from "./helpers/archiveBombFixtures.js";
import {
  assertBombRefusedInRequest,
  assertGrowthBounded,
  probeGenerate,
} from "./helpers/boundedGenerateProbe.js";
import {
  deflatedMembers,
  docxMembers,
  odtMembers,
  pptxMembers,
  writeOfficeZip,
} from "./helpers/officeBombFixtures.js";
import {
  makeDocxRaw,
  makeXlsx,
  makeXlsxRaw,
  hasPackage,
} from "./helpers/officeFixtures.js";
import {
  startMockChatServer,
  mockOpenAICredentials,
} from "./helpers/mockChatServer.js";
import { NeuroLink, logger } from "../dist/index.js";

/** Rejects if `promise` has not settled within `ms`, as a defensive backstop. */
function withTimeoutMs<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out after ${ms}ms: ${label}`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err as Error);
      },
    );
  });
}

const { test, runSuite } = defineSuite("Office document delivery");

const dir = tempDir("neurolink-office-security-");

/** Hidden in the ordinary fixture; no prior, so it can only be read. */
const TOKEN = "84317";

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

/**
 * These payloads only prove anything if the extractor that parses them is
 * actually installed. mammoth and exceljs are optionalDependencies, and
 * WordProcessor/ExcelProcessor funnel a missing-dependency tryImport failure
 * into the same generic "Could not extract content" placeholder that a genuine
 * parser-level rejection produces. The assertions below cannot tell those two
 * apart: with mammoth removed, the docx XXE test still passes with zero lines
 * of XML-parsing code executed and zero bytes of payload reaching a parser.
 *
 * That is not hypothetical — ci.yml already runs `pnpm install --no-optional`
 * for the CLI smoke job, and any platform where the native build fails lands in
 * the same state. A security test that is green because it never ran is worse
 * than no test, so gate on the extractor being present and skip loudly when it
 * is not.
 */
async function requireExtractor(pkg: string): Promise<void> {
  if (!(await hasPackage(pkg))) {
    throw new Skip(
      `${pkg} is not installed — the payload would never reach an XML parser, so this test cannot prove anything`,
    );
  }
}

await test("an ordinary Word document still reaches the model through generate()", async () => {
  await requireExtractor("mammoth");
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

const XXE_SECRET_MARKER = "OFFICE_XXE_EXFIL_MARKER_7f2c9a";
const secretPath = path.join(dir, "xxe-secret.txt");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(secretPath, XXE_SECRET_MARKER);
const secretUri = `file://${secretPath.split(path.sep).join("/")}`;

const LOL_MARKER = "lolz";

function billionLaughsXml(rootOpen: string, rootClose: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE root [
  <!ENTITY ${LOL_MARKER}0 "lol">
  <!ENTITY ${LOL_MARKER}1 "&${LOL_MARKER}0;&${LOL_MARKER}0;&${LOL_MARKER}0;&${LOL_MARKER}0;&${LOL_MARKER}0;&${LOL_MARKER}0;&${LOL_MARKER}0;&${LOL_MARKER}0;&${LOL_MARKER}0;&${LOL_MARKER}0;">
  <!ENTITY ${LOL_MARKER}2 "&${LOL_MARKER}1;&${LOL_MARKER}1;&${LOL_MARKER}1;&${LOL_MARKER}1;&${LOL_MARKER}1;&${LOL_MARKER}1;&${LOL_MARKER}1;&${LOL_MARKER}1;&${LOL_MARKER}1;&${LOL_MARKER}1;">
  <!ENTITY ${LOL_MARKER}3 "&${LOL_MARKER}2;&${LOL_MARKER}2;&${LOL_MARKER}2;&${LOL_MARKER}2;&${LOL_MARKER}2;&${LOL_MARKER}2;&${LOL_MARKER}2;&${LOL_MARKER}2;&${LOL_MARKER}2;&${LOL_MARKER}2;">
]>
${rootOpen}&${LOL_MARKER}3;${rootClose}`;
}

await test("a docx external-entity (XXE) payload never leaks its target into the outbound request — generate()", async () => {
  await requireExtractor("mammoth");
  const maliciousDoc = `<?xml version="1.0"?>
<!DOCTYPE w:document [ <!ENTITY xxe SYSTEM "${secretUri}"> ]>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>&xxe;</w:t></w:r></w:p></w:body>
</w:document>`;
  const fixture = path.join(dir, "xxe.docx");
  fs.writeFileSync(fixture, makeDocxRaw(maliciousDoc));
  const server = await startMockChatServer();
  try {
    try {
      await withTimeoutMs(
        new NeuroLink().generate({
          input: { text: "Summarize the attached document.", files: [fixture] },
          provider: "openai",
          credentials: mockOpenAICredentials(server),
          maxTokens: 64,
          timeout: 30_000,
        }),
        15_000,
        "docx XXE generate()",
      );
    } catch {
      // A thrown rejection is an acceptable, even stronger, outcome here —
      // the only thing under test is whether the secret ever left the process.
    }
    const body = server.getLastRequestBody() ?? "";
    assert(
      !body.includes(XXE_SECRET_MARKER),
      "the external entity's target content must never appear in the outbound request body",
    );
  } finally {
    await server.close();
  }
});

await test("a docx billion-laughs payload does not hang and does not expand into the outbound request — generate()", async () => {
  await requireExtractor("mammoth");
  const maliciousDoc = billionLaughsXml(
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>',
    "</w:t></w:r></w:p></w:body></w:document>",
  );
  const fixture = path.join(dir, "lol.docx");
  fs.writeFileSync(fixture, makeDocxRaw(maliciousDoc));
  const server = await startMockChatServer();
  try {
    try {
      await withTimeoutMs(
        new NeuroLink().generate({
          input: { text: "Summarize the attached document.", files: [fixture] },
          provider: "openai",
          credentials: mockOpenAICredentials(server),
          maxTokens: 64,
          timeout: 30_000,
        }),
        15_000,
        "docx billion-laughs generate()",
      );
    } catch {
      // A thrown rejection (or the outer timeout) is an acceptable outcome —
      // the invariant under test is bounded request size, not a specific
      // success/failure shape.
    }
    const body = server.getLastRequestBody() ?? "";
    assert(
      body.length < 200_000,
      "the outbound request body must stay bounded, not carry the entity expansion",
    );
  } finally {
    await server.close();
  }
});

await test("an xlsx external-entity (XXE) payload never leaks its target into the outbound request — generate()", async () => {
  await requireExtractor("exceljs");
  const maliciousSheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE worksheet [ <!ENTITY xxe SYSTEM "${secretUri}"> ]>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData><row r="1"><c r="A1" t="str"><v>&xxe;</v></c></row></sheetData>
</worksheet>`;
  const fixture = path.join(dir, "xxe.xlsx");
  fs.writeFileSync(fixture, await makeXlsxRaw(maliciousSheet));
  const server = await startMockChatServer();
  try {
    try {
      await withTimeoutMs(
        new NeuroLink().generate({
          input: {
            text: "Summarize the attached spreadsheet.",
            files: [fixture],
          },
          provider: "openai",
          credentials: mockOpenAICredentials(server),
          maxTokens: 64,
          timeout: 30_000,
        }),
        15_000,
        "xlsx XXE generate()",
      );
    } catch {
      // Same reasoning as the docx case above.
    }
    const body = server.getLastRequestBody() ?? "";
    assert(
      !body.includes(XXE_SECRET_MARKER),
      "the external entity's target content must never appear in the outbound request body",
    );
  } finally {
    await server.close();
  }
});

await test("an xlsx billion-laughs payload does not hang and does not expand into the outbound request — generate()", async () => {
  await requireExtractor("exceljs");
  const maliciousSheet = billionLaughsXml(
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="str"><v>',
    "</v></c></row></sheetData></worksheet>",
  );
  const fixture = path.join(dir, "lol.xlsx");
  fs.writeFileSync(fixture, await makeXlsxRaw(maliciousSheet));
  const server = await startMockChatServer();
  try {
    try {
      await withTimeoutMs(
        new NeuroLink().generate({
          input: {
            text: "Summarize the attached spreadsheet.",
            files: [fixture],
          },
          provider: "openai",
          credentials: mockOpenAICredentials(server),
          maxTokens: 64,
          timeout: 30_000,
        }),
        15_000,
        "xlsx billion-laughs generate()",
      );
    } catch {
      // Same reasoning as the docx billion-laughs case above.
    }
    const body = server.getLastRequestBody() ?? "";
    assert(
      body.length < 200_000,
      "the outbound request body must stay bounded, not carry the entity expansion",
    );
  } finally {
    await server.close();
  }
});

/**
 * Attach `warmup` and then `bomb` to `generate()` in a fresh process and judge
 * the memory the bomb cost and what reached the request.
 */
async function assertBombBounded(warmup: string, bomb: string): Promise<void> {
  const server = await startMockChatServer();
  try {
    const result = await probeGenerate(warmup, bomb, server.baseURL);
    assertGrowthBounded(result);
    assertBombRefusedInRequest(result, server.getAllRequestBodies(), TOKEN);
  } finally {
    await server.close();
  }
}

/** Every member of `members` except the one named `name`. */
function without<T extends { readonly name: string }>(
  members: readonly T[],
  name: string,
): T[] {
  return members.filter((m) => m.name !== name);
}

await test("a PowerPoint slide declaring size 0 is inflated under the reader's bound — generate()", async () => {
  // Deflated, like a real deck: a stored member never reaches the bounded call.
  const warmup = await writeOfficeZip(
    path.join(dir, "warmup.pptx"),
    deflatedMembers(pptxMembers(TOKEN)),
  );
  // The bomb has to BE a slide: the processor reads only ppt/slides/slideN.xml.
  const bomb = await writeOfficeZip(path.join(dir, "bomb.pptx"), [
    ...deflatedMembers(without(pptxMembers(TOKEN), "ppt/slides/slide1.xml")),
    { name: "ppt/slides/slide1.xml", bombMb: BOMB_MB },
  ]);
  await assertBombBounded(warmup, bomb);
});

await test("an OpenDocument content.xml declaring size 0 is inflated under the reader's bound — generate()", async () => {
  const warmup = await writeOfficeZip(
    path.join(dir, "warmup.odt"),
    deflatedMembers(odtMembers(TOKEN)),
  );
  // The bomb IS content.xml, the entry the processor actually reads.
  const bomb = await writeOfficeZip(path.join(dir, "bomb.odt"), [
    { name: "mimetype", text: "application/vnd.oasis.opendocument.text" },
    { name: "content.xml", bombMb: BOMB_MB },
  ]);
  await assertBombBounded(warmup, bomb);
});

await test("characterization: a Word bomb stays cheap through mammoth with no bound of ours — generate()", async () => {
  await requireExtractor("mammoth");
  const warmup = await writeOfficeZip(
    path.join(dir, "warmup.docx"),
    deflatedMembers(docxMembers(TOKEN)),
  );
  const bomb = await writeOfficeZip(path.join(dir, "bomb.docx"), [
    ...deflatedMembers(without(docxMembers(TOKEN), "word/document.xml")),
    { name: "word/document.xml", bombMb: BOMB_MB },
  ]);
  await assertBombBounded(warmup, bomb);
});

await test("characterization: an Excel bomb stays cheap through exceljs with no bound of ours — generate()", async () => {
  await requireExtractor("exceljs");
  const SHEET_PART = "xl/worksheets/sheet1.xml";
  const workbook = await makeXlsx({ Sheet1: [["access code", TOKEN]] });
  const warmup = path.join(dir, "warmup.xlsx");
  fs.writeFileSync(warmup, workbook);
  const parts = new AdmZip(workbook)
    .getEntries()
    .filter((entry) => !entry.isDirectory);
  assert(
    parts.some((entry) => entry.entryName === SHEET_PART),
    "the fixture workbook has no sheet part for the bomb to replace",
  );
  const bomb = await writeOfficeZip(
    path.join(dir, "bomb.xlsx"),
    parts.map((entry) =>
      entry.entryName === SHEET_PART
        ? { name: entry.entryName, bombMb: BOMB_MB }
        : {
            name: entry.entryName,
            text: entry.getData().toString("utf8"),
            deflate: true,
          },
    ),
  );
  await assertBombBounded(warmup, bomb);
});

await test("a failed on-demand PowerPoint extraction names the file in its warning", async () => {
  // Surface: the package's `./files` export. generate() cannot reach this path:
  // a .pptx attachment is processed eagerly (messageBuilder.ts isEagerType), so
  // it is never registered for lazy extraction and the registry is only
  // reachable through this export.
  const { FileReferenceRegistry } = await import("../dist/files/index.js");
  const filename = "unreadable-presentation.pptx";
  // ZIP signature and nothing else (no central directory), above the registry's
  // tiny-file limit so it is written to disk and read back for on-demand work.
  const fixture = Buffer.alloc(20 * 1024, 0x42);
  fixture.writeUInt32LE(0x04034b50, 0);
  const registry = new FileReferenceRegistry({
    tempDir: tempDir("neurolink-pptx-registry-"),
  });
  const warnings: string[] = [];
  const originalWarn = logger.warn;
  logger.warn = ((...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  }) as typeof logger.warn;
  let threw = false;
  let detectedType: string | undefined;
  try {
    const ref = await registry.register(fixture, "buffer", { filename });
    detectedType = ref.detectedType;
    await registry.ensureProcessed(ref.id);
  } catch {
    threw = true;
  } finally {
    logger.warn = originalWarn;
    await registry.clear();
  }
  assert(!threw, "registering and processing the fixture threw");
  assert(
    detectedType === "pptx",
    "the registry did not classify the fixture as a presentation",
  );
  const failure = warnings.find((line) =>
    line.includes("PPTX extraction failed"),
  );
  assert(
    failure !== undefined,
    "the lazy PowerPoint extraction path never ran",
  );
  assert(
    failure?.includes(filename) === true,
    "the PowerPoint failure warning omitted the file name",
  );
});

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();
