# Sample CSV Data for Examples

This directory contains sample CSV files used in the NeuroLink CSV analysis examples.

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

## Usage

These files are referenced in `examples/csv-analysis.ts`. Run the examples with:

```bash
# Run all examples
npx tsx examples/csv-analysis.ts

# Or use them directly with the CLI
npx @juspay/neurolink generate "Analyze sales trends" --csv examples/data/sales.csv

# Compare quarterly data
npx @juspay/neurolink generate "Compare quarters" \
  --csv examples/data/q1_sales.csv \
  --csv examples/data/q2_sales.csv
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
```

## Notes

- All revenue values are in USD
- Dates are in ISO 8601 format (YYYY-MM-DD)
- Data is synthetic and for demonstration purposes only
