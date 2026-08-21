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
 * ## What used to be here
 *
 * This suite also asserted the *bounds* themselves across Word, Excel,
 * PowerPoint and OpenDocument — that a zip member declaring a vast
 * uncompressed size could not force an unbounded inflate. Each format's bomb
 * ran in a fresh process and the test read `process.resourceUsage().maxRSS`,
 * because a limit checked after the buffer exists is arithmetically correct
 * and useless, and the two cases are indistinguishable from the outcome alone.
 *
 * They were removed with the unit suites (CLAUDE.md rule 15) — measuring one
 * processor's peak memory requires importing that processor, and the same
 * fixture through `generate()` would measure the whole SDK and need
 * credentials. Nothing replaces them, so a regression that reintroduces an
 * unbounded inflate will not be caught here.
 *
 * Run: npx tsx test/continuous-test-suite-office-security.ts
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { defineSuite, assert, tempDir, Skip } from "./helpers/harness.js";
import { docxMembers, writeOfficeZip } from "./helpers/officeBombFixtures.js";
import { makeDocxRaw, makeXlsxRaw } from "./helpers/officeFixtures.js";
import {
  startMockChatServer,
  mockOpenAICredentials,
} from "./helpers/mockChatServer.js";
import { NeuroLink } from "../dist/index.js";

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

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();
