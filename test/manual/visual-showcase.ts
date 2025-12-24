#!/usr/bin/env node

/**
 * Visual Feature Showcase for Office Document Spinners
 * Demonstrates the emoji indicators for each file type
 */

import { showProcessingSpinner } from "../../src/cli/utils/spinner.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function showcaseFeatures() {
  console.log("\n" + "=".repeat(70));
  console.log("  OFFICE DOCUMENT PROGRESS INDICATORS - VISUAL SHOWCASE");
  console.log("=".repeat(70) + "\n");

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log("  FEATURE 1: File Type Emoji Indicators");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );

  console.log("Word Documents (DOCX) - 📄");
  let spinner = showProcessingSpinner("quarterly-report.docx");
  await delay(1500);
  spinner?.succeed("Processed successfully");
  await delay(800);

  console.log("\nPowerPoint Presentations (PPTX) - 📊");
  spinner = showProcessingSpinner("sales-presentation.pptx");
  await delay(1500);
  spinner?.succeed("Processed successfully");
  await delay(800);

  console.log("\nExcel Spreadsheets (XLSX) - 📈");
  spinner = showProcessingSpinner("financial-data.xlsx");
  await delay(1500);
  spinner?.succeed("Processed successfully");
  await delay(800);

  console.log(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log("  FEATURE 2: Filename Display");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );

  console.log("Short filename:");
  spinner = showProcessingSpinner("doc.docx");
  await delay(1500);
  spinner?.succeed("Short filename displayed correctly");
  await delay(500);

  console.log("\nLong filename:");
  spinner = showProcessingSpinner(
    "very-long-document-name-with-many-words-and-details-report.docx",
  );
  await delay(1500);
  spinner?.succeed("Long filename displayed correctly");
  await delay(500);

  console.log("\nPath with directory:");
  spinner = showProcessingSpinner(
    "/home/user/documents/projects/2024/report.docx",
  );
  await delay(1500);
  spinner?.succeed("Full path handled, showing only filename");
  await delay(500);

  console.log(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log("  FEATURE 3: Success and Failure States");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );

  console.log("Success state:");
  spinner = showProcessingSpinner("valid-document.docx");
  await delay(1500);
  spinner?.succeed("✅ Document processed successfully");
  await delay(500);

  console.log("\nFailure state:");
  spinner = showProcessingSpinner("corrupted-file.docx");
  await delay(1500);
  spinner?.fail("❌ Failed: Invalid file format");
  await delay(500);

  console.log("\nWarning state:");
  spinner = showProcessingSpinner("partial-document.docx");
  await delay(1500);
  spinner?.warn("⚠️ Warning: Some content could not be processed");
  await delay(800);

  console.log("\n" + "=".repeat(70));
  console.log("  VISUAL SHOWCASE COMPLETE");
  console.log("=".repeat(70) + "\n");

  console.log("📋 Features Demonstrated:");
  console.log("   ✓ File type emoji indicators (📄 📊 📈)");
  console.log("   ✓ Filename extraction and display");
  console.log("   ✓ Success messages (✅)");
  console.log("   ✓ Failure messages (❌)");
  console.log("   ✓ Warning messages (⚠️)");
  console.log("   ✓ Long filename handling");
  console.log("   ✓ Path extraction\n");
}

showcaseFeatures();
