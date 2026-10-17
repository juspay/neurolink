#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Office document processing (OFFICE-003 / OFFICE-005).
 *
 * Every test drives the public surface — `NeuroLink.generate()` / `stream()`
 * with a `.docx`, `.xlsx` or `.pptx` attached — and asserts on the body NeuroLink
 * actually sent upstream, captured by a loopback mock chat server. That makes
 * each assertion a statement about what the model receives, which is the only
 * thing a caller can observe, and needs no credentials and no network.
 *
 * WHY THE OUTBOUND BODY AND NOT THE REPLY. Office files are delivered as text
 * injected into the prompt before the provider is chosen, so the extraction is
 * provider-independent by construction and a live model's paraphrase would be
 * a weaker signal than the bytes on the wire. The one genuinely live
 * round-trip — an ordinary .docx answered by a real provider — is already
 * covered in `continuous-test-suite-office-security.ts` and is not duplicated.
 *
 * Run: npx tsx test/continuous-test-suite-office.ts
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { defineSuite, assert, tempDir, Skip } from "./helpers/harness.js";
import {
  STRUCTURED_DOCX,
  STRUCTURED_PPTX,
  hasPackage,
  makeEmptyDocx,
  makePptx,
  makePptxFromSlideXml,
  makePptxgenDeck,
  makeStructuredDocx,
  makeXlsx,
} from "./helpers/officeFixtures.js";
import {
  startMockChatServer,
  mockOpenAICredentials,
  type MockChatServer,
} from "./helpers/mockChatServer.js";
import { NeuroLink } from "../dist/index.js";
import { FileReferenceRegistry } from "../dist/files/index.js";
import { PptxProcessor } from "../dist/processors/document/PptxProcessor.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// The repo's tracked .mcp-config.json declares a `filesystem` server that every
// NeuroLink instance tries to start, waiting out the 60s MCP client timeout when
// it cannot. Nothing here goes through tools, and the stalls pushed this suite
// from under a second to over four minutes (and one case past its own budget).
process.env.NEUROLINK_SKIP_MCP = "true";

// Every case imports from dist/, so a stale build would test the old code.
assertDistFresh();

// Loopback mock server only: no upstream exists, so a hang can only be a
// defect here and must report as a failure rather than a skip.
const { test, runSuite } = defineSuite("Office document processing", {
  offline: true,
  perTestTimeoutMs: 60_000,
});

const dir = tempDir("neurolink-office-");
fs.mkdirSync(dir, { recursive: true });

/**
 * The extraction under test only happens if the extractor is installed.
 * mammoth and exceljs are optionalDependencies, and a missing one funnels into
 * the same generic placeholder a real failure produces — so an assertion about
 * markdown would simply not find it and fail for the wrong reason. Skip
 * loudly instead.
 */
async function requireExtractor(pkg: string): Promise<void> {
  if (!(await hasPackage(pkg))) {
    throw new Skip(`${pkg} is not installed — the file would never be parsed`);
  }
}

/** Write a fixture into the suite's temp dir and return its path. */
function writeFixture(name: string, bytes: Buffer): string {
  const target = path.join(dir, name);
  fs.writeFileSync(target, bytes);
  return target;
}

type SendResult = {
  /** The JSON request body NeuroLink sent upstream. */
  body: string;
  /** True once the server saw a request at all. */
  called: boolean;
};

/**
 * Attach `files` to a `generate()` call aimed at the mock server and return
 * the outbound body.
 *
 * `officeOptions` is forwarded verbatim so a test can exercise sheet
 * selection and format choice through the same public surface a caller uses.
 */
async function sendWithFiles(
  files: string[],
  officeOptions?: {
    sheetName?: string;
    formatStyle?: "raw" | "markdown" | "json" | "csv";
  },
): Promise<SendResult> {
  const server: MockChatServer = await startMockChatServer();
  try {
    await new NeuroLink().generate({
      input: { text: "Summarize the attachment.", files },
      provider: "openai",
      credentials: mockOpenAICredentials(server),
      officeOptions,
      maxTokens: 64,
      timeout: 30_000,
    });
    return {
      body: server.getLastRequestBody() ?? "",
      called: server.wasCalled(),
    };
  } finally {
    await server.close();
  }
}

/**
 * The prompt is embedded in a JSON body, so every newline arrives as the two
 * characters `\` and `n`. Decoding it back makes the assertions read as the
 * markdown a reader would recognise instead of an escaped blob.
 */
function promptText(body: string): string {
  const partText = (part: unknown): string => {
    if (typeof part === "string") {
      return part;
    }
    const text = (part as { text?: unknown } | null)?.text;
    return typeof text === "string" ? text : "";
  };
  try {
    const parsed: unknown = JSON.parse(body);
    const messages = (parsed as { messages?: Array<{ content?: unknown }> })
      .messages;
    if (Array.isArray(messages)) {
      return messages
        .map((m) =>
          // Content is a plain string for a text-only turn and an array of
          // parts once anything multimodal rides along; both must be read.
          Array.isArray(m.content)
            ? m.content.map(partText).join("\n")
            : partText(m.content),
        )
        .join("\n");
    }
  } catch {
    // Fall through: an unparsable body is still evidence, just unstructured.
  }
  return body;
}

// ---------------------------------------------------------------------------
// OFFICE-003 — DOCX markdown conversion and metadata
// ---------------------------------------------------------------------------

await test("DOCX headings reach the model as markdown headings — generate()", async () => {
  await requireExtractor("mammoth");
  const fixture = writeFixture("structured.docx", makeStructuredDocx());
  const { body, called } = await sendWithFiles([fixture]);
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes(`# ${STRUCTURED_DOCX.h1}`),
    "the H1 did not arrive as a level-1 markdown heading",
  );
  assert(
    prompt.includes(`## ${STRUCTURED_DOCX.h2}`),
    "the H2 did not arrive as a level-2 markdown heading",
  );
  assert(
    prompt.includes(`### ${STRUCTURED_DOCX.h3}`),
    "the H3 did not arrive as a level-3 markdown heading",
  );
});

await test("a DOCX table reaches the model as a markdown table — generate()", async () => {
  await requireExtractor("mammoth");
  const fixture = writeFixture("table.docx", makeStructuredDocx());
  const { body, called } = await sendWithFiles([fixture]);
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes(`| ${STRUCTURED_DOCX.tableHeader.join(" | ")} |`),
    "the table header row did not arrive as a markdown table row",
  );
  assert(
    prompt.includes("| --- | --- | --- |"),
    "the markdown table separator row is missing, so the table is not a table",
  );
  for (const row of STRUCTURED_DOCX.tableRows) {
    assert(
      prompt.includes(`| ${row.join(" | ")} |`),
      "a table body row did not arrive as a markdown table row",
    );
  }
});

await test("DOCX bullet and numbered lists reach the model as markdown lists — generate()", async () => {
  await requireExtractor("mammoth");
  const fixture = writeFixture("lists.docx", makeStructuredDocx());
  const { body, called } = await sendWithFiles([fixture]);
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  for (const bullet of STRUCTURED_DOCX.bullets) {
    assert(
      prompt.includes(`- ${bullet}`),
      "a bullet item did not arrive as an unordered markdown list item",
    );
  }
  STRUCTURED_DOCX.steps.forEach((step, index) => {
    assert(
      prompt.includes(`${index + 1}. ${step}`),
      "a numbered item did not arrive as an ordered markdown list item",
    );
  });
});

await test("DOCX document metrics reach the model — generate()", async () => {
  await requireExtractor("mammoth");
  const fixture = writeFixture("metrics.docx", makeStructuredDocx());
  const { body, called } = await sendWithFiles([fixture]);
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  const metrics =
    /Document: (\d+) words, (\d+) paragraphs, (\d+) characters/.exec(prompt);
  assert(
    metrics !== null,
    "the document metrics line is absent from the prompt",
  );
  const [, words, paragraphs, characters] = metrics as RegExpExecArray;
  assert(Number(words) > 0, "the reported word count is not a positive number");
  assert(
    Number(paragraphs) > 0,
    "the reported paragraph count is not a positive number",
  );
  assert(
    Number(characters) >= Number(words),
    "the reported character count is smaller than the word count",
  );
});

await test("DOCX table cells escape raw HTML and preserve backslash-pipe sequences — generate()", async () => {
  await requireExtractor("mammoth");
  const fixture = writeFixture(
    "escaped-cells.docx",
    makeStructuredDocx([
      [
        "<script>alert(1)</script><!--hidden-->",
        String.raw`left\|right`,
        "safe",
      ],
    ]),
  );
  const { body, called } = await sendWithFiles([fixture]);
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes("&lt;script&gt;alert(1)&lt;/script&gt;"),
    "raw HTML from a document cell was not encoded as literal text",
  );
  assert(
    !prompt.includes("<script>"),
    "raw HTML from a document cell survived into the markdown prompt",
  );
  assert(
    prompt.includes(String.raw`| left\\\|right |`),
    "a literal backslash before a pipe no longer survives as one table cell",
  );
});

await test("an empty DOCX does not fail the request — generate()", async () => {
  await requireExtractor("mammoth");
  const fixture = writeFixture("empty.docx", makeEmptyDocx());
  const { called } = await sendWithFiles([fixture]);
  assert(
    called,
    "an empty document stopped the request from being sent at all",
  );
});

// ---------------------------------------------------------------------------
// OFFICE-005 — XLSX sheet selection and output format
// ---------------------------------------------------------------------------

const SHEETS = {
  Summary: [
    ["Region", "Merchants", "Volume"],
    ["APAC", 128, 44200],
    ["EMEA", 96, 31800],
  ],
  Transactions: [
    ["TxnId", "Amount", "Status"],
    ["TXN-1001", 250.5, "captured"],
    ["TXN-1002", 99.99, "refunded"],
  ],
  Notes: [
    ["Author", "Comment"],
    ["ops", "Quarter closed cleanly"],
  ],
} as const;

async function writeWorkbook(name: string): Promise<string> {
  const bytes = await makeXlsx(
    Object.fromEntries(
      Object.entries(SHEETS).map(([sheet, rows]) => [
        sheet,
        rows.map((row) => [...row]),
      ]),
    ),
  );
  return writeFixture(name, bytes);
}

await test("every sheet of a workbook reaches the model by default — generate()", async () => {
  await requireExtractor("exceljs");
  const fixture = await writeWorkbook("all-sheets.xlsx");
  const { body, called } = await sendWithFiles([fixture]);
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  for (const sheet of Object.keys(SHEETS)) {
    assert(
      prompt.includes(`### Sheet: ${sheet}`),
      "a sheet is missing from the default all-sheets rendering",
    );
  }
});

await test("sheetName narrows the workbook to one sheet — generate()", async () => {
  await requireExtractor("exceljs");
  const fixture = await writeWorkbook("one-sheet.xlsx");
  const { body, called } = await sendWithFiles([fixture], {
    sheetName: "Transactions",
  });
  // Precondition: the absence assertions below are only meaningful once the
  // selected sheet is present, which proves the workbook was parsed and
  // rendered rather than skipped.
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes("### Sheet: Transactions"),
    "the selected sheet is absent, so this test cannot judge the others",
  );
  assert(
    !prompt.includes("### Sheet: Summary"),
    "an unselected sheet was still rendered into the prompt",
  );
  assert(
    !prompt.includes("### Sheet: Notes"),
    "an unselected sheet was still rendered into the prompt",
  );
});

await test("an unknown sheetName reports the available sheets — generate()", async () => {
  await requireExtractor("exceljs");
  const fixture = await writeWorkbook("missing-sheet.xlsx");
  const { body, called } = await sendWithFiles([fixture], {
    sheetName: "NoSuchSheet",
  });
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes("not found"),
    "the unknown sheet was not reported as missing",
  );
  for (const sheet of Object.keys(SHEETS)) {
    assert(
      prompt.includes(sheet),
      "the available sheet names were not listed alongside the miss",
    );
  }
  assert(
    !prompt.includes("### Sheet: Summary"),
    "an unknown sheet name silently fell back to rendering every sheet",
  );
});

await test("formatStyle markdown renders sheets as markdown tables — generate()", async () => {
  await requireExtractor("exceljs");
  const fixture = await writeWorkbook("markdown.xlsx");
  const { body, called } = await sendWithFiles([fixture], {
    sheetName: "Transactions",
    formatStyle: "markdown",
  });
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes("| TxnId | Amount | Status |"),
    "the sheet header did not arrive as a markdown table row",
  );
  assert(
    prompt.includes("| --- | --- | --- |"),
    "the markdown table separator row is missing, so the sheet is not a table",
  );
  assert(
    prompt.includes("| TXN-1001 | 250.5 | captured |"),
    "a sheet data row did not arrive as a markdown table row",
  );
});

await test("XLSX markdown preserves a literal backslash immediately before a pipe — generate()", async () => {
  await requireExtractor("exceljs");
  const bytes = await makeXlsx({
    Escapes: [["Value"], [String.raw`left\|right`]],
  });
  const fixture = writeFixture("escaped-pipe.xlsx", bytes);
  const { body, called } = await sendWithFiles([fixture], {
    formatStyle: "markdown",
  });
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes(String.raw`| left\\\|right |`),
    "the spreadsheet cell was split because its pipe was not fully escaped",
  );
});

await test("formatStyle csv renders sheets as comma-separated rows — generate()", async () => {
  await requireExtractor("exceljs");
  const fixture = await writeWorkbook("csv.xlsx");
  const { body, called } = await sendWithFiles([fixture], {
    sheetName: "Transactions",
    formatStyle: "csv",
  });
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes("TxnId,Amount,Status"),
    "the sheet header did not arrive as a comma-separated row",
  );
  assert(
    prompt.includes("TXN-1001,250.5,captured"),
    "a sheet data row did not arrive as a comma-separated row",
  );
});

await test("formatStyle json renders sheet rows as objects — generate()", async () => {
  await requireExtractor("exceljs");
  const fixture = await writeWorkbook("json.xlsx");
  const { body, called } = await sendWithFiles([fixture], {
    sheetName: "Transactions",
    formatStyle: "json",
  });
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes('"TxnId": "TXN-1001"'),
    "a row was not keyed by its header column in the JSON rendering",
  );
  assert(
    prompt.includes('"Status": "captured"'),
    "a row was not keyed by its header column in the JSON rendering",
  );
});

await test("formatStyle json deduplicates a repeated header instead of overwriting one column's value — generate()", async () => {
  await requireExtractor("exceljs");
  // Two columns literally named "Name" is a real-world spreadsheet mistake
  // (a copy-pasted header, a merged-and-split sheet), not a contrived input.
  // `Object.fromEntries(header.map((key, i) => [key, row[i]]))` collapses
  // both onto one JSON key, silently dropping the first column's value.
  const bytes = await makeXlsx({
    Duplicates: [
      ["Name", "Amount", "Name"],
      ["Alice", 100, "Bob"],
    ],
  });
  const fixture = writeFixture("dup-headers.xlsx", bytes);
  const { body, called } = await sendWithFiles([fixture], {
    formatStyle: "json",
  });
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes('"Name": "Alice"'),
    "the first duplicate-named column's value was overwritten instead of kept under its own key",
  );
  assert(
    prompt.includes('"Name_2": "Bob"'),
    "the second duplicate-named column was not disambiguated with a suffixed key",
  );
});

await test("formatStyle json keeps a data row's cells past the header's own width — generate()", async () => {
  await requireExtractor("exceljs");
  // A 2-cell header with a 3-cell data row is a normal ragged sheet (a value
  // landing in a column the header left blank, or a header truncated by a
  // merged cell) — row extraction sizes each row on its own last populated
  // cell, not a workbook-wide column count. "markdown"/"csv" already show
  // every cell of such a row; "json" zipped strictly to header.length and
  // silently dropped the extra one.
  const bytes = await makeXlsx({
    Ragged: [
      ["Name", "Amount"],
      ["Alice", 100, "note"],
    ],
  });
  const fixture = writeFixture("ragged.xlsx", bytes);
  const { body, called } = await sendWithFiles([fixture], {
    formatStyle: "json",
  });
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes('"Name": "Alice"'),
    "a value under a header-named column went missing from the ragged row",
  );
  assert(
    prompt.includes('"Amount": 100'),
    "a value under a header-named column went missing from the ragged row",
  );
  assert(
    prompt.includes('"Column 3": "note"'),
    "the data row's cell beyond the header's width was silently dropped from the JSON rendering",
  );
});

// ---------------------------------------------------------------------------
// OFFICE-017 — mixed input and the streaming surface
// ---------------------------------------------------------------------------

await test("a DOCX and an XLSX in one request both reach the model — generate()", async () => {
  await requireExtractor("mammoth");
  await requireExtractor("exceljs");
  const docxFixture = writeFixture("mixed.docx", makeStructuredDocx());
  const xlsxFixture = await writeWorkbook("mixed.xlsx");
  const { body, called } = await sendWithFiles([docxFixture, xlsxFixture]);
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  assert(
    prompt.includes(`# ${STRUCTURED_DOCX.h1}`),
    "the document half of a mixed request did not reach the model",
  );
  assert(
    prompt.includes("### Sheet: Summary"),
    "the spreadsheet half of a mixed request did not reach the model",
  );
});

await test("DOCX markdown reaches the model through stream() too", async () => {
  await requireExtractor("mammoth");
  const fixture = writeFixture("stream.docx", makeStructuredDocx());
  const server = await startMockChatServer();
  try {
    const result = await new NeuroLink().stream({
      input: { text: "Summarize the attachment.", files: [fixture] },
      provider: "openai",
      credentials: mockOpenAICredentials(server),
      maxTokens: 64,
      timeout: 30_000,
    });
    // Draining the stream is what forces the request to be issued.
    for await (const _chunk of result.stream) {
      void _chunk;
    }
    assert(
      server.wasCalled(),
      "the streaming request never reached the server, so nothing was sent",
    );
    const prompt = promptText(server.getLastRequestBody() ?? "");
    assert(
      prompt.includes(`# ${STRUCTURED_DOCX.h1}`),
      "the document did not arrive as markdown on the streaming path",
    );
  } finally {
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// PPTX — run text, tables, character references and speaker notes (#427)
// ---------------------------------------------------------------------------

/**
 * Markup that must never reach the model. The slide XML is DrawingML, so a
 * leaked fragment shows up as an `a:` tag; `<draft>` and `<plan>` in the
 * fixture are real text that decoded from `&lt;`, which is why this looks for
 * the `a:` namespace rather than any angle bracket.
 */
const LEAKED_DRAWINGML = /<\/?a:[A-Za-z]/;

await test("PPTX run text is decoded and no DrawingML markup reaches the model — generate()", async () => {
  const fixture = writeFixture("markup.pptx", makePptx());
  const { body, called } = await sendWithFiles([fixture]);
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  // Precondition for every absence check below: the deck was parsed at all.
  assert(
    prompt.includes("### Slide 1"),
    "the presentation was not extracted, so this test cannot judge the markup",
  );
  assert(
    prompt.includes(STRUCTURED_PPTX.title),
    "an `&amp;` in a title was not decoded to `&`",
  );
  assert(
    prompt.includes(STRUCTURED_PPTX.entityLine),
    "`&lt;`, `&amp;amp;` and numeric references were not decoded exactly once",
  );
  assert(
    !LEAKED_DRAWINGML.test(prompt),
    "DrawingML markup (table, tab-stop or arrowhead tags) leaked into the prompt",
  );
  assert(
    !prompt.includes("tailEnd") && !prompt.includes("algn="),
    "attributes of a tab stop or connector leaked into the prompt",
  );
});

await test("a PPTX table reaches the model as one line per row — generate()", async () => {
  const fixture = writeFixture("table.pptx", makePptx());
  const { body, called } = await sendWithFiles([fixture]);
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  for (const row of STRUCTURED_PPTX.tableRows) {
    assert(
      prompt.split("\n").includes(row),
      `a table row did not arrive as the single line "${row}"`,
    );
  }
});

await test("PPTX speaker notes follow their own slide — generate()", async () => {
  const fixture = writeFixture("notes.pptx", makePptx());
  const { body, called } = await sendWithFiles([fixture]);
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  const slide1Notes = `**Speaker notes:** ${STRUCTURED_PPTX.slide1Notes}`;
  const slide2Notes = `**Speaker notes:** ${STRUCTURED_PPTX.slide2Notes}`;
  const slide2Start = prompt.indexOf("### Slide 2");
  assert(slide2Start >= 0, "the second slide is missing from the prompt");
  const slide1At = prompt.indexOf(slide1Notes);
  const slide2At = prompt.indexOf(slide2Notes);
  assert(
    slide1At >= 0 && slide1At < slide2Start,
    "slide 1's notes (with `&amp;` and `&lt;` decoded) are missing or not under slide 1",
  );
  assert(
    slide2At > slide2Start,
    "slide 2's notes are missing or not under slide 2",
  );
});

await test("a PPTX reaches the model through stream() too", async () => {
  const fixture = writeFixture("stream.pptx", makePptx());
  const server = await startMockChatServer();
  try {
    const result = await new NeuroLink().stream({
      input: { text: "Summarize the attachment.", files: [fixture] },
      provider: "openai",
      credentials: mockOpenAICredentials(server),
      maxTokens: 64,
      timeout: 30_000,
    });
    for await (const _chunk of result.stream) {
      void _chunk;
    }
    assert(
      server.wasCalled(),
      "the streaming request never reached the server, so nothing was sent",
    );
    const prompt = promptText(server.getLastRequestBody() ?? "");
    assert(
      prompt.includes(STRUCTURED_PPTX.title) &&
        prompt.includes(STRUCTURED_PPTX.tableRows[1]) &&
        prompt.includes(STRUCTURED_PPTX.slide1Notes) &&
        !LEAKED_DRAWINGML.test(prompt),
      "the presentation did not arrive as clean text on the streaming path",
    );
  } finally {
    await server.close();
  }
});

await test("a PPTX written by pptxgenjs reaches the model as clean text — generate()", async () => {
  await requireExtractor("pptxgenjs");
  const fixture = writeFixture("pptxgenjs.pptx", await makePptxgenDeck());
  const { body, called } = await sendWithFiles([fixture]);
  assert(called, "the request never reached the server, so nothing was sent");
  const prompt = promptText(body);
  // The writer, not this suite, decided how the title, tab stop, table and
  // arrowhead are spelled, so this guards against a fixture that only the
  // extractor's author could have produced.
  assert(
    prompt.split("\n").includes("Revenue & Growth"),
    "the title written by pptxgenjs did not arrive decoded",
  );
  assert(
    prompt.split("\n").includes("Region | Volume") &&
      prompt.split("\n").includes("APAC | 44 < 200"),
    "a table written by pptxgenjs did not arrive as one line per row",
  );
  assert(
    prompt.includes("Mention the RTO improvement & Q3 <plan>."),
    "speaker notes written by pptxgenjs did not arrive decoded",
  );
  assert(
    !LEAKED_DRAWINGML.test(prompt),
    "DrawingML markup from a real PPTX writer leaked into the prompt",
  );
});

await test("a targeted slide read keeps the slide's speaker notes — FileReferenceRegistry", async () => {
  // Surface: the package's `./files` export, which backs the
  // `extract_file_content` tool. generate() cannot reach it: a .pptx is
  // processed eagerly there, and the registry's slide-range read only runs for
  // a registered file big enough to be kept on disk (over 10 KB).
  const registry = new FileReferenceRegistry({
    tempDir: tempDir("neurolink-pptx-slides-"),
  });
  try {
    const ref = await registry.register(
      makePptx({ padToBytes: 16 * 1024 }),
      "buffer",
      { filename: "deck.pptx" },
    );
    assert(
      ref.detectedType === "pptx",
      "the registry did not classify the deck as a presentation",
    );
    const slide2 = await registry.extractContent({
      file_id: ref.id,
      pages: [2],
    });
    assert(
      slide2.success && typeof slide2.text === "string",
      "the targeted read of slide 2 failed",
    );
    assert(
      slide2.text?.includes(STRUCTURED_PPTX.slide2Text) === true,
      "slide 2's text is missing from its targeted read",
    );
    assert(
      slide2.text?.includes(
        `**Speaker notes:** ${STRUCTURED_PPTX.slide2Notes}`,
      ) === true,
      "slide 2's speaker notes were dropped from its targeted read",
    );
    assert(
      slide2.text?.includes(STRUCTURED_PPTX.title) === false,
      "a targeted read of slide 2 also returned slide 1",
    );

    const slide1 = await registry.extractContent({
      file_id: ref.id,
      pages: [1],
    });
    assert(
      slide1.success && typeof slide1.text === "string",
      "the targeted read of slide 1 failed",
    );
    const lines = slide1.text?.split("\n") ?? [];
    assert(
      STRUCTURED_PPTX.tableRows.every((row) => lines.includes(row)),
      "a targeted read of slide 1 did not return the table as one line per row",
    );
    assert(
      slide1.text?.includes(
        `**Speaker notes:** ${STRUCTURED_PPTX.slide1Notes}`,
      ) === true,
      "slide 1's speaker notes (decoded) were dropped from its targeted read",
    );
    assert(
      !LEAKED_DRAWINGML.test(slide1.text ?? ""),
      "DrawingML markup leaked into a targeted slide read",
    );
  } finally {
    await registry.clear();
  }
});

/**
 * Slide XML made of one start tag repeated and never finished. A tokeniser
 * whose attribute or text pattern can run past the next `<` rescans the rest of
 * the slide from every start position, so cost grows with the square of the
 * input: 200 KB took several seconds with the unbounded patterns and a
 * millisecond with the bounded ones. The limit below is far above the bounded
 * cost and far below the quadratic one, so it separates the two without being
 * sensitive to a slow machine.
 */
const HOSTILE_SLIDE_BYTES = 200 * 1024;
const HOSTILE_SLIDE_LIMIT_MS = 1_000;

for (const unfinished of ["<a:t ", "<a:t>", "<a:p ", "<a:br "]) {
  await test(`a slide of unfinished ${unfinished.trim()} tags is read in bounded time — PptxProcessor`, async () => {
    const xml = unfinished.repeat(
      Math.ceil(HOSTILE_SLIDE_BYTES / unfinished.length),
    );
    const deck = makePptxFromSlideXml(xml);
    const started = performance.now();
    const text = await PptxProcessor.extractText(deck);
    const elapsedMs = performance.now() - started;
    assert(
      typeof text === "string" && text.startsWith("Presentation: 1 slide"),
      "the deck was not read at all, so the timing below says nothing",
    );
    assert(
      elapsedMs < HOSTILE_SLIDE_LIMIT_MS,
      `${xml.length} bytes of unfinished ${unfinished.trim()} took ${Math.round(elapsedMs)} ms, ` +
        `over the ${HOSTILE_SLIDE_LIMIT_MS} ms limit: the tokeniser is rescanning the slide`,
    );
  });
}

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();
