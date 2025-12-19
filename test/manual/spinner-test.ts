/**
 * Manual test script for CLI spinner utility
 * Run this script to visually verify spinner functionality
 *
 * Usage: npx tsx test/manual/spinner-test.ts
 */

import {
  showProcessingSpinner,
  showMultiFileSpinner,
} from "../../src/cli/utils/spinner.js";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testSingleFileSpinner() {
  console.log("\n=== Testing Single File Spinners ===\n");

  // Test DOCX
  const docxSpinner = showProcessingSpinner("document.docx");
  await delay(2000);
  docxSpinner?.succeed("Processed document.docx successfully");

  await delay(500);

  // Test PPTX
  const pptxSpinner = showProcessingSpinner("presentation.pptx");
  await delay(2000);
  pptxSpinner?.succeed("Processed presentation.pptx successfully");

  await delay(500);

  // Test XLSX
  const xlsxSpinner = showProcessingSpinner("spreadsheet.xlsx");
  await delay(2000);
  xlsxSpinner?.succeed("Processed spreadsheet.xlsx successfully");

  await delay(500);

  // Test failure case
  const failSpinner = showProcessingSpinner("corrupt.docx");
  await delay(2000);
  failSpinner?.fail("Failed to process corrupt.docx");
}

async function testMultiFileSpinner() {
  console.log("\n=== Testing Multi-File Spinner ===\n");

  const files = [
    "report.docx",
    "presentation.pptx",
    "budget.xlsx",
    "analysis.docx",
  ];

  const progress = showMultiFileSpinner(files);

  await delay(1000);
  progress.updateFile("report.docx", "success");

  await delay(1000);
  progress.updateFile("presentation.pptx", "success");

  await delay(1000);
  progress.updateFile("budget.xlsx", "error", "Invalid format");

  await delay(1000);
  progress.updateFile("analysis.docx", "success");

  await delay(500);
  progress.complete();
}

async function testQuietMode() {
  console.log("\n=== Testing Quiet Mode ===\n");
  console.log("(No spinners should appear below)");

  const spinner = showProcessingSpinner("document.docx", true);
  console.log(
    "Quiet mode spinner:",
    spinner === null ? "✓ Correctly null" : "✗ Should be null",
  );

  const progress = showMultiFileSpinner(["file1.docx", "file2.pptx"], true);
  console.log(
    "Quiet mode progress:",
    progress.spinner === null ? "✓ Correctly null" : "✗ Should be null",
  );
}

async function main() {
  console.log("==================================");
  console.log("CLI Spinner Manual Test");
  console.log("==================================");

  await testSingleFileSpinner();
  await delay(1000);

  await testMultiFileSpinner();
  await delay(1000);

  await testQuietMode();

  console.log("\n==================================");
  console.log("Manual Test Complete!");
  console.log("==================================\n");
}

main().catch(console.error);
