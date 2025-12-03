/**
 * PDF Analysis Examples for NeuroLink
 * Demonstrates various PDF processing capabilities
 *
 * Run with: npx tsx examples/pdf-analysis.ts
 *
 * Prerequisites:
 * - Set up provider credentials (Vertex AI, Anthropic, Bedrock, or AI Studio)
 * - Ensure PDF files exist in examples/data/ directory
 *
 * Note: If you encounter tool schema errors, you can disable tools:
 *   export NEUROLINK_DISABLE_TOOLS=true
 *   npx tsx examples/pdf-analysis.ts
 */

import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Provider configuration (change as needed)
const PROVIDER = "vertex"; // or "anthropic", "bedrock", "google-ai-studio"

/**
 * Example 1: Basic PDF Analysis
 * Analyzes a single PDF file for key information
 */
async function basicPDFAnalysis() {
  console.log("=== Example 1: Basic PDF Analysis ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "What is the total revenue mentioned in this invoice? Provide the exact amount.",
        pdfFiles: ["./examples/data/invoice.pdf"],
      },
      provider: PROVIDER,
      maxTokens: 500,
    });

    console.log("Analysis Result:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 1:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 2: Multiple PDF Comparison
 * Compares data across two PDF files
 */
async function comparePDFs() {
  console.log("=== Example 2: Compare Two PDF Reports ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "Compare the revenue figures between these two reports. Which document shows higher revenue? What's the percentage difference?",
        pdfFiles: ["./examples/data/invoice.pdf", "./examples/data/report.pdf"],
      },
      provider: PROVIDER,
      maxTokens: 800,
    });

    console.log("Comparison Result:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 2:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 3: Auto-Detection with Mixed File Types
 * Uses the `files` array for automatic file type detection
 * Combines PDF with CSV for comprehensive analysis
 */
async function autoDetectMixedFiles() {
  console.log("=== Example 3: Auto-Detection (PDF + CSV) ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "Compare the revenue mentioned in the PDF report with the transaction data in the CSV file. Are they consistent?",
        files: [
          "./examples/data/invoice.pdf", // Auto-detects as PDF
          "./examples/data/sales.csv", // Auto-detects as CSV
        ],
      },
      provider: PROVIDER,
      maxTokens: 1000,
    });

    console.log("Auto-Detection Result:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 3:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 4: Streaming PDF Analysis
 * Uses streaming for faster results with large documents
 */
async function streamingPDFAnalysis() {
  console.log("=== Example 4: Streaming PDF Analysis ===\n");

  try {
    const stream = await neurolink.stream({
      input: {
        text: "Provide a detailed summary of this report, including all key metrics and trends mentioned.",
        pdfFiles: ["./examples/data/report.pdf"],
      },
      provider: PROVIDER,
      maxTokens: 2000,
    });

    console.log("Streaming Result:");
    for await (const chunk of stream) {
      process.stdout.write(chunk.content);
    }
    console.log("\n\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 4:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 5: Information Extraction
 * Extracts specific structured data from PDFs
 */
async function extractStructuredData() {
  console.log("=== Example 5: Extract Structured Data ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Extract the following information from this invoice and format as JSON:
        - Invoice number
        - Date
        - Total amount
        - Vendor/Company name
        - Any line items with their prices`,
        pdfFiles: ["./examples/data/invoice.pdf"],
      },
      provider: PROVIDER,
      maxTokens: 1000,
    });

    console.log("Extracted Data:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 5:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 6: Error Handling
 * Demonstrates proper error handling for unsupported providers
 */
async function errorHandlingExample() {
  console.log("=== Example 6: Error Handling ===\n");

  try {
    // This will fail if using an unsupported provider
    const result = await neurolink.generate({
      input: {
        text: "Analyze this PDF",
        pdfFiles: ["./examples/data/invoice.pdf"],
      },
      provider: "azure-openai", // Not supported for PDF
      maxTokens: 500,
    });

    console.log("Result:", result.content);
  } catch (error) {
    if (error.message.includes("not currently supported")) {
      console.log("✓ Caught expected error: PDF not supported by Azure OpenAI");
      console.log("\nError message:");
      console.log(error.message);
      console.log(
        "\n💡 Tip: Switch to a supported provider like 'openai', 'vertex', 'anthropic', or 'bedrock'",
      );
    } else {
      console.error("Unexpected error:", error.message);
    }
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 7: Large PDF Optimization
 * Best practices for handling large PDF files
 */
async function largePDFOptimization() {
  console.log("=== Example 7: Large PDF Optimization ===\n");

  try {
    console.log("Tip for large PDFs:");
    console.log("- Use 'google-ai-studio' provider for files up to 2GB");
    console.log("- Use streaming for faster initial results");
    console.log(
      "- Set appropriate maxTokens (2000-8000 for comprehensive analysis)",
    );
    console.log("- Be specific in prompts to reduce response size\n");

    const result = await neurolink.generate({
      input: {
        text: "Extract only the executive summary and key financial metrics from this report.",
        pdfFiles: ["./examples/data/report.pdf"],
      },
      provider: PROVIDER,
      maxTokens: 1500,
    });

    console.log("Optimized Analysis:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 7:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Main execution function
 * Runs all examples in sequence
 */
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(" NeuroLink PDF Analysis Examples");
  console.log(" Provider:", PROVIDER);
  console.log("=".repeat(60) + "\n");

  console.log("Note: Make sure you have set up provider credentials");
  console.log("and that PDF files exist in examples/data/\n");

  console.log("Running examples...\n");

  await basicPDFAnalysis();
  await comparePDFs();
  await autoDetectMixedFiles();
  await streamingPDFAnalysis();
  await extractStructuredData();
  await errorHandlingExample();
  await largePDFOptimization();

  console.log("All examples completed!");
}

// Run examples
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
