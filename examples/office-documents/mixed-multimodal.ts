/**
 * Mixed Multimodal Office Documents Examples for NeuroLink
 * Demonstrates combined office document workflows (DOCX + PPTX + XLSX)
 *
 * Run with: npx tsx examples/office-documents/mixed-multimodal.ts
 *
 * Prerequisites:
 * - Set up provider credentials (Google AI, OpenAI, Anthropic, or Vertex AI)
 * - Ensure office files exist in examples/office-documents/data/ directory
 *
 * Note: If you encounter tool schema errors, you can disable tools:
 *   export NEUROLINK_DISABLE_TOOLS=true
 *   npx tsx examples/office-documents/mixed-multimodal.ts
 */

import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Provider configuration (change as needed)
const PROVIDER = "google-ai"; // or "openai", "anthropic", "vertex"

/**
 * Example 1: Contract + Spreadsheet Analysis
 * Cross-references contract terms with financial data
 */
async function contractSpreadsheetAnalysis() {
  console.log("=== Example 1: Contract + Spreadsheet Analysis ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Analyze the contract and spreadsheet together:

1. **Payment Verification**
   - Extract payment terms from the contract
   - Compare with actual payments in the spreadsheet
   - Identify any discrepancies or missing payments

2. **Obligation Compliance**
   - List contractual obligations with deadlines
   - Check spreadsheet for evidence of compliance
   - Flag any potential breaches

3. **Financial Summary**
   - Total contract value vs. actual spend from spreadsheet
   - Remaining obligations or payments
   - Variance analysis

Provide a reconciliation report.`,
        officeFiles: [
          "./examples/office-documents/data/sample-contract.docx",
          "./examples/office-documents/data/sales-data.xlsx",
        ],
      },
      provider: PROVIDER,
      maxTokens: 2500,
    });

    console.log("Contract + Spreadsheet Analysis:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error(
      "Error in Example 1:",
      error instanceof Error ? error.message : error,
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 2: Presentation + Spreadsheet Validation
 * Validates presentation claims against spreadsheet data
 */
async function presentationDataValidation() {
  console.log("=== Example 2: Presentation + Spreadsheet Validation ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Cross-reference the presentation with the spreadsheet data:

## Validation Report

### Data Accuracy Check
For each metric mentioned in the presentation:
1. Find the source data in the spreadsheet
2. Verify the value matches
3. Check if calculations are correct

### Discrepancies Found
| Presentation Claim | Spreadsheet Value | Difference | Notes |
|-------------------|-------------------|------------|-------|

### Verified Claims
✓ [List claims that match the data]

### Unverified Claims
? [List claims that couldn't be verified from the data]

### Data Not in Presentation
📊 [Important data from spreadsheet not mentioned in presentation]

### Recommendations
- Items to correct in the presentation
- Additional data points to include`,
        officeFiles: [
          "./examples/office-documents/data/quarterly-report.pptx",
          "./examples/office-documents/data/sales-data.xlsx",
        ],
      },
      provider: PROVIDER,
      maxTokens: 2500,
    });

    console.log("Validation Report:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error(
      "Error in Example 2:",
      error instanceof Error ? error.message : error,
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 3: Full Document Package Analysis
 * Analyzes all three document types together
 */
async function fullPackageAnalysis() {
  console.log("=== Example 3: Full Document Package Analysis ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Analyze this complete document package (contract, presentation, spreadsheet):

## Comprehensive Analysis

### Document Relationship Map
- How do these documents relate to each other?
- What is the business context they represent?

### Key Information Summary

**From Contract:**
- Main parties and obligations
- Financial terms
- Key dates and deadlines

**From Presentation:**
- Main message and goals
- Key metrics presented
- Action items proposed

**From Spreadsheet:**
- Actual performance data
- Financial figures
- Historical trends

### Cross-Document Insights
1. [Insight from combining multiple documents]
2. [Insight from combining multiple documents]
3. [Insight from combining multiple documents]

### Consistency Analysis
- Do the documents tell a consistent story?
- Any conflicting information?
- Areas where documents complement each other

### Executive Summary
(5-7 sentences summarizing the complete picture)`,
        officeFiles: [
          "./examples/office-documents/data/sample-contract.docx",
          "./examples/office-documents/data/quarterly-report.pptx",
          "./examples/office-documents/data/sales-data.xlsx",
        ],
      },
      provider: PROVIDER,
      maxTokens: 3000,
    });

    console.log("Full Package Analysis:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error(
      "Error in Example 3:",
      error instanceof Error ? error.message : error,
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 4: Due Diligence Report
 * Creates a due diligence report from multiple documents
 */
async function dueDiligenceReport() {
  console.log("=== Example 4: Due Diligence Report ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Generate a due diligence report based on these documents:

# DUE DILIGENCE REPORT

## 1. Overview
- Subject of due diligence
- Documents reviewed
- Date of analysis

## 2. Legal Analysis (from Contract)
- Contractual structure
- Rights and obligations
- Risk factors
- Compliance status

## 3. Business Analysis (from Presentation)
- Business model
- Market position
- Strategic direction
- Management claims

## 4. Financial Analysis (from Spreadsheet)
- Revenue and profitability
- Key financial metrics
- Historical performance
- Financial trends

## 5. Cross-Document Findings
- Consistencies between documents
- Discrepancies or concerns
- Information gaps

## 6. Risk Assessment
| Risk Area | Level | Description | Mitigation |
|-----------|-------|-------------|------------|

## 7. Recommendations
- Items requiring further investigation
- Conditions or concerns to address
- Overall assessment

## 8. Conclusion
(Final recommendation with rationale)`,
        officeFiles: [
          "./examples/office-documents/data/sample-contract.docx",
          "./examples/office-documents/data/quarterly-report.pptx",
          "./examples/office-documents/data/sales-data.xlsx",
        ],
      },
      provider: PROVIDER,
      maxTokens: 3500,
    });

    console.log("Due Diligence Report:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error(
      "Error in Example 4:",
      error instanceof Error ? error.message : error,
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 5: Office Documents + PDF + CSV
 * Combines office documents with other file types
 */
async function mixedFileTypesAnalysis() {
  console.log("=== Example 5: Office Documents + PDF + CSV ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Analyze all these documents together (office files, PDF, and CSV):

## Multi-Format Document Analysis

### Document Inventory
List all documents provided and their types.

### Content Summary by Document
Summarize key information from each document.

### Cross-Reference Analysis
- How do the different document formats relate?
- Any information overlap or contradictions?
- Unique information from each source

### Consolidated Findings
Merge insights from all documents into a unified report:
1. Main business context
2. Key metrics and data points
3. Important dates and deadlines
4. Action items and next steps

### Data Reconciliation
If there's numerical data across documents, check for consistency.`,
        officeFiles: [
          "./examples/office-documents/data/sample-contract.docx",
          "./examples/office-documents/data/sales-data.xlsx",
        ],
        pdfFiles: ["./examples/data/report.pdf"],
        csvFiles: ["./examples/data/sales.csv"],
      },
      provider: PROVIDER,
      maxTokens: 3000,
    });

    console.log("Mixed File Types Analysis:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error(
      "Error in Example 5:",
      error instanceof Error ? error.message : error,
    );
    console.log(
      "Note: This example requires files in multiple locations. Ensure all files exist.",
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 6: Streaming Multimodal Analysis
 * Uses streaming for faster response with multiple documents
 */
async function streamingMultimodalAnalysis() {
  console.log("=== Example 6: Streaming Multimodal Analysis ===\n");

  try {
    const stream = await neurolink.stream({
      input: {
        text: `Provide a comprehensive analysis of all documents:
- Complete summary of each document
- Cross-document relationships
- Key findings and insights
- Recommendations and action items`,
        officeFiles: [
          "./examples/office-documents/data/sample-contract.docx",
          "./examples/office-documents/data/quarterly-report.pptx",
          "./examples/office-documents/data/sales-data.xlsx",
        ],
      },
      provider: PROVIDER,
      maxTokens: 4000,
    });

    console.log("Streaming Analysis:");
    for await (const chunk of stream) {
      process.stdout.write(chunk.content);
    }
    console.log("\n\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error(
      "Error in Example 6:",
      error instanceof Error ? error.message : error,
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 7: Board Meeting Package
 * Prepares a board meeting summary from multiple documents
 */
async function boardMeetingPackage() {
  console.log("=== Example 7: Board Meeting Package ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Prepare a board meeting summary from these documents:

# BOARD MEETING BRIEF

## Agenda Overview
(Based on presentation structure)

## Key Metrics Dashboard
| Metric | Current | Previous | Trend |
|--------|---------|----------|-------|
(From spreadsheet data)

## Legal & Contractual Matters
(From contract document)
- Active agreements
- Upcoming renewals
- Compliance status

## Strategic Update
(From presentation)
- Key initiatives
- Progress updates
- Challenges and solutions

## Financial Summary
(From spreadsheet)
- Revenue performance
- Cost analysis
- Projections

## Items Requiring Board Decision
1. [Decision item from documents]
2. [Decision item from documents]

## Appendix: Supporting Data
- Reference to specific slides/sections for detailed review`,
        officeFiles: [
          "./examples/office-documents/data/sample-contract.docx",
          "./examples/office-documents/data/quarterly-report.pptx",
          "./examples/office-documents/data/sales-data.xlsx",
        ],
      },
      provider: PROVIDER,
      maxTokens: 2500,
    });

    console.log("Board Meeting Package:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error(
      "Error in Example 7:",
      error instanceof Error ? error.message : error,
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 8: Error Handling with Mixed Files
 * Demonstrates graceful handling of errors with multiple files
 */
async function errorHandlingExample() {
  console.log("=== Example 8: Error Handling with Mixed Files ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "Analyze all provided documents",
        officeFiles: [
          "./examples/office-documents/data/sample-contract.docx",
          "./examples/office-documents/data/missing-file.xlsx", // This file doesn't exist
        ],
      },
      provider: PROVIDER,
      maxTokens: 1000,
    });

    console.log("Result:", result.content);
  } catch (error) {
    console.log("✓ Caught expected error for missing file");
    console.log("\nError message:");
    console.log(error instanceof Error ? error.message : error);
    console.log("\n💡 Tips for handling file errors:");
    console.log("   - Verify all file paths before processing");
    console.log("   - Use try/catch for graceful error handling");
    console.log(
      "   - Consider processing files individually for better error isolation",
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Main execution function
 * Runs all examples in sequence
 */
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(" NeuroLink Mixed Multimodal Office Documents Examples");
  console.log(" Provider:", PROVIDER);
  console.log("=".repeat(60) + "\n");

  console.log("Note: Make sure you have set up provider credentials");
  console.log(
    "and that office files exist in examples/office-documents/data/\n",
  );

  console.log("Running examples...\n");

  await contractSpreadsheetAnalysis();
  await presentationDataValidation();
  await fullPackageAnalysis();
  await dueDiligenceReport();
  await mixedFileTypesAnalysis();
  await streamingMultimodalAnalysis();
  await boardMeetingPackage();
  await errorHandlingExample();

  console.log("All examples completed!");
}

// Run examples
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
