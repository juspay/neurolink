# PDF File Support

NeuroLink provides seamless PDF file support as a **multimodal input type** - attach PDF documents directly to your AI prompts for document analysis, information extraction, and content processing.

## Overview

PDF support in NeuroLink works as a native multimodal input - the system automatically processes PDF files and passes them directly to the AI provider's vision/document understanding capabilities. The system:

1. **Validates** PDF files using magic byte detection and format verification
2. **Checks** provider compatibility (Vertex AI, Anthropic, Bedrock, AI Studio)
3. **Verifies** file size and page limits per provider
4. **Passes** PDF directly to the provider's native document API
5. **Works** with providers that support native PDF processing

**Key Difference from CSV:** Unlike CSV files which are converted to text, PDFs are sent as binary documents to providers with native PDF support. This enables visual analysis of charts, tables, images, and formatted text within PDFs.

## Quick Start

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Basic PDF analysis
const result = await neurolink.generate({
  input: {
    text: "What is the total revenue mentioned in this financial report?",
    pdfFiles: ["financial-report-q3.pdf"],
  },
  provider: "vertex", // or "anthropic", "bedrock", "google-ai-studio"
});

// Multiple PDF comparison
const comparison = await neurolink.generate({
  input: {
    text: "Compare the revenue figures between Q1 and Q2 reports. What's the growth percentage?",
    pdfFiles: ["q1-report.pdf", "q2-report.pdf"],
  },
  provider: "vertex",
});

// Auto-detect file types (mix PDF, CSV, and images)
const multimodal = await neurolink.generate({
  input: {
    text: "Analyze the financial data in the PDF, compare with the CSV spreadsheet, and verify against the chart image",
    files: ["report.pdf", "data.csv", "chart.png"], // Auto-detects each type
  },
  provider: "vertex",
});

// Streaming with PDF
const stream = await neurolink.stream({
  input: {
    text: "Provide a detailed summary of this contract, highlighting key terms and obligations",
    pdfFiles: ["contract.pdf"],
  },
  provider: "anthropic",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

### CLI Usage

```bash
# Attach PDF files to your prompt
neurolink generate "Summarize this invoice" --pdf invoice.pdf --provider vertex

# Multiple PDF files
neurolink generate "Compare these contracts" --pdf contract1.pdf --pdf contract2.pdf --provider anthropic

# Auto-detect file types
neurolink generate "Analyze report and data" --file report.pdf --file data.csv --provider vertex

# Stream mode with PDF
neurolink stream "Explain this document in detail" --pdf document.pdf --provider bedrock

# Batch processing with PDF
echo "Summarize the key points" > prompts.txt
echo "Extract all monetary values" >> prompts.txt
neurolink batch prompts.txt --pdf invoice.pdf --provider vertex
```

## API Reference

### GenerateOptions

```typescript
type GenerateOptions = {
  input: {
    text: string;
    images?: Array<Buffer | string>; // Image files
    csvFiles?: Array<Buffer | string>; // CSV files (converted to text)
    pdfFiles?: Array<Buffer | string>; // PDF files (native binary)
    files?: Array<Buffer | string>; // Auto-detect file types
  };

  // Provider selection (REQUIRED for PDF)
  provider: "vertex" | "anthropic" | "bedrock" | "google-ai-studio";

  // Standard options
  model?: string;
  maxTokens?: number;
  temperature?: number;
  // ... other options
};
```

### StreamOptions

```typescript
type StreamOptions = {
  input: {
    text: string;
    pdfFiles?: Array<Buffer | string>; // Same as GenerateOptions
    files?: Array<Buffer | string>;
  };

  provider: "vertex" | "anthropic" | "bedrock" | "google-ai-studio";
  // ... other options
};
```

### File Input Formats

```typescript
// String path (relative or absolute)
pdfFiles: ["./documents/invoice.pdf"];
pdfFiles: ["/absolute/path/to/report.pdf"];

// Buffer (from fs.readFile or other source)
import { readFile } from "fs/promises";
const pdfBuffer = await readFile("document.pdf");
pdfFiles: [pdfBuffer];

// Mixed types
pdfFiles: ["invoice.pdf", pdfBuffer, "./report.pdf"];
```

## Provider Support

### Supported Providers

| Provider              | Max Size | Max Pages | API Type  | Notes                       |
| --------------------- | -------- | --------- | --------- | --------------------------- |
| **Google Vertex AI**  | 5 MB     | 100       | Document  | Recommended for general use |
| **Anthropic Claude**  | 5 MB     | 100       | Document  | Best for detailed analysis  |
| **AWS Bedrock**       | 5 MB     | 100       | Document  | Enterprise deployments      |
| **Google AI Studio**  | 2000 MB  | 100       | Files API | Largest file support        |
| **OpenAI**            | 10 MB    | 100       | Files API | GPT-4o, GPT-4o-mini, o1     |
| **LiteLLM**           | 10 MB    | 100       | Proxy     | Depends on upstream model   |
| **OpenAI Compatible** | 10 MB    | 100       | Proxy     | Depends on upstream model   |

### Unsupported Providers

The following providers **do not currently support** native PDF processing:

- Azure OpenAI
- Ollama (local models)

**Error Message for Unsupported Providers:**

```
PDF files are not currently supported with azure-openai provider.
Supported providers: Google Vertex AI, Anthropic, AWS Bedrock, Google AI Studio, OpenAI
Current provider: azure-openai

Options:
1. Switch to a supported provider (--provider vertex or --provider openai)
2. Convert your PDF to text manually
3. Wait for future update (Azure OpenAI conversion coming soon)
```

### Provider-Specific Features

#### Google Vertex AI

```typescript
await neurolink.generate({
  input: {
    text: "Analyze this report",
    pdfFiles: ["report.pdf"],
  },
  provider: "vertex",
  model: "gemini-1.5-pro", // Best for document understanding
});
```

#### Anthropic Claude

```typescript
await neurolink.generate({
  input: {
    text: "Extract all invoice details",
    pdfFiles: ["invoice.pdf"],
  },
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022", // Latest model
});
```

#### AWS Bedrock (with Converse API)

```typescript
await neurolink.generate({
  input: {
    text: "Summarize this contract",
    pdfFiles: ["contract.pdf"],
  },
  provider: "bedrock",
  // Visual PDF analysis with citations
  // Text-only: ~1,000 tokens/3 pages
  // Visual: ~7,000 tokens/3 pages
});
```

#### Google AI Studio

```typescript
await neurolink.generate({
  input: {
    text: "Analyze this large document",
    pdfFiles: ["large-report.pdf"], // Up to 2GB!
  },
  provider: "google-ai-studio",
});
```

## Features

### 1. Auto-Detection

Use the `files` array for automatic file type detection:

```typescript
// Automatically detects PDF, CSV, and image types
await neurolink.generate({
  input: {
    text: "Analyze all these documents",
    files: [
      "report.pdf", // Auto-detected as PDF
      "data.csv", // Auto-detected as CSV
      "chart.png", // Auto-detected as image
    ],
  },
  provider: "vertex",
});
```

### 2. Multiple PDF Files

Process multiple PDFs in a single request:

```typescript
// Compare documents
await neurolink.generate({
  input: {
    text: "Compare version 1 and version 2 of the contract. What changed?",
    pdfFiles: ["contract-v1.pdf", "contract-v2.pdf"],
  },
  provider: "anthropic",
});

// Analyze related documents
await neurolink.generate({
  input: {
    text: "Summarize insights from all quarterly reports",
    pdfFiles: [
      "q1-report.pdf",
      "q2-report.pdf",
      "q3-report.pdf",
      "q4-report.pdf",
    ],
  },
  provider: "vertex",
});
```

### 3. Size and Page Limits

Each provider has specific limits:

```typescript
// Example: Checking file size before upload
import { stat } from "fs/promises";

const fileStats = await stat("large-document.pdf");
const sizeMB = fileStats.size / (1024 * 1024);

if (sizeMB > 5) {
  // Use Google AI Studio for large files
  provider = "google-ai-studio"; // Supports up to 2GB
} else {
  // Use Vertex AI for normal files
  provider = "vertex"; // Up to 5MB
}
```

### 4. Mixed Multimodal Inputs

Combine PDFs with other file types:

```typescript
// PDF + CSV analysis
await neurolink.generate({
  input: {
    text: "Compare the PDF report with the CSV data. Are there any discrepancies?",
    pdfFiles: ["report.pdf"],
    csvFiles: ["raw-data.csv"],
  },
  provider: "vertex",
});

// PDF + Image verification
await neurolink.generate({
  input: {
    text: "Does the chart in the image match the data in the PDF report?",
    pdfFiles: ["report.pdf"],
    images: ["chart.png"],
  },
  provider: "vertex",
});

// All three types
await neurolink.generate({
  input: {
    text: "Analyze the PDF document, compare with CSV data, and verify against the screenshot",
    files: ["document.pdf", "data.csv", "screenshot.png"],
  },
  provider: "vertex",
});
```

## Best Practices

### 1. Choose the Right Provider

```typescript
// For detailed document analysis
provider: "anthropic"; // Claude excels at understanding complex documents

// For large files (>5MB)
provider: "google-ai-studio"; // Supports up to 2GB

// For general use with good balance
provider: "vertex"; // Gemini 1.5 Pro recommended

// For enterprise/on-premises
provider: "bedrock"; // AWS infrastructure
```

### 2. Optimize File Size

```typescript
// Check file size before processing
import { stat } from "fs/promises";

async function validatePDF(filePath: string, provider: string) {
  const stats = await stat(filePath);
  const sizeMB = stats.size / (1024 * 1024);

  const limits = {
    vertex: 5,
    anthropic: 5,
    bedrock: 5,
    "google-ai-studio": 2000,
  };

  if (sizeMB > limits[provider]) {
    throw new Error(
      `File ${filePath} (${sizeMB.toFixed(2)}MB) exceeds ${limits[provider]}MB limit for ${provider}`,
    );
  }

  console.log(`✓ File validated: ${sizeMB.toFixed(2)}MB`);
}

await validatePDF("report.pdf", "vertex");
```

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await neurolink.generate({
    input: {
      text: "Analyze this PDF",
      pdfFiles: ["document.pdf"],
    },
    provider: "vertex",
  });
} catch (error) {
  if (error.message.includes("not currently supported")) {
    console.error("PDF not supported by this provider. Try: --provider vertex");
  } else if (error.message.includes("exceeds")) {
    console.error("File too large. Try: --provider google-ai-studio");
  } else if (error.message.includes("Invalid PDF")) {
    console.error("File is not a valid PDF format");
  } else {
    console.error("Error:", error.message);
  }
}
```

### 4. Use Streaming for Large Documents

```typescript
// For long documents, use streaming to get results faster
const stream = await neurolink.stream({
  input: {
    text: "Provide a detailed analysis of this 50-page report",
    pdfFiles: ["long-report.pdf"],
  },
  provider: "vertex",
  maxTokens: 8000,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

### 5. Be Specific in Your Prompts

```typescript
// ❌ Too vague
"Tell me about this PDF";

// ✅ Specific and actionable
"Extract all monetary values from this invoice and sum them up";
"List all action items mentioned in this meeting notes PDF";
"Compare the Q1 and Q2 revenue figures from these financial reports";
"Find any mentions of security vulnerabilities in this audit report";
```

## Limitations

### File Format Requirements

- **Must** be valid PDF files (starting with `%PDF-` magic bytes)
- **Must** be within provider size limits (5MB for most, 2GB for AI Studio)
- **Must** have valid PDF structure (not corrupted)

### Provider Limitations

```typescript
// ❌ Will fail with unsupported providers
await neurolink.generate({
  input: {
    text: "Analyze this PDF",
    pdfFiles: ["doc.pdf"],
  },
  provider: "azure-openai", // Not supported
});

// ✅ Use supported providers
await neurolink.generate({
  input: {
    text: "Analyze this PDF",
    pdfFiles: ["doc.pdf"],
  },
  provider: "openai", // Supported (GPT-4o, GPT-4o-mini, o1)
});
```

### Page Limits

All providers limit PDF to **100 pages maximum**:

```typescript
// Warning logged for large documents
// [PDF] PDF appears to have 150+ pages. vertex supports up to 100 pages.
```

### Token Usage

PDFs consume significant tokens:

- **Text-only mode**: ~1,000 tokens per 3 pages
- **Visual mode**: ~7,000 tokens per 3 pages

**Tip:** Set appropriate `maxTokens` for PDF analysis:

```typescript
await neurolink.generate({
  input: {
    text: "Summarize this 10-page document",
    pdfFiles: ["document.pdf"],
  },
  provider: "vertex",
  maxTokens: 4000, // ~3,000 tokens for PDF + 1,000 for response
});
```

## Troubleshooting

### Error: "PDF files are not currently supported"

**Problem:** Using unsupported provider (Azure OpenAI, Ollama, etc.)

**Solution:**

```bash
# Change provider to supported one
neurolink generate "Analyze PDF" --pdf doc.pdf --provider vertex

# Or use auto-detection with correct provider
neurolink generate "Analyze PDF" --file doc.pdf --provider anthropic
```

### Error: "PDF size exceeds limit"

**Problem:** File too large for provider (>5MB for most providers)

**Solution:**

```bash
# Switch to Google AI Studio (2GB limit)
neurolink generate "Analyze PDF" --pdf large-doc.pdf --provider google-ai-studio

# Or compress PDF externally before upload
```

### Error: "Invalid PDF file format"

**Problem:** File is not a valid PDF or corrupted

**Solution:**

```bash
# Verify file is valid PDF
file document.pdf  # Should show "PDF document"

# Check magic bytes
head -c 5 document.pdf  # Should show "%PDF-"

# Try re-saving or repairing PDF
```

### Error: "Provider not specified"

**Problem:** No provider selected (PDF requires explicit provider)

**Solution:**

```typescript
// ❌ Missing provider
await neurolink.generate({
  input: {
    text: "Analyze",
    pdfFiles: ["doc.pdf"],
  },
});

// ✅ Specify provider
await neurolink.generate({
  input: {
    text: "Analyze",
    pdfFiles: ["doc.pdf"],
  },
  provider: "vertex",
});
```

### PDF Content Not Being Analyzed

**Problem:** AI says "I cannot read the PDF" even though file is attached

**Common Causes:**

1. **Wrong provider**: Make sure using supported provider
2. **File path wrong**: Verify file exists at specified path
3. **Buffer issue**: If using Buffer, ensure it's valid PDF data

**Debug:**

```typescript
import { readFile, stat } from "fs/promises";

// Verify file exists
await stat("document.pdf"); // Throws if not found

// Verify it's a valid PDF
const buffer = await readFile("document.pdf");
const header = buffer.toString("utf-8", 0, 5);
console.log("PDF header:", header); // Should be "%PDF-"

// Check size
const sizeMB = buffer.length / (1024 * 1024);
console.log("Size:", sizeMB.toFixed(2), "MB");
```

## Advanced Usage

### Custom Provider Configurations

```typescript
// AWS Bedrock with Converse API
await neurolink.generate({
  input: {
    text: "Analyze with citations",
    pdfFiles: ["document.pdf"],
  },
  provider: "bedrock",
  model: "anthropic.claude-3-sonnet-20240229-v1:0",
  // Bedrock automatically enables citations for visual PDF analysis
});
```

### Combining Multiple File Types

```typescript
// Real-world example: Financial analysis
await neurolink.generate({
  input: {
    text: `
      1. Review the PDF financial report for Q3 results
      2. Compare with the raw transaction data in the CSV
      3. Verify the summary chart matches the data
      4. Highlight any discrepancies
    `,
    pdfFiles: ["q3-financial-report.pdf"],
    csvFiles: ["q3-transactions.csv"],
    images: ["q3-summary-chart.png"],
  },
  provider: "vertex",
  maxTokens: 8000,
});
```

### Batch Processing Multiple PDFs

```typescript
// Process multiple invoices
const invoices = [
  "invoice-001.pdf",
  "invoice-002.pdf",
  "invoice-003.pdf",
  // ... more files
];

for (const invoice of invoices) {
  const result = await neurolink.generate({
    input: {
      text: "Extract: invoice number, date, total amount, vendor name",
      pdfFiles: [invoice],
    },
    provider: "anthropic",
  });

  console.log(`${invoice}:`, result.content);
}
```

### Using with AI Tools

```typescript
// PDF analysis with tool use
await neurolink.generate({
  input: {
    text: "Analyze this invoice and save the data",
    pdfFiles: ["invoice.pdf"],
  },
  provider: "vertex",
  tools: {
    saveInvoiceData: {
      description: "Save extracted invoice data",
      parameters: {
        type: "object",
        properties: {
          invoiceNumber: { type: "string" },
          date: { type: "string" },
          amount: { type: "number" },
          vendor: { type: "string" },
        },
      },
      execute: async (params) => {
        // Save to database
        await db.invoices.insert(params);
        return "Saved successfully";
      },
    },
  },
});
```

## Examples

See `examples/pdf-analysis.ts` for complete working examples:

- Basic PDF analysis
- Multiple PDF comparison
- Mixed file type analysis (PDF + CSV)
- Provider-specific features
- Error handling patterns

## Related Features

- [Multimodal Chat](./multimodal-chat.md) - Overview of multimodal capabilities
- [Office Documents](./office-documents.md) - DOCX, PPTX, XLSX processing
- [CSV Support](./csv-support.md) - CSV file processing
- [Image Support](./multimodal-chat.md#images) - Image analysis

## Technical Details

### PDF Processing Flow

```
1. User provides PDF file(s)
   ↓
2. FileDetector validates format (magic bytes)
   ↓
3. PDFProcessor checks provider support
   ↓
4. Validate size/page limits
   ↓
5. Pass Buffer to messageBuilder
   ↓
6. Format as Vercel AI SDK file type
   ↓
7. Send to provider's native PDF API
   ↓
8. Provider processes PDF visually
   ↓
9. Return AI response
```

### Implementation Files

- **`src/lib/utils/pdfProcessor.ts`** - PDF validation and processing
- **`src/lib/utils/fileDetector.ts`** - File type detection
- **`src/lib/utils/messageBuilder.ts`** - Multimodal message construction
- **`src/lib/types/fileTypes.ts`** - PDF type definitions
- **`src/cli/factories/commandFactory.ts`** - CLI `--pdf` flag handling

### Type Definitions

```typescript
// PDF Processor Options
type PDFProcessorOptions = {
  provider?: string;
  bedrockApiMode?: "converse" | "invoke";
};

// PDF Provider Configuration
type PDFProviderConfig = {
  maxSizeMB: number;
  maxPages: number;
  supportsNative: boolean;
  requiresCitations: boolean | "auto";
  apiType: "document" | "files-api" | "unsupported";
};

// File Processing Result
type FileProcessingResult = {
  type: "pdf";
  content: Buffer;
  mimeType: "application/pdf";
  metadata: {
    confidence: number;
    size: number;
    version: string;
    estimatedPages: number | null;
    provider: string;
    apiType: string;
  };
};
```

## Performance Considerations

### Token Usage

- **10-page PDF**: ~3,000-23,000 tokens (depending on visual mode)
- **Set maxTokens appropriately**: PDF tokens + expected response tokens
- **Monitor costs**: PDFs use more tokens than text inputs

### Processing Speed

- **Small PDFs (<1MB)**: ~2-5 seconds
- **Large PDFs (>5MB)**: ~5-15 seconds
- **Use streaming**: Get results faster for long responses

### Memory Usage

- PDFs loaded as Buffers in memory
- Large files (>100MB) may impact performance
- Consider processing large files in chunks if possible

## Future Enhancements

Planned features for PDF support:

- **OCR Integration**: Extract text from scanned PDFs
- **Page Selection**: Analyze specific pages only
- **PDF Generation**: Create PDFs from AI responses
- **Form Filling**: Extract and populate PDF forms

## Feedback and Support

Found a bug or have a feature request? Please:

1. Check existing issues on GitHub
2. Create a new issue with:
   - Provider used
   - PDF file details (size, pages)
   - Error message or unexpected behavior
   - Sample code (if possible)

## Changelog

### Version 9.2.0 (Current)

- ✅ Initial PDF support for Vertex AI, Anthropic, Bedrock, AI Studio
- ✅ Auto-detection via `--file` flag
- ✅ Multiple PDF processing
- ✅ Size and page limit validation
- ✅ Comprehensive error messages
- ✅ CLI and SDK integration
- ✅ Streaming support
- ✅ Mixed multimodal inputs (PDF + CSV + images)

---

**Next:** [Multimodal Chat Guide](./multimodal-chat.md) | [CSV Support](./csv-support.md)
