/**
 * CSV Analysis Examples for NeuroLink
 * Demonstrates various CSV processing capabilities
 *
 * Run with: npx tsx examples/csv-analysis.ts
 *
 * Note: If you encounter tool schema errors, you can disable tools:
 *   export NEUROLINK_DISABLE_TOOLS=true
 *   npx tsx examples/csv-analysis.ts
 */

import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

/**
 * Example 1: Basic CSV Analysis
 * Analyzes a single CSV file for insights
 */
async function basicCSVAnalysis() {
  console.log("=== Example 1: Basic CSV Analysis ===\n");

  const result = await neurolink.generate({
    input: {
      text: "What are the top 3 products by revenue? Summarize the findings.",
      csvFiles: ["./examples/data/sales.csv"],
    },
    maxTokens: 500,
  });

  console.log("Analysis Result:");
  console.log(result.content);
  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Example 2: Multiple CSV Comparison
 * Compares data across two CSV files
 */
async function compareQuarters() {
  console.log("=== Example 2: Compare Q1 vs Q2 Sales ===\n");

  const result = await neurolink.generate({
    input: {
      text: "Compare Q1 vs Q2 sales performance. Which quarter had higher revenue? What's the growth percentage?",
      csvFiles: [
        "./examples/data/q1_sales.csv",
        "./examples/data/q2_sales.csv",
      ],
    },
    maxTokens: 500,
  });

  console.log("Comparison Result:");
  console.log(result.content);
  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Example 3: Auto-Detection with Mixed File Types
 * Uses the `files` array for automatic file type detection
 */
async function autoDetectFiles() {
  console.log("=== Example 3: Auto-Detection (CSV Only) ===\n");

  const result = await neurolink.generate({
    input: {
      text: "Analyze the sales data. What insights can you provide?",
      files: ["./examples/data/sales.csv"], // Auto-detects as CSV
    },
    maxTokens: 500,
  });

  console.log("Auto-Detection Result:");
  console.log(result.content);
  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Example 4: Custom CSV Options
 * Demonstrates custom CSV processing options
 */
async function customCSVProcessing() {
  console.log("=== Example 4: Custom CSV Options ===\n");

  const result = await neurolink.generate({
    input: {
      text: "Summarize key insights from this sales data. Focus on revenue trends.",
      csvFiles: ["./examples/data/sales.csv"],
    },
    csvOptions: {
      maxRows: 5, // Only process first 5 rows
      formatStyle: "markdown", // Use markdown table format
      includeHeaders: true, // Include column headers
    },
    maxTokens: 500,
  });

  console.log("Custom Processing Result:");
  console.log(result.content);
  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Main function - runs all examples sequentially
 */
async function main() {
  console.log("\n🚀 NeuroLink CSV Analysis Examples\n");
  console.log("This demonstrates CSV file processing with NeuroLink SDK\n");
  console.log("=".repeat(60) + "\n");

  try {
    // Run Example 1
    await basicCSVAnalysis();

    // Run Example 2
    await compareQuarters();

    // Run Example 3
    await autoDetectFiles();

    // Run Example 4
    await customCSVProcessing();

    console.log("✅ All examples completed successfully!\n");
  } catch (error) {
    console.error("❌ Error running examples:");
    console.error(error);
    process.exit(1);
  }
}

// Run all examples
main().catch(console.error);
