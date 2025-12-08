/**
 * DOCX Contract Analysis Examples for NeuroLink
 * Demonstrates contract document processing and analysis capabilities
 *
 * Run with: npx tsx examples/office-documents/contract-analysis.ts
 *
 * Prerequisites:
 * - Set up provider credentials (Google AI, OpenAI, Anthropic, or Vertex AI)
 * - Ensure DOCX files exist in examples/office-documents/data/ directory
 *
 * Note: If you encounter tool schema errors, you can disable tools:
 *   export NEUROLINK_DISABLE_TOOLS=true
 *   npx tsx examples/office-documents/contract-analysis.ts
 */

import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Provider configuration (change as needed)
const PROVIDER = "google-ai"; // or "openai", "anthropic", "vertex"

/**
 * Example 1: Basic Contract Analysis
 * Extracts key terms and parties from a contract document
 */
async function basicContractAnalysis() {
  console.log("=== Example 1: Basic Contract Analysis ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Analyze this contract and extract the following information:
1. Parties involved (names and roles)
2. Contract effective date and term
3. Key obligations of each party
4. Payment terms (if any)
5. Termination conditions

Format the response as a structured summary.`,
        officeFiles: ["./examples/office-documents/data/sample-contract.docx"],
      },
      provider: PROVIDER,
      maxTokens: 1500,
    });

    console.log("Contract Analysis Result:");
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
 * Example 2: Risk Assessment
 * Identifies potential risks and liabilities in a contract
 */
async function riskAssessment() {
  console.log("=== Example 2: Contract Risk Assessment ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Perform a risk assessment on this contract. Identify:

1. **Potential Liabilities**: Clauses that could expose parties to liability
2. **Ambiguous Language**: Vague or unclear terms that could lead to disputes
3. **Missing Protections**: Common protections that appear to be missing
4. **Unusual Clauses**: Terms that deviate from standard contract practices
5. **Compliance Concerns**: Potential regulatory or legal compliance issues

Rate each identified risk as: HIGH, MEDIUM, or LOW.
Provide recommendations for mitigation where applicable.`,
        officeFiles: ["./examples/office-documents/data/sample-contract.docx"],
      },
      provider: PROVIDER,
      maxTokens: 2000,
    });

    console.log("Risk Assessment Result:");
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
 * Example 3: Clause Extraction
 * Extracts specific types of clauses from the contract
 */
async function clauseExtraction() {
  console.log("=== Example 3: Clause Extraction ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Extract and summarize the following clauses from this contract (if present):

1. **Confidentiality/NDA Clause**: Terms related to confidential information
2. **Indemnification Clause**: Who indemnifies whom and for what
3. **Limitation of Liability**: Caps or limits on damages
4. **Intellectual Property**: IP ownership and usage rights
5. **Force Majeure**: Circumstances that excuse non-performance
6. **Dispute Resolution**: How disputes will be resolved (arbitration, litigation, etc.)
7. **Governing Law**: Which jurisdiction's laws apply

For each clause found, provide:
- A brief summary
- The section/paragraph reference (if identifiable)
- Any notable conditions or exceptions`,
        officeFiles: ["./examples/office-documents/data/sample-contract.docx"],
      },
      provider: PROVIDER,
      maxTokens: 2500,
    });

    console.log("Extracted Clauses:");
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
 * Example 4: Contract Summary
 * Generates an executive summary of the contract
 */
async function contractSummary() {
  console.log("=== Example 4: Executive Summary ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Generate an executive summary of this contract suitable for a busy executive. 
The summary should:

1. Be concise (max 300 words)
2. Highlight the most important terms
3. Call out any critical deadlines or obligations
4. Note any financial commitments
5. Flag items requiring immediate attention

Format as bullet points for easy scanning.`,
        officeFiles: ["./examples/office-documents/data/sample-contract.docx"],
      },
      provider: PROVIDER,
      maxTokens: 800,
    });

    console.log("Executive Summary:");
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
 * Example 5: Contract Comparison
 * Compares two contract versions (useful for amendments)
 */
async function contractComparison() {
  console.log("=== Example 5: Contract Comparison ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Compare these two contract versions and identify:

1. **Added Clauses**: New provisions in the second document
2. **Removed Clauses**: Provisions that were deleted
3. **Modified Terms**: Changes to existing provisions
4. **Financial Changes**: Any changes to monetary amounts, payment terms, or fees
5. **Timeline Changes**: Changes to dates, deadlines, or durations

Summarize the overall impact of the changes on the contractual relationship.`,
        officeFiles: [
          "./examples/office-documents/data/sample-contract.docx",
          "./examples/office-documents/data/amended-contract.docx",
        ],
      },
      provider: PROVIDER,
      maxTokens: 2000,
    });

    console.log("Comparison Result:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error(
      "Error in Example 5:",
      error instanceof Error ? error.message : error,
    );
    console.log(
      "Note: This example requires two DOCX files. Ensure both files exist.",
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 6: Streaming Contract Analysis
 * Uses streaming for faster response with large documents
 */
async function streamingAnalysis() {
  console.log("=== Example 6: Streaming Contract Analysis ===\n");

  try {
    const stream = await neurolink.stream({
      input: {
        text: `Provide a comprehensive analysis of this contract including:
- Full summary of all major provisions
- Timeline of all obligations and deadlines
- Complete list of all parties' responsibilities
- All financial terms and conditions`,
        officeFiles: ["./examples/office-documents/data/sample-contract.docx"],
      },
      provider: PROVIDER,
      maxTokens: 3000,
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
 * Example 7: Error Handling
 * Demonstrates proper error handling for unsupported providers
 */
async function errorHandlingExample() {
  console.log("=== Example 7: Error Handling ===\n");

  try {
    // This may fail if the provider doesn't support office documents
    const result = await neurolink.generate({
      input: {
        text: "Analyze this contract",
        officeFiles: ["./examples/office-documents/data/sample-contract.docx"],
      },
      provider: "ollama", // Local provider - may not support office docs
      maxTokens: 500,
    });

    console.log("Result:", result.content);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("not currently supported")
    ) {
      console.log("✓ Caught expected error: Provider does not support DOCX");
      console.log("\nError message:");
      console.log(error.message);
      console.log(
        "\n💡 Tip: Switch to a supported provider like 'google-ai', 'openai', 'anthropic', or 'vertex'",
      );
    } else {
      console.log(
        "Error (expected for demonstration):",
        error instanceof Error ? error.message : error,
      );
    }
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Main execution function
 * Runs all examples in sequence
 */
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(" NeuroLink DOCX Contract Analysis Examples");
  console.log(" Provider:", PROVIDER);
  console.log("=".repeat(60) + "\n");

  console.log("Note: Make sure you have set up provider credentials");
  console.log("and that DOCX files exist in examples/office-documents/data/\n");

  console.log("Running examples...\n");

  await basicContractAnalysis();
  await riskAssessment();
  await clauseExtraction();
  await contractSummary();
  await contractComparison();
  await streamingAnalysis();
  await errorHandlingExample();

  console.log("All examples completed!");
}

// Run examples
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
