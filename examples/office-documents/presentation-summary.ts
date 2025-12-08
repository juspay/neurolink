/**
 * PPTX Presentation Summary Examples for NeuroLink
 * Demonstrates PowerPoint presentation processing and summarization
 *
 * Run with: npx tsx examples/office-documents/presentation-summary.ts
 *
 * Prerequisites:
 * - Set up provider credentials (Google AI, OpenAI, Anthropic, or Vertex AI)
 * - Ensure PPTX files exist in examples/office-documents/data/ directory
 *
 * Note: If you encounter tool schema errors, you can disable tools:
 *   export NEUROLINK_DISABLE_TOOLS=true
 *   npx tsx examples/office-documents/presentation-summary.ts
 */

import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Provider configuration (change as needed)
const PROVIDER = "google-ai"; // or "openai", "anthropic", "vertex"

/**
 * Example 1: Basic Presentation Summary
 * Generates a high-level summary of the presentation
 */
async function basicPresentationSummary() {
  console.log("=== Example 1: Basic Presentation Summary ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Summarize this presentation. Include:
1. Main topic and purpose
2. Key points from each slide
3. Overall message and takeaways
4. Any calls to action or next steps

Format as a structured summary.`,
        officeFiles: ["./examples/office-documents/data/quarterly-report.pptx"],
      },
      provider: PROVIDER,
      maxTokens: 1500,
    });

    console.log("Presentation Summary:");
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
 * Example 2: Slide-by-Slide Analysis
 * Provides detailed analysis of each slide
 */
async function slideBySlideAnalysis() {
  console.log("=== Example 2: Slide-by-Slide Analysis ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Analyze this presentation slide by slide. For each slide, provide:

**Slide Title**: (if visible)
**Content Type**: (text, chart, image, table, etc.)
**Key Message**: What is the main point of this slide?
**Data/Metrics**: Any numbers, statistics, or data points shown
**Visual Elements**: Description of charts, graphs, or images

After all slides, provide a brief overall assessment of the presentation structure and flow.`,
        officeFiles: ["./examples/office-documents/data/quarterly-report.pptx"],
      },
      provider: PROVIDER,
      maxTokens: 3000,
    });

    console.log("Slide Analysis:");
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
 * Example 3: Meeting Notes Generator
 * Converts presentation into meeting notes format
 */
async function meetingNotesGenerator() {
  console.log("=== Example 3: Meeting Notes Generator ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Convert this presentation into meeting notes format:

## Meeting Notes

**Date**: [Today's date]
**Topic**: [Extract from presentation]
**Presenter**: [If identifiable]

### Key Discussion Points
- [Bullet points of main topics covered]

### Decisions Made
- [Any decisions or conclusions from the presentation]

### Action Items
- [ ] [Action item 1]
- [ ] [Action item 2]
(Extract any action items or next steps from the presentation)

### Data Highlights
- [Key metrics, statistics, or data points presented]

### Follow-up Required
- [Items that need further discussion or clarification]`,
        officeFiles: ["./examples/office-documents/data/quarterly-report.pptx"],
      },
      provider: PROVIDER,
      maxTokens: 2000,
    });

    console.log("Meeting Notes:");
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
 * Example 4: Key Insights Extraction
 * Extracts the most important insights and data points
 */
async function keyInsightsExtraction() {
  console.log("=== Example 4: Key Insights Extraction ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Extract the top 5-10 most important insights from this presentation.

For each insight:
1. **Insight**: Clear statement of the finding
2. **Supporting Data**: Numbers or evidence that support this insight
3. **Business Impact**: Why this matters for the business
4. **Slide Reference**: Which slide this insight comes from (if identifiable)

Rank insights by importance to business decision-making.`,
        officeFiles: ["./examples/office-documents/data/quarterly-report.pptx"],
      },
      provider: PROVIDER,
      maxTokens: 1500,
    });

    console.log("Key Insights:");
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
 * Example 5: Q&A Preparation
 * Generates potential Q&A for the presentation
 */
async function qaPreparation() {
  console.log("=== Example 5: Q&A Preparation ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Based on this presentation, generate a Q&A preparation guide:

## Likely Questions from the Audience

### Strategic Questions
1. [Question about strategy or direction]
   - **Suggested Answer**: [Brief answer based on presentation content]

### Data/Metrics Questions
1. [Question about specific data points]
   - **Suggested Answer**: [Reference to relevant data in presentation]

### Implementation Questions
1. [Question about how things will be executed]
   - **Suggested Answer**: [Based on action items or plans mentioned]

### Clarification Questions
1. [Question about unclear or complex points]
   - **Suggested Answer**: [Clarification based on context]

### Potential Challenges/Pushback
1. [Skeptical question or concern]
   - **How to Address**: [Strategy for handling this concern]

Generate at least 2-3 questions per category.`,
        officeFiles: ["./examples/office-documents/data/quarterly-report.pptx"],
      },
      provider: PROVIDER,
      maxTokens: 2500,
    });

    console.log("Q&A Preparation Guide:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error(
      "Error in Example 5:",
      error instanceof Error ? error.message : error,
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 6: Streaming Presentation Analysis
 * Uses streaming for faster response with large presentations
 */
async function streamingPresentationAnalysis() {
  console.log("=== Example 6: Streaming Presentation Analysis ===\n");

  try {
    const stream = await neurolink.stream({
      input: {
        text: `Provide a comprehensive analysis of this presentation including:
- Complete content summary
- All data and metrics mentioned
- Visual element descriptions
- Recommendations for improvement
- Assessment of overall effectiveness`,
        officeFiles: ["./examples/office-documents/data/quarterly-report.pptx"],
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
 * Example 7: Presentation Comparison
 * Compares two presentations (e.g., Q1 vs Q2 reports)
 */
async function presentationComparison() {
  console.log("=== Example 7: Presentation Comparison ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Compare these two presentations and analyze:

1. **Topic Coverage**: What topics are covered in each?
2. **Data Trends**: How do the metrics compare between the two?
3. **Key Differences**: Major changes or differences in messaging
4. **Progress Assessment**: Based on the comparison, what progress has been made?
5. **Consistency**: Are the presentations consistent in format and approach?

Provide a summary of how the story has evolved between the two presentations.`,
        officeFiles: [
          "./examples/office-documents/data/quarterly-report.pptx",
          "./examples/office-documents/data/annual-review.pptx",
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
      "Error in Example 7:",
      error instanceof Error ? error.message : error,
    );
    console.log(
      "Note: This example requires two PPTX files. Ensure both files exist.",
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 8: Executive Brief Generator
 * Creates a one-page executive brief from the presentation
 */
async function executiveBriefGenerator() {
  console.log("=== Example 8: Executive Brief Generator ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Create a one-page executive brief from this presentation:

# EXECUTIVE BRIEF
---

## Summary (2-3 sentences)
[High-level overview of what the presentation covers]

## Key Metrics
| Metric | Value | Trend |
|--------|-------|-------|
[Extract key metrics in table format]

## Critical Findings
• [Most important finding 1]
• [Most important finding 2]
• [Most important finding 3]

## Recommendations
1. [Top recommendation]
2. [Second recommendation]
3. [Third recommendation]

## Next Steps
- [ ] [Immediate action 1]
- [ ] [Immediate action 2]

---
*Generated from presentation analysis*

Keep the brief concise and focused on what an executive needs to know for decision-making.`,
        officeFiles: ["./examples/office-documents/data/quarterly-report.pptx"],
      },
      provider: PROVIDER,
      maxTokens: 1000,
    });

    console.log("Executive Brief:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error(
      "Error in Example 8:",
      error instanceof Error ? error.message : error,
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
  console.log(" NeuroLink PPTX Presentation Summary Examples");
  console.log(" Provider:", PROVIDER);
  console.log("=".repeat(60) + "\n");

  console.log("Note: Make sure you have set up provider credentials");
  console.log("and that PPTX files exist in examples/office-documents/data/\n");

  console.log("Running examples...\n");

  await basicPresentationSummary();
  await slideBySlideAnalysis();
  await meetingNotesGenerator();
  await keyInsightsExtraction();
  await qaPreparation();
  await streamingPresentationAnalysis();
  await presentationComparison();
  await executiveBriefGenerator();

  console.log("All examples completed!");
}

// Run examples
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
