# Office Document Support

NeuroLink provides seamless support for Microsoft Office documents (DOCX, PPTX, XLSX) as **multimodal input types** - attach Word documents, PowerPoint presentations, or Excel spreadsheets directly to your AI prompts for document analysis, information extraction, and content processing.

## Overview

Office document support in NeuroLink works through intelligent document processing - the system automatically detects the Office format and extracts content for AI analysis. The system:

1. **Detects** Office document type using magic bytes (ZIP-based Open XML format)
2. **Validates** file format and structure
3. **Extracts** text, tables, and metadata from documents
4. **Processes** content for AI provider consumption
5. **Supports** all major Office formats: DOCX, PPTX, XLSX

**Key Formats:**

- **DOCX** (Word) - Documents, reports, contracts
- **PPTX** (PowerPoint) - Presentations, slide decks
- **XLSX** (Excel) - Spreadsheets, data analysis

## Quick Start

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Analyze a Word document
const result = await neurolink.generate({
  input: {
    text: "Summarize the key points from this contract",
    files: ["contract.docx"],
  },
  provider: "openai",
});

// Extract data from Excel spreadsheet
const excelResult = await neurolink.generate({
  input: {
    text: "What are the top 5 sales figures in this spreadsheet?",
    files: ["sales-data.xlsx"],
  },
  provider: "anthropic",
});

// Summarize a PowerPoint presentation
const pptResult = await neurolink.generate({
  input: {
    text: "Create an executive summary of this presentation",
    files: ["quarterly-review.pptx"],
  },
  provider: "google-ai",
});

// Multiple Office documents
const comparison = await neurolink.generate({
  input: {
    text: "Compare the Q1 and Q2 reports. What are the key differences?",
    files: ["q1-report.docx", "q2-report.docx"],
  },
  provider: "vertex",
});

// Mixed file types (Office + PDF + Images)
const multimodal = await neurolink.generate({
  input: {
    text: "Analyze the Word report, verify against Excel data, and check the PDF summary",
    files: ["report.docx", "data.xlsx", "summary.pdf"],
  },
  provider: "openai",
});
```

### CLI Usage

```bash
# Analyze a Word document
neurolink generate "Summarize this contract" --file contract.docx --provider openai

# Extract data from Excel
neurolink generate "What are the key metrics?" --file metrics.xlsx --provider anthropic

# Summarize PowerPoint presentation
neurolink generate "Create executive summary" --file presentation.pptx --provider google-ai

# Multiple Office documents
neurolink generate "Compare these reports" --file q1.docx --file q2.docx --provider vertex

# Stream mode with Office document
neurolink stream "Explain this document in detail" --file report.docx --provider openai
```

## API Reference

### GenerateOptions

```typescript
type GenerateOptions = {
  input: {
    text: string;
    files?: Array<Buffer | string>; // Auto-detects DOCX, PPTX, XLSX
    images?: Array<Buffer | string>; // Image files
    csvFiles?: Array<Buffer | string>; // CSV files
    pdfFiles?: Array<Buffer | string>; // PDF files
  };

  // Provider selection
  provider?: string;

  // Standard options
  model?: string;
  maxTokens?: number;
  temperature?: number;
  // ... other options
};
```

### File Input Formats

```typescript
// String path (relative or absolute)
files: ["./documents/report.docx"];
files: ["/absolute/path/to/presentation.pptx"];

// Buffer (from fs.readFile or other source)
import { readFile } from "fs/promises";
const docBuffer = await readFile("document.docx");
files: [docBuffer];

// Mixed types
files: ["report.docx", docBuffer, "./data.xlsx"];
```

## Supported Formats

### Document Types

| Format   | Extension | Description              | Use Cases                        |
| -------- | --------- | ------------------------ | -------------------------------- |
| **DOCX** | `.docx`   | Word Document            | Reports, contracts, articles     |
| **PPTX** | `.pptx`   | PowerPoint Presentation  | Slide decks, presentations       |
| **XLSX** | `.xlsx`   | Excel Spreadsheet        | Data analysis, financial reports |

### Provider Support

All major providers support Office document analysis:

| Provider              | DOCX | PPTX | XLSX | Notes                           |
| --------------------- | ---- | ---- | ---- | ------------------------------- |
| **OpenAI**            | ✅   | ✅   | ✅   | GPT-4o, GPT-4o-mini recommended |
| **Anthropic**         | ✅   | ✅   | ✅   | Claude 3.5 Sonnet recommended   |
| **Google AI Studio**  | ✅   | ✅   | ✅   | Gemini 2.5 Flash/Pro            |
| **Google Vertex**     | ✅   | ✅   | ✅   | Enterprise deployments          |
| **AWS Bedrock**       | ✅   | ✅   | ✅   | Claude on AWS infrastructure    |
| **Azure OpenAI**      | ✅   | ✅   | ✅   | GPT-4o deployments              |
| **LiteLLM**           | ✅   | ✅   | ✅   | Depends on upstream model       |
| **Mistral**           | ✅   | ✅   | ✅   | Mistral Large recommended       |

### File Limits

| Format | Max Size | Max Pages/Sheets | Notes                        |
| ------ | -------- | ---------------- | ---------------------------- |
| DOCX   | 50 MB    | No limit         | Large documents supported    |
| PPTX   | 50 MB    | 100 slides       | Images extracted for context |
| XLSX   | 50 MB    | 50 sheets        | Formula evaluation supported |

## Features

### 1. Auto-Detection

Office documents are automatically detected when using the `files` array:

```typescript
// Automatically detects Office format
await neurolink.generate({
  input: {
    text: "Analyze all these documents",
    files: [
      "report.docx", // Auto-detected as Word
      "data.xlsx", // Auto-detected as Excel
      "slides.pptx", // Auto-detected as PowerPoint
      "chart.png", // Auto-detected as image
    ],
  },
  provider: "openai",
});
```

### 2. Text Extraction

Full text content is extracted from Office documents:

```typescript
// Extract and analyze text content
await neurolink.generate({
  input: {
    text: "Extract all the key terms and definitions from this legal document",
    files: ["contract.docx"],
  },
  provider: "anthropic",
});
```

### 3. Table Extraction

Tables in Word and Excel documents are preserved:

```typescript
// Analyze tabular data
await neurolink.generate({
  input: {
    text: "Summarize the financial data in the tables",
    files: ["financial-report.docx"],
  },
  provider: "openai",
});

// Excel spreadsheet analysis
await neurolink.generate({
  input: {
    text: "Calculate the total revenue and identify trends",
    files: ["sales-data.xlsx"],
  },
  provider: "anthropic",
});
```

### 4. Presentation Analysis

PowerPoint slides are analyzed for content and structure:

```typescript
// Summarize presentation
await neurolink.generate({
  input: {
    text: "Create a one-page executive summary of this presentation",
    files: ["quarterly-review.pptx"],
  },
  provider: "google-ai",
});

// Extract key points from each slide
await neurolink.generate({
  input: {
    text: "List the main bullet points from each slide",
    files: ["training-deck.pptx"],
  },
  provider: "openai",
});
```

### 5. Multiple Document Analysis

Compare and analyze multiple Office documents:

```typescript
// Document comparison
await neurolink.generate({
  input: {
    text: "Compare version 1 and version 2. What changed?",
    files: ["contract-v1.docx", "contract-v2.docx"],
  },
  provider: "anthropic",
});

// Cross-format analysis
await neurolink.generate({
  input: {
    text: "Verify the presentation data matches the spreadsheet",
    files: ["presentation.pptx", "source-data.xlsx"],
  },
  provider: "openai",
});
```

## Best Practices

### 1. Choose the Right Provider

```typescript
// For detailed document analysis
provider: "anthropic"; // Claude excels at document understanding

// For spreadsheet calculations
provider: "openai"; // GPT-4o handles numerical analysis well

// For presentation summaries
provider: "google-ai"; // Gemini processes visual content effectively

// For enterprise deployments
provider: "bedrock"; // AWS infrastructure with compliance
```

### 2. Optimize File Size

```typescript
// Check file size before processing
import { stat } from "fs/promises";

async function validateOfficeFile(filePath: string) {
  const stats = await stat(filePath);
  const sizeMB = stats.size / (1024 * 1024);

  if (sizeMB > 50) {
    console.warn(`File ${filePath} is ${sizeMB.toFixed(2)}MB. Consider splitting large documents.`);
  }

  console.log(`✓ File validated: ${sizeMB.toFixed(2)}MB`);
}

await validateOfficeFile("report.docx");
```

### 3. Be Specific in Prompts

```typescript
// ❌ Too vague
"Tell me about this document";

// ✅ Specific and actionable
"Extract all action items and deadlines from this meeting notes document";
"Calculate the total revenue by quarter from this Excel spreadsheet";
"List the key messages from each slide in this presentation";
```

### 4. Handle Errors Gracefully

```typescript
try {
  const result = await neurolink.generate({
    input: {
      text: "Analyze this document",
      files: ["document.docx"],
    },
    provider: "openai",
  });
} catch (error) {
  if (error.message.includes("Invalid Office document")) {
    console.error("File is not a valid Office document");
  } else if (error.message.includes("exceeds")) {
    console.error("File too large. Consider splitting the document.");
  } else {
    console.error("Error:", error.message);
  }
}
```

## Use Cases

### Document Analysis

```typescript
// Contract review
await neurolink.generate({
  input: {
    text: "Identify all obligations, deadlines, and potential risks in this contract",
    files: ["service-agreement.docx"],
  },
  provider: "anthropic",
});

// Report summarization
await neurolink.generate({
  input: {
    text: "Create an executive summary with key findings and recommendations",
    files: ["annual-report.docx"],
  },
  provider: "openai",
});
```

### Spreadsheet Analysis

```typescript
// Financial analysis
await neurolink.generate({
  input: {
    text: "Analyze revenue trends and identify the top-performing products",
    files: ["sales-2024.xlsx"],
  },
  provider: "openai",
});

// Data validation
await neurolink.generate({
  input: {
    text: "Check for inconsistencies or errors in this dataset",
    files: ["customer-data.xlsx"],
  },
  provider: "anthropic",
});
```

### Presentation Processing

```typescript
// Meeting preparation
await neurolink.generate({
  input: {
    text: "Create talking points for each slide in this presentation",
    files: ["board-meeting.pptx"],
  },
  provider: "google-ai",
});

// Content extraction
await neurolink.generate({
  input: {
    text: "Convert this presentation into a structured document outline",
    files: ["product-launch.pptx"],
  },
  provider: "openai",
});
```

## Limitations

### Format Requirements

- **Must** be valid Office Open XML format (.docx, .pptx, .xlsx)
- **Must** be within file size limits (50MB max)
- Older formats (.doc, .ppt, .xls) require conversion to modern format

### Content Extraction

- **Images** in documents are described but not analyzed in detail
- **Macros** and VBA code are not executed
- **Embedded objects** may have limited extraction

### Formula Handling (Excel)

- Formula results are extracted, not recalculated
- Complex macros may not be fully interpreted
- External data connections are not resolved

## Troubleshooting

### Error: "Invalid Office document format"

**Problem:** File is not a valid Office document or is corrupted

**Solution:**

```bash
# Verify file is valid Office format
file document.docx  # Should show "Microsoft Word 2007+"

# Try re-saving in Microsoft Office or LibreOffice
```

### Error: "File size exceeds limit"

**Problem:** Document is too large

**Solution:**

```bash
# Split large documents
# For Excel: Split into multiple sheets or files
# For Word: Split into chapters or sections
# For PowerPoint: Create multiple presentations
```

### Content Not Extracted Properly

**Problem:** Some content is missing from analysis

**Common Causes:**

1. **Complex formatting** - Heavily formatted documents may lose some structure
2. **Embedded objects** - Charts and diagrams may not be fully extracted
3. **Protected content** - Password-protected sections cannot be read

**Solution:**

```typescript
// Use more specific prompts to guide extraction
await neurolink.generate({
  input: {
    text: "Focus on the text content and ignore formatting. Extract all paragraphs and bullet points.",
    files: ["complex-document.docx"],
  },
  provider: "anthropic",
});
```

## Related Features

- [PDF Support](./pdf-support.md) - PDF document processing
- [CSV Support](./csv-support.md) - CSV file analysis
- [Multimodal Chat](./multimodal-chat.md) - Overview of multimodal capabilities

## Technical Details

### Office Document Processing Flow

```
1. User provides Office file(s)
   ↓
2. FileDetector validates format (ZIP magic bytes + internal structure)
   ↓
3. Determine Office type (DOCX, PPTX, XLSX)
   ↓
4. Extract content using appropriate parser
   ↓
5. Format content for AI consumption
   ↓
6. Pass to messageBuilder
   ↓
7. Send to AI provider
   ↓
8. Return AI response
```

### Format Detection

Office documents are detected by:

1. **Magic bytes** - All Office Open XML files start with `PK` (ZIP archive)
2. **Internal structure** - Check for `[Content_Types].xml` and specific namespaces:
   - DOCX: `wordprocessingml`
   - PPTX: `presentationml`
   - XLSX: `spreadsheetml`

### Type Definitions

```typescript
// Office file types
type OfficeFileType = "docx" | "pptx" | "xlsx";

// Office processor options
type OfficeProcessorOptions = {
  extractTables?: boolean;
  extractImages?: boolean;
  includeMetadata?: boolean;
};

// File processing result
type OfficeProcessingResult = {
  type: OfficeFileType;
  content: string;
  mimeType: string;
  metadata: {
    pageCount?: number;
    slideCount?: number;
    sheetCount?: number;
    author?: string;
    title?: string;
  };
};
```

## Changelog

### Current Release

- ✅ DOCX document support
- ✅ PPTX presentation support
- ✅ XLSX spreadsheet support
- ✅ Auto-detection via `--file` flag
- ✅ Multiple Office document processing
- ✅ Table extraction and preservation
- ✅ CLI and SDK integration
- ✅ Streaming support
- ✅ Mixed multimodal inputs (Office + PDF + Images + CSV)

---

**Next:** [PDF Support](./pdf-support.md) | [CSV Support](./csv-support.md) | [Multimodal Chat](./multimodal-chat.md)
