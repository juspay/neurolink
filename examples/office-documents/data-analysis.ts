/**
 * XLSX Data Analysis Examples for NeuroLink
 * Demonstrates Excel spreadsheet processing and analysis capabilities
 *
 * Run with: npx tsx examples/office-documents/data-analysis.ts
 *
 * Prerequisites:
 * - Set up provider credentials (Google AI, OpenAI, Anthropic, or Vertex AI)
 * - Ensure XLSX files exist in examples/office-documents/data/ directory
 *
 * Note: If you encounter tool schema errors, you can disable tools:
 *   export NEUROLINK_DISABLE_TOOLS=true
 *   npx tsx examples/office-documents/data-analysis.ts
 */

import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Provider configuration (change as needed)
const PROVIDER = "google-ai"; // or "openai", "anthropic", "vertex"

/**
 * Example 1: Basic Spreadsheet Analysis
 * Provides an overview of the spreadsheet content
 */
async function basicSpreadsheetAnalysis() {
  console.log("=== Example 1: Basic Spreadsheet Analysis ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Analyze this Excel spreadsheet and provide:
1. Overview of the data structure (columns, rows, sheets)
2. Summary of the data types present
3. Key metrics and totals
4. General observations about the data

Format as a structured report.`,
        officeFiles: ["./examples/office-documents/data/sales-data.xlsx"],
      },
      provider: PROVIDER,
      maxTokens: 1500,
    });

    console.log("Spreadsheet Analysis:");
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
 * Example 2: Statistical Summary
 * Generates statistical analysis of numeric data
 */
async function statisticalSummary() {
  console.log("=== Example 2: Statistical Summary ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Perform a statistical analysis on this spreadsheet:

## Statistical Analysis

For each numeric column, provide:
- **Count**: Number of data points
- **Sum**: Total sum
- **Average/Mean**: Arithmetic mean
- **Min/Max**: Minimum and maximum values
- **Range**: Difference between max and min

Additionally:
- Identify any outliers (values significantly different from the mean)
- Note any patterns or correlations between columns
- Highlight any data quality issues (missing values, inconsistencies)

Present the statistics in a table format where possible.`,
        officeFiles: ["./examples/office-documents/data/sales-data.xlsx"],
      },
      provider: PROVIDER,
      maxTokens: 2000,
    });

    console.log("Statistical Summary:");
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
 * Example 3: Trend Analysis
 * Identifies trends and patterns in the data
 */
async function trendAnalysis() {
  console.log("=== Example 3: Trend Analysis ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Analyze trends in this spreadsheet data:

## Trend Analysis

1. **Time-Based Trends**
   - If date/time columns exist, analyze changes over time
   - Identify growth or decline patterns
   - Calculate period-over-period changes

2. **Category Trends**
   - Group data by categories (if applicable)
   - Compare performance across categories
   - Identify top and bottom performers

3. **Correlation Analysis**
   - Identify relationships between variables
   - Note positive or negative correlations
   - Suggest causal relationships (with caveats)

4. **Seasonal Patterns**
   - If applicable, identify seasonal variations
   - Note any cyclical patterns

5. **Growth Projections**
   - Based on current trends, project future values
   - Provide confidence level for projections`,
        officeFiles: ["./examples/office-documents/data/sales-data.xlsx"],
      },
      provider: PROVIDER,
      maxTokens: 2000,
    });

    console.log("Trend Analysis:");
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
 * Example 4: Data Quality Assessment
 * Evaluates the quality and completeness of the data
 */
async function dataQualityAssessment() {
  console.log("=== Example 4: Data Quality Assessment ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Perform a data quality assessment on this spreadsheet:

## Data Quality Report

### Completeness
- Percentage of cells with data
- Columns with missing values
- Rows with incomplete data

### Accuracy
- Identify any obvious data entry errors
- Values that seem incorrect or out of range
- Inconsistent formatting

### Consistency
- Naming conventions used
- Date/number format consistency
- Category standardization

### Validity
- Data types match expected types
- Values within expected ranges
- Referential integrity (if applicable)

### Recommendations
- Priority issues to fix
- Data cleaning suggestions
- Process improvements to prevent future issues

Rate overall data quality: EXCELLENT / GOOD / FAIR / POOR`,
        officeFiles: ["./examples/office-documents/data/sales-data.xlsx"],
      },
      provider: PROVIDER,
      maxTokens: 1800,
    });

    console.log("Data Quality Assessment:");
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
 * Example 5: Business Insights
 * Extracts actionable business insights from the data
 */
async function businessInsights() {
  console.log("=== Example 5: Business Insights ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Generate actionable business insights from this spreadsheet:

## Business Insights Report

### Executive Summary
(2-3 sentence overview of key findings)

### Top Insights

**Insight 1**: [Title]
- Finding: [What the data shows]
- Impact: [Business implication]
- Recommendation: [Suggested action]

**Insight 2**: [Title]
- Finding: [What the data shows]
- Impact: [Business implication]
- Recommendation: [Suggested action]

(Continue for 5-7 key insights)

### Risk Indicators
- [Any concerning trends or patterns]
- [Areas requiring attention]

### Opportunities
- [Growth opportunities identified]
- [Efficiency improvements possible]

### Recommended Actions
1. [Priority 1 action]
2. [Priority 2 action]
3. [Priority 3 action]`,
        officeFiles: ["./examples/office-documents/data/sales-data.xlsx"],
      },
      provider: PROVIDER,
      maxTokens: 2000,
    });

    console.log("Business Insights:");
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
 * Example 6: Comparison Analysis
 * Compares data across multiple spreadsheets
 */
async function comparisonAnalysis() {
  console.log("=== Example 6: Comparison Analysis ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Compare the data in these two spreadsheets:

## Comparative Analysis

### Data Structure Comparison
- Columns present in both vs. unique to each
- Row count differences
- Data format differences

### Metric Comparison
| Metric | File 1 | File 2 | Difference | % Change |
|--------|--------|--------|------------|----------|
(Compare key numeric metrics)

### Key Differences
1. [Major difference 1]
2. [Major difference 2]
3. [Major difference 3]

### Trend Comparison
- How trends differ between datasets
- Period-over-period changes

### Reconciliation Issues
- Data that doesn't match when it should
- Unexplained discrepancies

### Summary
(Overall assessment of the comparison)`,
        officeFiles: [
          "./examples/office-documents/data/sales-data.xlsx",
          "./examples/office-documents/data/budget-data.xlsx",
        ],
      },
      provider: PROVIDER,
      maxTokens: 2000,
    });

    console.log("Comparison Analysis:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error(
      "Error in Example 6:",
      error instanceof Error ? error.message : error,
    );
    console.log(
      "Note: This example requires two XLSX files. Ensure both files exist.",
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 7: Streaming Data Analysis
 * Uses streaming for faster response with large spreadsheets
 */
async function streamingDataAnalysis() {
  console.log("=== Example 7: Streaming Data Analysis ===\n");

  try {
    const stream = await neurolink.stream({
      input: {
        text: `Provide a comprehensive analysis of this spreadsheet including:
- Complete data summary
- All calculated metrics
- Trend analysis
- Data quality assessment
- Business recommendations`,
        officeFiles: ["./examples/office-documents/data/sales-data.xlsx"],
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
      "Error in Example 7:",
      error instanceof Error ? error.message : error,
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 8: Dashboard Data Extraction
 * Extracts data suitable for dashboards
 */
async function dashboardDataExtraction() {
  console.log("=== Example 8: Dashboard Data Extraction ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: `Extract key metrics from this spreadsheet for a dashboard:

## Dashboard Metrics

### KPI Summary
| KPI | Current Value | Previous Period | Change |
|-----|---------------|-----------------|--------|
(Extract 5-10 key performance indicators)

### Trend Data (for charts)
\`\`\`json
{
  "timeSeries": [
    { "period": "...", "value": ... },
    ...
  ]
}
\`\`\`

### Category Breakdown (for pie charts)
\`\`\`json
{
  "categories": [
    { "name": "...", "value": ..., "percentage": ... },
    ...
  ]
}
\`\`\`

### Top/Bottom Lists
**Top 5 Performers:**
1. ...

**Bottom 5 Performers:**
1. ...

### Alerts & Thresholds
- Metrics exceeding thresholds
- Items requiring attention`,
        officeFiles: ["./examples/office-documents/data/sales-data.xlsx"],
      },
      provider: PROVIDER,
      maxTokens: 2000,
    });

    console.log("Dashboard Data:");
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
  console.log(" NeuroLink XLSX Data Analysis Examples");
  console.log(" Provider:", PROVIDER);
  console.log("=".repeat(60) + "\n");

  console.log("Note: Make sure you have set up provider credentials");
  console.log("and that XLSX files exist in examples/office-documents/data/\n");

  console.log("Running examples...\n");

  await basicSpreadsheetAnalysis();
  await statisticalSummary();
  await trendAnalysis();
  await dataQualityAssessment();
  await businessInsights();
  await comparisonAnalysis();
  await streamingDataAnalysis();
  await dashboardDataExtraction();

  console.log("All examples completed!");
}

// Run examples
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
