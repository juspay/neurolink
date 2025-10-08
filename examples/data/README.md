# Sample Data Files for Examples

This directory contains sample files (CSV, PDF) used in the NeuroLink multimodal analysis examples.

## Files

### sales.csv

Sample product sales data with 10 rows demonstrating various product categories, pricing, and revenue calculations.

**Columns:**

- `product` - Product name
- `category` - Product category (Electronics, Furniture)
- `price` - Unit price in USD
- `quantity` - Number of units sold
- `revenue` - Total revenue (price × quantity)
- `date` - Sale date

### q1_sales.csv

Q1 2024 monthly sales summary (January - March)

**Columns:**

- `month` - Month name
- `revenue` - Total monthly revenue in USD
- `transactions` - Number of transactions
- `avg_order` - Average order value

### q2_sales.csv

Q2 2024 monthly sales summary (April - June)

**Columns:**

- `month` - Month name
- `revenue` - Total monthly revenue in USD
- `transactions` - Number of transactions
- `avg_order` - Average order value

### invoice.pdf

Sample invoice document demonstrating PDF processing capabilities.

**Contents:**

- Document title: NeuroLink PDF Test Document
- Revenue figure: $10,000
- Single-page PDF for basic analysis examples

**Use for:**

- Basic PDF analysis
- Revenue extraction
- Document summarization
- Testing PDF support

### report.pdf

Multi-page quarterly sales report (3 pages).

**Contents:**

- Q1 Sales Report: $50,000 revenue
- Q2 Sales Report: $60,000 revenue
- Q3 Sales Report: $70,000 revenue
- Total across quarters: $180,000

**Use for:**

- Multi-page PDF processing
- Comparison with single-page documents
- Quarterly trend analysis
- Testing page limit handling

## Usage

These files are referenced in `examples/csv-analysis.ts` and `examples/pdf-analysis.ts`. Run the examples with:

```bash
# Run CSV examples
npx tsx examples/csv-analysis.ts

# Run PDF examples
npx tsx examples/pdf-analysis.ts

# Or use files directly with the CLI
# CSV:
npx @juspay/neurolink generate "Analyze sales trends" --csv examples/data/sales.csv

# PDF:
npx @juspay/neurolink generate "Summarize this invoice" \
  --pdf examples/data/invoice.pdf \
  --provider vertex

# Compare CSV + PDF (multimodal):
npx @juspay/neurolink generate "Compare sales data with invoice" \
  --csv examples/data/sales.csv \
  --pdf examples/data/invoice.pdf \
  --provider vertex
```

## Example Queries

Try these prompts with the sample data:

```bash
# Sales analysis
npx @juspay/neurolink generate "What are the top 3 products by revenue?" \
  --csv examples/data/sales.csv

# Trend analysis
npx @juspay/neurolink generate "Analyze revenue trends across Q1 and Q2" \
  --csv examples/data/q1_sales.csv \
  --csv examples/data/q2_sales.csv

# Category insights
npx @juspay/neurolink generate "Which category generates more revenue: Electronics or Furniture?" \
  --csv examples/data/sales.csv

# PDF analysis
npx @juspay/neurolink generate "What is the total revenue in this invoice?" \
  --pdf examples/data/invoice.pdf \
  --provider vertex

# Multi-page PDF
npx @juspay/neurolink generate "Compare quarterly revenues across all three quarters" \
  --pdf examples/data/report.pdf \
  --provider anthropic

# PDF comparison
npx @juspay/neurolink generate "Compare revenue between these two documents" \
  --pdf examples/data/invoice.pdf \
  --pdf examples/data/report.pdf \
  --provider vertex

# Multimodal (CSV + PDF)
npx @juspay/neurolink generate "Does the CSV sales data match the PDF invoice totals?" \
  --file examples/data/sales.csv \
  --file examples/data/invoice.pdf \
  --provider vertex
```

## Notes

- All revenue values are in USD
- Dates are in ISO 8601 format (YYYY-MM-DD)
- Data is synthetic and for demonstration purposes only
