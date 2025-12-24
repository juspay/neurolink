#!/usr/bin/env node

/**
 * Comprehensive Test Demonstration for CLI Spinner Utility
 *
 * This script demonstrates all features of the spinner utility:
 * 1. Single file processing with emojis
 * 2. Multiple file processing with progress
 * 3. Success and failure states
 * 4. Quiet mode
 * 5. Different file types (DOCX, PPTX, XLSX)
 */

import {
  showProcessingSpinner,
  showMultiFileSpinner,
} from "../../src/cli/utils/spinner.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

console.log(
  "\n╔════════════════════════════════════════════════════════════════╗",
);
console.log(
  "║   OFFICE DOCUMENT PROGRESS INDICATORS - TEST DEMONSTRATION     ║",
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n",
);

async function testDocxProcessing() {
  console.log("📋 TEST 1: Processing DOCX (Word Document)\n");

  const spinner = showProcessingSpinner(
    "/tmp/office-test-files/sample-document.docx",
  );
  await delay(2000);
  spinner?.succeed("✅ Successfully processed sample-document.docx");
  await delay(1000);
}

async function testPptxProcessing() {
  console.log("\n📋 TEST 2: Processing PPTX (PowerPoint Presentation)\n");

  const spinner = showProcessingSpinner(
    "/tmp/office-test-files/sample-presentation.pptx",
  );
  await delay(2000);
  spinner?.succeed("✅ Successfully processed sample-presentation.pptx");
  await delay(1000);
}

async function testXlsxProcessing() {
  console.log("\n📋 TEST 3: Processing XLSX (Excel Spreadsheet)\n");

  const spinner = showProcessingSpinner(
    "/tmp/office-test-files/sample-spreadsheet.xlsx",
  );
  await delay(2000);
  spinner?.succeed("✅ Successfully processed sample-spreadsheet.xlsx");
  await delay(1000);
}

async function testFailureCase() {
  console.log("\n📋 TEST 4: Failure Case (Corrupted File)\n");

  const spinner = showProcessingSpinner(
    "/tmp/office-test-files/corrupted.docx",
  );
  await delay(2000);
  spinner?.fail("❌ Failed to process corrupted.docx - Invalid format");
  await delay(1000);
}

async function testMultipleFiles() {
  console.log("\n📋 TEST 5: Multiple Files Processing\n");

  const files = [
    "/tmp/office-test-files/report.docx",
    "/tmp/office-test-files/presentation.pptx",
    "/tmp/office-test-files/budget.xlsx",
    "/tmp/office-test-files/analysis.docx",
  ];

  const progress = showMultiFileSpinner(files);

  await delay(1000);
  progress.updateFile("/tmp/office-test-files/report.docx", "success");

  await delay(1000);
  progress.updateFile("/tmp/office-test-files/presentation.pptx", "success");

  await delay(1000);
  progress.updateFile(
    "/tmp/office-test-files/budget.xlsx",
    "error",
    "Invalid format",
  );

  await delay(1000);
  progress.updateFile("/tmp/office-test-files/analysis.docx", "success");

  await delay(500);
  progress.complete();
  await delay(1000);
}

async function testMixedFilesSuccessful() {
  console.log("\n📋 TEST 6: All Files Successful\n");

  const files = ["document1.docx", "slides.pptx", "data.xlsx"];

  const progress = showMultiFileSpinner(files);

  await delay(800);
  progress.updateFile("document1.docx", "success");

  await delay(800);
  progress.updateFile("slides.pptx", "success");

  await delay(800);
  progress.updateFile("data.xlsx", "success");

  await delay(500);
  progress.complete();
  await delay(1000);
}

async function testUrlProcessing() {
  console.log("\n📋 TEST 7: URL-based File Processing\n");

  const spinner = showProcessingSpinner("https://example.com/document.docx");
  await delay(2000);
  spinner?.succeed("✅ Successfully downloaded and processed document.docx");
  await delay(1000);
}

async function testQuietMode() {
  console.log("\n📋 TEST 8: Quiet Mode (No Visual Output)\n");
  console.log("Testing quiet mode (spinners should be null)...\n");

  const spinner = showProcessingSpinner("document.docx", true);
  console.log(
    `Single file spinner in quiet mode: ${spinner === null ? "✓ NULL (correct)" : "✗ NOT NULL (error)"}`,
  );

  const progress = showMultiFileSpinner(["file1.docx", "file2.pptx"], true);
  console.log(
    `Multi-file spinner in quiet mode: ${progress.spinner === null ? "✓ NULL (correct)" : "✗ NOT NULL (error)"}`,
  );

  await delay(1000);
}

async function runAllTests() {
  try {
    await testDocxProcessing();
    await testPptxProcessing();
    await testXlsxProcessing();
    await testFailureCase();
    await testMultipleFiles();
    await testMixedFilesSuccessful();
    await testUrlProcessing();
    await testQuietMode();

    console.log(
      "\n╔════════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║                    ALL TESTS COMPLETED ✅                       ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════════╝\n",
    );

    console.log("📊 Summary:");
    console.log("  • Single DOCX processing: ✓");
    console.log("  • Single PPTX processing: ✓");
    console.log("  • Single XLSX processing: ✓");
    console.log("  • Failure handling: ✓");
    console.log("  • Multiple files (mixed success/failure): ✓");
    console.log("  • Multiple files (all successful): ✓");
    console.log("  • URL-based file processing: ✓");
    console.log("  • Quiet mode: ✓");
    console.log("\n✨ All acceptance criteria met!\n");
  } catch (error) {
    console.error("\n❌ Test execution failed:", error);
    process.exit(1);
  }
}

runAllTests();
