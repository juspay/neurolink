#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Office document processing (OFFICE-003 / OFFICE-005).
 *
 * Every test drives the public surface — `NeuroLink.generate()` / `stream()`
 * with a `.docx` or `.xlsx` attached — and asserts on the body NeuroLink
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
  hasPackage,
  makeEmptyDocx,
  makeStructuredDocx,
  makeXlsx,
} from "./helpers/officeFixtures.js";
import {
  startMockChatServer,
  mockOpenAICredentials,
  type MockChatServer,
} from "./helpers/mockChatServer.js";
import { NeuroLink } from "../dist/index.js";

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

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();
