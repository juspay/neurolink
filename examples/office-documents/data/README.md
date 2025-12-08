# Sample Office Documents for Examples

This directory contains sample office documents used in the NeuroLink office document processing examples.

## Files

### DOCX Files

#### sample-contract.docx

A sample service agreement contract for demonstrating contract analysis features.

**Contents:**

- Parties: Acme Corporation and Beta Services LLC
- Contract type: Professional Services Agreement
- Term: 12 months with auto-renewal
- Value: $120,000 annual contract
- Key clauses: Confidentiality, Indemnification, Termination

**Use for:**

- Contract analysis and summarization
- Risk assessment
- Clause extraction
- Legal document processing

#### amended-contract.docx

An amended version of the sample contract for comparison examples.

**Contents:**

- Same base contract with modifications
- Increased contract value to $150,000
- Extended term to 24 months
- Added new service levels

**Use for:**

- Contract comparison
- Change tracking
- Version analysis

### PPTX Files

#### quarterly-report.pptx

A quarterly business report presentation.

**Contents:**

- 12 slides covering Q3 2024 performance
- Revenue: $2.5M (15% growth)
- Key metrics and KPIs
- Strategic initiatives update
- Q4 outlook and projections

**Use for:**

- Presentation summarization
- Meeting notes generation
- Key insights extraction
- Executive brief creation

#### annual-review.pptx

An annual business review presentation.

**Contents:**

- 20 slides covering full year performance
- Year-over-year comparisons
- Department performance breakdown
- Budget vs. actual analysis
- Strategic priorities for next year

**Use for:**

- Presentation comparison (vs. quarterly)
- Long-form content analysis
- Trend identification

### XLSX Files

#### sales-data.xlsx

Sales performance data spreadsheet.

**Contents:**

- 500 rows of transaction data
- Columns: Date, Product, Category, Quantity, Unit Price, Revenue, Region, Sales Rep
- Date range: January 2024 - September 2024
- Categories: Electronics, Furniture, Software, Services

**Use for:**

- Statistical analysis
- Trend analysis
- Data quality assessment
- Business insights extraction

#### budget-data.xlsx

Budget and financial planning spreadsheet.

**Contents:**

- Monthly budget allocations
- Actual vs. planned spending
- Department breakdowns
- Variance analysis data

**Use for:**

- Budget comparison
- Financial reconciliation
- Spreadsheet comparison examples

## Usage

These files are referenced in the office document examples:

```bash
# Contract analysis
npx tsx examples/office-documents/contract-analysis.ts

# Presentation summary
npx tsx examples/office-documents/presentation-summary.ts

# Data analysis
npx tsx examples/office-documents/data-analysis.ts

# Mixed multimodal
npx tsx examples/office-documents/mixed-multimodal.ts
```

## CLI Examples

```bash
# Analyze a DOCX contract
npx @juspay/neurolink generate "Extract key terms" \
  --office examples/office-documents/data/sample-contract.docx \
  --provider google-ai

# Summarize a PPTX presentation
npx @juspay/neurolink generate "Summarize this presentation" \
  --office examples/office-documents/data/quarterly-report.pptx \
  --provider openai

# Analyze an XLSX spreadsheet
npx @juspay/neurolink generate "Analyze sales trends" \
  --office examples/office-documents/data/sales-data.xlsx \
  --provider anthropic

# Mixed multimodal analysis
npx @juspay/neurolink generate "Compare contract with actual sales" \
  --office examples/office-documents/data/sample-contract.docx \
  --office examples/office-documents/data/sales-data.xlsx \
  --provider google-ai
```

## Creating Your Own Test Files

To create sample files for testing:

### DOCX

Use Microsoft Word, Google Docs, or LibreOffice Writer to create a document, then export as .docx.

### PPTX

Use Microsoft PowerPoint, Google Slides, or LibreOffice Impress to create a presentation, then export as .pptx.

### XLSX

Use Microsoft Excel, Google Sheets, or LibreOffice Calc to create a spreadsheet, then export as .xlsx.

## Notes

- All sample data is synthetic and for demonstration purposes only
- File sizes are kept small for quick example execution
- Real-world files may require longer processing times
- Large files may require streaming for optimal performance
