---
title: "CSV File Support"
description: Attach CSV files directly to AI prompts for data analysis, insights, and processing as a multimodal input type
keywords:
  [csv, file-support, multimodal, data-analysis, file-processing, tabular-data]
---

# CSV File Support

NeuroLink provides seamless CSV file support as a **multimodal input type** - attach CSV files directly to your AI prompts for data analysis, insights, and processing.

## Overview

CSV support in NeuroLink works just like image support - it's a multimodal input that gets automatically processed and injected into your prompts. The system:

1. **Auto-detects** CSV files using FileDetector (magic bytes, MIME types, extensions, content heuristics)
2. **Parses** CSV data using streaming parser for memory efficiency
3. **Formats** CSV content into LLM-optimized text (markdown/json)
4. **Injects** formatted CSV data into your prompt text
5. **Works** with ALL AI providers (not limited to vision models)

## Quick Start

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Basic CSV analysis
const result = await neurolink.generate({
  input: {
    text: "What are the key trends in this sales data?",
    csvFiles: ["sales-2024.csv"],
  },
});

// Multiple CSV files
const comparison = await neurolink.generate({
  input: {
    text: "Compare Q1 vs Q2 performance and identify growth areas",
    csvFiles: ["q1-sales.csv", "q2-sales.csv"],
  },
});

// Auto-detect file types (mix CSV and images)
const multimodal = await neurolink.generate({
  input: {
    text: "Analyze this data and compare with the chart",
    files: ["data.csv", "chart.png"], // Auto-detects which is CSV vs image
  },
});

// Customize CSV processing
const custom = await neurolink.generate({
  input: {
    text: "Summarize the top 100 customers by revenue",
    csvFiles: ["customers.csv"],
  },
  csvOptions: {
    maxRows: 100, // Limit to first 100 rows
    formatStyle: "markdown", // Use markdown table format
    includeHeaders: true, // Include CSV headers
  },
});
```

### CLI Usage

```bash
# Attach CSV files to your prompt
neurolink generate "Analyze this sales data" --csv sales.csv

# Multiple CSV files
neurolink generate "Compare these datasets" --csv q1.csv --csv q2.csv

# Auto-detect file types
neurolink generate "Analyze data and image" --file data.csv --file chart.png

# Customize CSV processing
neurolink generate "Summarize trends" \
  --csv large-dataset.csv \
  --csv-max-rows 500 \
  --csv-format json

# Stream mode also supports CSV
neurolink stream "Explain this data in detail" --csv data.csv

# Batch processing with CSV
echo "Summarize sales data" > prompts.txt
echo "Find top performers" >> prompts.txt
neurolink batch prompts.txt --csv sales.csv
```

## API Reference

### GenerateOptions

```typescript
type GenerateOptions = {
  input: {
    text: string;
    images?: Array<Buffer | string>;
    csvFiles?: Array<Buffer | string>; // Explicit CSV files
    files?: Array<Buffer | string>; // Auto-detect file types
  };

  csvOptions?: {
    maxRows?: number; // Default: 1000
    formatStyle?: "raw" | "markdown" | "json"; // Default: "raw"
    includeHeaders?: boolean; // Default: true
  };

  // ... other options
};
```

### CSV Input Types

CSV files can be provided as:

- **File paths**: `"./data.csv"` or `"/absolute/path/data.csv"`
- **URLs**: `"https://example.com/data.csv"`
- **Buffers**: `Buffer.from("name,age\nAlice,30")`
- **Data URIs**: `"data:text/csv;base64,..."`

```typescript
// File path
await neurolink.generate({
  input: {
    text: "Analyze this",
    csvFiles: ["./data.csv"],
  },
});

// URL
await neurolink.generate({
  input: {
    text: "Analyze this",
    csvFiles: ["https://example.com/data.csv"],
  },
});

// Buffer
const csvBuffer = Buffer.from("name,age\nAlice,30\nBob,25");
await neurolink.generate({
  input: {
    text: "Analyze this",
    csvFiles: [csvBuffer],
  },
});
```

### CSV Processing Options

#### maxRows

Limit the number of rows processed (default: 1000). Useful for large datasets.

```typescript
csvOptions: {
  maxRows: 100; // Only process first 100 rows
}
```

#### formatStyle

Control how CSV data is formatted for the LLM:

- **`raw`** (default, RECOMMENDED): Original CSV format with proper escaping
  - Best for large files and minimal token usage
  - Preserves original structure
  - Handles commas, quotes, newlines correctly
  - File size stays minimal (63KB stays 63KB, not 199KB)

- **`json`**: JSON array format
  - Best for structured data processing
  - Easy to parse programmatically
  - Higher token usage (can expand 3x for large files)

- **`markdown`**: Markdown table format
  - Best for small datasets (<100 rows)
  - More readable for humans
  - Takes most tokens

```typescript
// Raw CSV (recommended for large files)
csvOptions: {
  formatStyle: "raw",
}
// Output: name,age\nAlice,30\nBob,25

// JSON array
csvOptions: {
  formatStyle: "json",
}
// Output: [{"name":"Alice","age":30},{"name":"Bob","age":25}]

// Markdown table
csvOptions: {
  formatStyle: "markdown",
}
// Output: | name | age |
//         | ---- | --- |
//         | Alice | 30 |
```

#### includeHeaders

Include CSV headers in output (default: true).

```typescript
csvOptions: {
  includeHeaders: false; // Skip headers
}
```

## File Detection System

NeuroLink uses a **multi-strategy detection system** with confidence scores:

### Detection Strategies (in priority order)

1. **Magic Bytes** (95% confidence)
   - Detects file type from binary headers
   - Works for images (PNG, JPEG, GIF, WebP)
   - PDFs and binary formats

2. **MIME Type** (85% confidence)
   - Uses HTTP Content-Type headers for URLs
   - Detects `text/csv`, `image/*`, etc.

3. **Extension** (70% confidence)
   - File extension-based detection
   - Supports: `.csv`, `.tsv`, `.jpg`, `.png`, etc.

4. **Content Heuristics** (75% confidence)
   - Analyzes file content patterns
   - Detects CSV by checking consistent comma-separated columns

The system stops at the **first strategy with 80%+ confidence**.

```typescript
// Example: FileDetector workflow
// 1. Check magic bytes -> Not binary (0% confidence)
// 2. Check MIME type (if URL) -> text/csv (85% confidence) ✓ STOP
// Result: Detected as CSV with 85% confidence
```

## How It Works

### Internal Processing Flow

````typescript
// When you call generate() with CSV files:
await neurolink.generate({
  input: {
    text: "Analyze this data",
    csvFiles: ["data.csv"],
  },
});

// Internal flow:
// 1. messageBuilder.ts detects csvFiles array
// 2. Calls FileDetector.detectAndProcess("data.csv")
// 3. FileDetector runs detection strategies
// 4. Loads file content (from path/URL/buffer)
// 5. Routes to CSVProcessor.process(buffer)
// 6. CSV parsed using streaming csv-parser library
// 7. Formatted to LLM-optimized text (raw/markdown/json)
// 8. Appends to prompt text:
//    "Analyze this data
//
//    ## CSV Data from "data.csv":
//    ```csv
//    name,age,city
//    Alice,30,New York
//    Bob,25,London
//    ```"
// 9. Sends to AI provider
````

### Memory Efficiency

CSV files are parsed using **streaming** for memory efficiency:

```typescript
// CSVProcessor uses Readable streams
Readable.from([csvString])
  .pipe(csvParser())
  .on("data", (row) => {
    if (count < maxRows) rows.push(row);
  });
```

Large CSV files are handled efficiently:

- **Streaming parser**: Processes line-by-line
- **Row limit**: Configurable `maxRows` (default: 1000)
- **Memory bounded**: Only holds limited rows in memory

## Examples

### Data Analysis

```typescript
const result = await neurolink.generate({
  input: {
    text: `Analyze this customer data and provide:
    1. Total customers
    2. Average age
    3. Top 5 cities by customer count
    4. Any notable patterns or insights`,
    csvFiles: ["customers.csv"],
  },
});
```

### Data Comparison

```typescript
const result = await neurolink.generate({
  input: {
    text: "Compare Q1 vs Q2 sales data. What changed? Which products improved?",
    csvFiles: ["q1-sales.csv", "q2-sales.csv"],
  },
});
```

### Data Cleaning

```typescript
const result = await neurolink.generate({
  input: {
    text: `Review this data for:
    - Missing values
    - Duplicate entries
    - Data quality issues
    - Suggested corrections`,
    csvFiles: ["raw-data.csv"],
  },
  csvOptions: {
    maxRows: 100,
    formatStyle: "markdown",
  },
});
```

### Schema Generation

```typescript
const result = await neurolink.generate({
  input: {
    text: "Generate a JSON schema for this CSV data with appropriate types and constraints",
    csvFiles: ["sample-data.csv"],
  },
  csvOptions: {
    maxRows: 50,
    formatStyle: "json",
  },
});
```

### Multimodal Analysis

```typescript
const result = await neurolink.generate({
  input: {
    text: "Compare the sales chart with the actual CSV data. Do they match?",
    files: ["sales-chart.png", "sales-data.csv"],
  },
});
```

## TypeScript Types

Only **types** are exposed from the package (not classes):

```typescript
import type {
  FileType,
  FileInput,
  FileSource,
  FileDetectionResult,
  FileProcessingResult,
  CSVProcessorOptions,
  FileDetectorOptions,
  CSVContent,
} from "@juspay/neurolink";

// FileType union
type FileType = "csv" | "image" | "pdf" | "text" | "unknown";

// CSV processing options
type CSVProcessorOptions = {
  maxRows?: number;
  formatStyle?: "raw" | "markdown" | "json";
  includeHeaders?: boolean;
};

// File detector options
type FileDetectorOptions = {
  maxSize?: number;
  timeout?: number;
  allowedTypes?: FileType[];
};
```

## Best Practices

### 1. Use Raw Format for Large Files

The `raw` format is **recommended** for large files and best token efficiency:

```typescript
csvOptions: {
  formatStyle: "raw",
} // ✅ RECOMMENDED for large files

// Use json for smaller datasets or when you need structured parsing
csvOptions: {
  formatStyle: "json",
} // ✅ Good for small-medium files
```

### 2. Limit Rows for Large Files

For large datasets, limit rows to avoid token limits:

```typescript
csvOptions: {
  maxRows: 500,
} // Process first 500 rows
```

### 3. Use Markdown for Small Datasets

For <100 rows, markdown tables are more readable:

```typescript
csvOptions: {
  maxRows: 50,
  formatStyle: "markdown"
}
```

### 4. Provide Clear Instructions

Give the AI clear instructions about what to analyze:

```typescript
input: {
  text: `Analyze this sales data and provide:
  1. Total revenue
  2. Top 5 products
  3. Revenue trend
  4. Recommendations`,
  csvFiles: ["sales.csv"],
}
```

### 5. Use Auto-Detection

Let FileDetector handle mixed file types:

```typescript
files: ["data.csv", "chart.png", "report.pdf"]; // Auto-detects each type
```

## Limitations

- **Max file size**: 10MB by default (configurable)
- **Max rows**: 1000 by default (configurable)
- **Encoding**: UTF-8 recommended (auto-detected)
- **Token limits**: Large CSV files may exceed provider token limits
- **Streaming**: CSV content is parsed and formatted before sending (not streamed to LLM)

## Error Handling

```typescript
try {
  const result = await neurolink.generate({
    input: {
      text: "Analyze this",
      csvFiles: ["data.csv"],
    },
  });
} catch (error) {
  if (error.message.includes("File too large")) {
    // Handle file size error
  } else if (error.message.includes("not allowed")) {
    // Handle file type restriction
  } else if (error.message.includes("CSV")) {
    // Handle CSV parsing error
  }
}
```

## Related Features

- **[Office Documents](./office-documents.md)**: DOCX, PPTX, XLSX processing
- **[PDF Support](./pdf-support.md)**: PDF document processing
- **Image Support**: Similar multimodal input for images
- **File Detection**: Auto-detect file types with confidence scores
- **Memory Efficient**: Streaming parser for large files
- **Provider Agnostic**: Works with all AI providers
- **CLI Integration**: Full CLI support with options

## Summary

- CSV support is **multimodal input** (like images)
- Use `csvFiles` array or `files` array (auto-detect)
- Customize with `csvOptions` (maxRows, formatStyle, includeHeaders)
- Works with **ALL providers** (not just vision models)
- **Memory efficient** streaming parser
- CLI support with `--csv`, `--file`, `--csv-max-rows`, `--csv-format`
- Only **types** exposed from package (not classes)
