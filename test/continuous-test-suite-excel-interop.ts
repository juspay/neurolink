#!/usr/bin/env tsx
/**
 * Continuous Test Suite: ExcelProcessor CJS/ESM interop (no API).
 *
 * Regression guard for "ExcelJS.Workbook is not a constructor": exceljs is a
 * CommonJS module, and under Node ESM `await import("exceljs")` exposes the
 * `Workbook` constructor on the namespace's `default` export, not the namespace
 * itself. A bare `new ExcelJS.Workbook()` therefore throws and every .xlsx
 * upload is rejected with a generic "couldn't process this file" placeholder.
 * loadExcelJS() now normalises the interop; this proves a real .xlsx round-trips
 * through ExcelProcessor.processFile().
 *
 * Run: npx tsx test/continuous-test-suite-excel-interop.ts
 */

import { defineSuite, assertEqual } from "./helpers/harness.js";
import { excelProcessor } from "../src/lib/processors/document/ExcelProcessor.js";

const { test, runSuite } = defineSuite("Excel processor interop");

/** Build a minimal valid .xlsx in memory via exceljs (same CJS module). */
async function makeXlsx(): Promise<Buffer> {
  const mod = (await import("exceljs")) as unknown as {
    Workbook?: new () => unknown;
    default?: { Workbook: new () => unknown };
  };
  const Workbook = mod.Workbook ?? mod.default?.Workbook;
  if (!Workbook) {
    throw new Error("exceljs Workbook constructor unresolved in test harness");
  }
  const wb = new Workbook() as {
    addWorksheet: (n: string) => { addRow: (r: unknown[]) => void };
    xlsx: { writeBuffer: () => Promise<ArrayBuffer> };
  };
  const ws = wb.addWorksheet("Sheet1");
  ws.addRow(["quarter", "units"]);
  ws.addRow(["q1", 50]);
  ws.addRow(["q2", 60]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

await test("ExcelProcessor.processFile succeeds on a real .xlsx (interop fix)", async () => {
  const buffer = await makeXlsx();
  const result = await excelProcessor.processFile({
    id: "t.xlsx",
    name: "t.xlsx",
    mimetype:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: buffer.length,
    buffer,
  });
  assertEqual(
    result.success,
    true,
    `processFile must succeed (was: ${
      result.success ? "ok" : result.error?.technicalDetails
    })`,
  );
  assertEqual(
    (result.data?.worksheets?.length ?? 0) > 0,
    true,
    "extracts at least one worksheet",
  );
  assertEqual(
    (result.data?.totalRows ?? 0) >= 3,
    true,
    "reads the data rows (header + 2)",
  );
});

await runSuite();
