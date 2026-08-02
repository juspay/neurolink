#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Office document support (no API).
 *
 * Covers OFFICE-015 (#485), OFFICE-016 (#487), OFFICE-017 (#493) and
 * OFFICE-019 (#499). Word and Excel processing shipped with only a narrow
 * interop regression guard (continuous-test-suite-excel-interop.ts) and nothing
 * for .docx at all, so this is the first coverage of extraction, sheet
 * handling, detection and the error paths.
 *
 * Fixtures are built in memory (see helpers/officeFixtures.ts). exceljs and
 * mammoth are optionalDependencies, so tests SKIP when they are absent —
 * mirroring how the processors themselves behave.
 *
 * Run: npx tsx test/continuous-test-suite-office.ts
 */

import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
  Skip,
} from "./helpers/harness.js";
import { hasPackage, makeDocx, makeXlsx } from "./helpers/officeFixtures.js";
import {
  wordProcessor,
  isWordFile,
} from "../src/lib/processors/document/WordProcessor.js";
import {
  excelProcessor,
  isExcelFile,
} from "../src/lib/processors/document/ExcelProcessor.js";

const { test, runSuite } = defineSuite("Office document support");

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function requireMammoth(): Promise<void> {
  if (!(await hasPackage("mammoth"))) {
    throw new Skip("mammoth not installed (optional dependency)");
  }
}
async function requireExcel(): Promise<void> {
  if (!(await hasPackage("exceljs"))) {
    throw new Skip("exceljs not installed (optional dependency)");
  }
}

function info(name: string, mimetype: string, buffer: Buffer) {
  return { id: `office-${name}`, name, mimetype, size: buffer.length, buffer };
}

// --- Detection ---------------------------------------------------------------

await test("isWordFile / isExcelFile accept their own formats", () => {
  assert(isWordFile(DOCX_MIME, "report.docx"), "docx recognised");
  assert(isWordFile("application/msword", "legacy.doc"), "doc recognised");
  assert(isExcelFile(XLSX_MIME, "book.xlsx"), "xlsx recognised");
  assert(isExcelFile("application/vnd.ms-excel", "old.xls"), "xls recognised");
});

await test("the two processors do not claim each other's formats", () => {
  // A shared "office" bucket would route a spreadsheet into mammoth, which
  // fails deep inside the parser rather than at the boundary.
  assertEqual(isWordFile(XLSX_MIME, "book.xlsx"), false, "word rejects xlsx");
  assertEqual(
    isExcelFile(DOCX_MIME, "report.docx"),
    false,
    "excel rejects docx",
  );
});

// --- OFFICE-016 (#487): DOCX extraction --------------------------------------

await test("extracts text from a real .docx", async () => {
  await requireMammoth();
  const buf = makeDocx([
    "Quarterly Review",
    "Revenue grew 12% year over year.",
  ]);
  const result = await wordProcessor.processFile(
    info("report.docx", DOCX_MIME, buf),
  );
  assert(result.success, `docx processing failed: ${JSON.stringify(result)}`);
  if (!result.success) {
    return;
  }
  assertIncludes(
    result.data.textContent,
    "Quarterly Review",
    "first paragraph is extracted",
  );
  assertIncludes(
    result.data.textContent,
    "Revenue grew 12%",
    "second paragraph is extracted",
  );
});

await test("produces HTML alongside plain text", async () => {
  await requireMammoth();
  const buf = makeDocx(["Heading text"]);
  const result = await wordProcessor.processFile(
    info("report.docx", DOCX_MIME, buf),
  );
  assert(result.success, "docx processing succeeds");
  if (!result.success) {
    return;
  }
  assertIncludes(
    result.data.htmlContent,
    "<p>",
    "HTML conversion emits paragraph markup",
  );
});

// --- OFFICE-016 (#487): XLSX sheets ------------------------------------------

await test("reads every worksheet, not just the first", async () => {
  await requireExcel();
  const buf = await makeXlsx({
    Revenue: [
      ["quarter", "amount"],
      ["q1", 100],
    ],
    Costs: [
      ["quarter", "amount"],
      ["q1", 60],
    ],
  });
  const result = await excelProcessor.processFile(
    info("book.xlsx", XLSX_MIME, buf),
  );
  assert(result.success, `xlsx processing failed: ${JSON.stringify(result)}`);
  if (!result.success) {
    return;
  }
  assertEqual(result.data.sheetCount, 2, "both worksheets are read");
  const names = result.data.worksheets.map((w) => w.name);
  assert(
    names.includes("Revenue") && names.includes("Costs"),
    `worksheet names preserved, got ${JSON.stringify(names)}`,
  );
});

await test("counts data rows across sheets", async () => {
  await requireExcel();
  const buf = await makeXlsx({
    Sheet1: [
      ["a", "b"],
      [1, 2],
      [3, 4],
    ],
  });
  const result = await excelProcessor.processFile(
    info("book.xlsx", XLSX_MIME, buf),
  );
  assert(result.success, "xlsx processing succeeds");
  if (!result.success) {
    return;
  }
  assert(
    result.data.totalRows >= 3,
    `expected at least the 3 authored rows, got ${result.data.totalRows}`,
  );
});

// --- OFFICE-019 (#499): error handling ---------------------------------------

await test("a non-ZIP payload is rejected before reaching the parser", async () => {
  await requireMammoth();
  // .docx and .xlsx are ZIP archives; the PK signature check is the cheap
  // boundary that keeps an HTML error page or truncated download from being
  // handed to a parser that will fail obscurely.
  const notZip = Buffer.from("<!DOCTYPE html><html>error page</html>", "utf8");
  const result = await wordProcessor.processFile(
    info("report.docx", DOCX_MIME, notZip),
  );
  assertEqual(result.success, false, "non-ZIP content is rejected");
});

await test("an HTML error page masquerading as .xlsx is rejected", async () => {
  await requireExcel();
  const notZip = Buffer.from("<html><body>404 Not Found</body></html>", "utf8");
  const result = await excelProcessor.processFile(
    info("book.xlsx", XLSX_MIME, notZip),
  );
  assertEqual(result.success, false, "non-ZIP content is rejected");
});

await test("a truncated file is rejected rather than half-parsed", async () => {
  await requireExcel();
  const full = await makeXlsx({ Sheet1: [["a"], [1]] });
  const truncated = full.subarray(0, Math.floor(full.length / 3));
  const result = await excelProcessor.processFile(
    info("book.xlsx", XLSX_MIME, truncated),
  );
  assertEqual(result.success, false, "a truncated archive is rejected");
});

await test("an empty buffer is rejected", async () => {
  const result = await wordProcessor.processFile(
    info("report.docx", DOCX_MIME, Buffer.alloc(0)),
  );
  assertEqual(result.success, false, "zero-byte docx is rejected");
});

await runSuite();
