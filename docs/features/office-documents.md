---
title: "Office Documents Support"
description: Attach DOCX, PPTX, and XLSX documents directly to AI prompts for document analysis, data extraction, and content processing
keywords:
  [
    office-documents,
    docx,
    pptx,
    xlsx,
    word,
    powerpoint,
    excel,
    multimodal,
    document-processing,
  ]
---

# Office Documents Support

NeuroLink provides seamless Office document support as a **multimodal input type** - attach DOCX, PPTX, and XLSX documents directly to your AI prompts for document analysis, data extraction, and content processing.

## Overview

Office document support in NeuroLink works as a native multimodal input - the system automatically processes Office files and passes them to the AI provider's document understanding capabilities. The system:

1. **Validates** Office files using magic byte detection and format verification
2. **Checks** provider compatibility (Bedrock, Vertex AI, Anthropic)
3. **Verifies** file size limits per provider
4. **Passes** documents directly to the provider's native document API
5. **Works** with providers that support native Office document processing

**Key Difference from PDF:** Similar to PDF files, Office documents are sent as binary documents to providers with native document support. This enables analysis of formatted text, tables, charts, and embedded content within Office files.

## Supported File Types

| Format                | Extension | MIME Type                                                                   | Description                                        |
| --------------------- | --------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| **Word Document**     | `.docx`   | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`   | Microsoft Word documents with text, images, tables |
| **PowerPoint**        | `.pptx`   | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | Presentations with slides, charts, images          |
| **Excel Spreadsheet** | `.xlsx`   | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`         | Spreadsheets with data, formulas, charts           |

**Legacy Formats:**

| Format         | Extension | MIME Type                  | Support            |
| -------------- | --------- | -------------------------- | ------------------ |
| Word (Legacy)  | `.doc`    | `application/msword`       | Provider-dependent |
| Excel (Legacy) | `.xls`    | `application/vnd.ms-excel` | Provider-dependent |

## Quick Start

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Basic Word document analysis
const result = await neurolink.generate({
  input: {
    text: "Summarize the key points from this document",
    officeFiles: ["report.docx"],
  },
  provider: "bedrock",
});

// PowerPoint presentation analysis
const presentation = await neurolink.generate({
  input: {
    text: "Extract the main topics from each slide in this presentation",
    officeFiles: ["quarterly-review.pptx"],
  },
  provider: "bedrock",
});

// Excel spreadsheet analysis
const spreadsheet = await neurolink.generate({
  input: {
    text: "What are the top 5 products by revenue in this spreadsheet?",
    officeFiles: ["sales-data.xlsx"],
  },
  provider: "bedrock",
});

// Multiple document comparison
const comparison = await neurolink.generate({
  input: {
    text: "Compare the revenue figures between Q1 and Q2 reports",
    officeFiles: ["q1-report.docx", "q2-report.docx"],
  },
  provider: "bedrock",
});

// Auto-detect file types (mix Office, PDF, CSV, and images)
const multimodal = await neurolink.generate({
  input: {
    text: "Analyze all documents and provide a comprehensive summary",
    files: ["report.docx", "data.xlsx", "chart.png", "notes.pdf"],
  },
  provider: "bedrock",
});

// Streaming with Office documents
const stream = await neurolink.stream({
  input: {
    text: "Provide a detailed analysis of this contract document",
    officeFiles: ["contract.docx"],
  },
  provider: "bedrock",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

### CLI Usage

```bash
# Attach Office files to your prompt
neurolink generate "Summarize this document" --office report.docx --provider bedrock

# Multiple Office files
neurolink generate "Compare these reports" --office q1.docx --office q2.docx --provider bedrock

# Excel spreadsheet analysis
neurolink generate "Analyze sales trends" --office sales.xlsx --provider bedrock

# PowerPoint presentation
neurolink generate "Extract key points from slides" --office presentation.pptx --provider bedrock

# Auto-detect file types
neurolink generate "Analyze all documents" --file report.docx --file data.xlsx --provider bedrock

# Stream mode with Office documents
neurolink stream "Explain this document in detail" --office document.docx --provider bedrock

# Batch processing with Office documents
echo "Summarize the key points" > prompts.txt
echo "Extract action items" >> prompts.txt
neurolink batch prompts.txt --office meeting-notes.docx --provider bedrock
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
    officeFiles?: Array<Buffer | string>; // Office files (native binary)
    files?: Array<Buffer | string>; // Auto-detect file types
  };

  // Provider selection (REQUIRED for Office files)
  provider: "bedrock" | "vertex" | "anthropic";

  // Office processing options
  officeOptions?: OfficeProcessorOptions;

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
    officeFiles?: Array<Buffer | string>; // Same as GenerateOptions
    files?: Array<Buffer | string>;
  };

  provider: "bedrock" | "vertex" | "anthropic";
  // ... other options
};
```

### OfficeProcessorOptions

```typescript
type OfficeProcessorOptions = {
  /**
   * Provider to use for document processing
   * @default "bedrock"
   */
  provider?: string;

  /**
   * Maximum file size in MB
   * @default 5 (provider-dependent)
   */
  maxSizeMB?: number;

  /**
   * Whether to extract embedded images
   * @default true
   */
  extractImages?: boolean;

  /**
   * Whether to preserve document structure in output
   * @default true
   */
  preserveStructure?: boolean;
};
```

### File Input Formats

```typescript
// String path (relative or absolute)
officeFiles: ["./documents/report.docx"];
officeFiles: ["/absolute/path/to/data.xlsx"];

// Buffer (from fs.readFile or other source)
import { readFile } from "fs/promises";
const docxBuffer = await readFile("document.docx");
officeFiles: [docxBuffer];

// Mixed types
officeFiles: ["report.docx", docxBuffer, "./presentation.pptx"];
```

## Provider Support

### Supported Providers

| Provider             | Max Size | DOCX | PPTX | XLSX | DOC | XLS | Notes                                |
| -------------------- | -------- | ---- | ---- | ---- | --- | --- | ------------------------------------ |
| **AWS Bedrock**      | 5 MB     | ✅   | ✅   | ✅   | ✅  | ✅  | Full native support via Converse API |
| **Google Vertex AI** | 5 MB     | ✅   | ⚠️   | ✅   | ⚠️  | ⚠️  | Best for DOCX and XLSX               |
| **Anthropic Claude** | 5 MB     | ✅   | ⚠️   | ✅   | ⚠️  | ⚠️  | Via document API                     |

### Unsupported Providers

The following providers **do not currently support** native Office document processing:

- OpenAI (GPT-4o)
- Google AI Studio
- Azure OpenAI
- Ollama (local models)
- LiteLLM
- Mistral AI
- Hugging Face

**Error Message for Unsupported Providers:**

```
Office files are not currently supported with openai provider.
Supported providers: AWS Bedrock, Google Vertex AI, Anthropic
Current provider: openai

Options:
1. Switch to a supported provider (--provider bedrock or --provider vertex)
2. Convert your Office document to PDF first
3. Extract text content manually before processing
```

### Provider-Specific Features

#### AWS Bedrock (Recommended)

Bedrock offers the most comprehensive Office document support via the Converse API:

```typescript
await neurolink.generate({
  input: {
    text: "Analyze this quarterly report",
    officeFiles: ["q3-report.docx"],
  },
  provider: "bedrock",
  model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
});
```

**Supported Document Formats in Bedrock Converse API:**

- Office formats: `doc`, `docx`, `xls`, `xlsx`
- Other formats: `pdf`, `csv`, `html`, `txt`, `md`

#### Google Vertex AI

```typescript
await neurolink.generate({
  input: {
    text: "Extract key metrics from this spreadsheet",
    officeFiles: ["financial-data.xlsx"],
  },
  provider: "vertex",
  model: "gemini-1.5-pro",
});
```

#### Anthropic Claude

```typescript
await neurolink.generate({
  input: {
    text: "Summarize this contract document",
    officeFiles: ["contract.docx"],
  },
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
});
```

## Features

### 1. Auto-Detection

Use the `files` array for automatic file type detection:

```typescript
// Automatically detects Office, PDF, CSV, and image types
await neurolink.generate({
  input: {
    text: "Analyze all these documents",
    files: [
      "report.docx", // Auto-detected as Word document
      "data.xlsx", // Auto-detected as Excel spreadsheet
      "slides.pptx", // Auto-detected as PowerPoint
      "summary.pdf", // Auto-detected as PDF
      "chart.png", // Auto-detected as image
    ],
  },
  provider: "bedrock",
});
```

### 2. Multiple Document Types

Process multiple Office documents in a single request:

```typescript
// Compare documents
await neurolink.generate({
  input: {
    text: "Compare version 1 and version 2 of the proposal. What changed?",
    officeFiles: ["proposal-v1.docx", "proposal-v2.docx"],
  },
  provider: "bedrock",
});

// Cross-format analysis
await neurolink.generate({
  input: {
    text: "Verify the numbers in the report match the spreadsheet data",
    officeFiles: ["report.docx", "source-data.xlsx"],
  },
  provider: "bedrock",
});
```

### 3. Mixed Multimodal Inputs

Combine Office documents with other file types:

```typescript
// Office + CSV analysis
await neurolink.generate({
  input: {
    text: "Compare the report summary with the raw data",
    officeFiles: ["summary-report.docx"],
    csvFiles: ["raw-data.csv"],
  },
  provider: "bedrock",
});

// Office + PDF + Image verification
await neurolink.generate({
  input: {
    text: "Verify consistency across all documents",
    officeFiles: ["report.docx"],
    pdfFiles: ["signed-contract.pdf"],
    images: ["org-chart.png"],
  },
  provider: "bedrock",
});
```

## Type Definitions

### OfficeFileType

```typescript
/**
 * Supported Office document types
 */
type OfficeFileType = "docx" | "pptx" | "xlsx" | "doc" | "xls";
```

### OfficeProcessingResult

```typescript
/**
 * Result of Office document processing
 */
type OfficeProcessingResult = {
  type: "office";
  content: Buffer;
  mimeType: string;
  metadata: {
    confidence: number;
    size: number;
    filename?: string;
    format: OfficeFileType;
    provider: string;
    estimatedPages?: number;
    hasEmbeddedImages?: boolean;
    hasCharts?: boolean;
  };
};
```

### OfficeProviderConfig

```typescript
/**
 * Provider configuration for Office document support
 */
type OfficeProviderConfig = {
  maxSizeMB: number;
  supportedFormats: OfficeFileType[];
  supportsNative: boolean;
  apiType: "document" | "converse" | "unsupported";
};
```

## Error Handling

### Error Types

```typescript
class OfficeProcessingError extends Error {
  file: string;
  format?: string;
  provider?: string;
  originalError?: Error;
}

class OfficeValidationError extends OfficeProcessingError {
  // Thrown when file format validation fails
  validationType: "format" | "size" | "corruption";
}

class OfficeProviderError extends OfficeProcessingError {
  // Thrown when provider doesn't support Office documents
  supportedProviders: string[];
}

class OfficeSizeError extends OfficeProcessingError {
  // Thrown when file exceeds size limits
  maxSize: number;
  actualSize: number;
}
```

### Error Handling Patterns

```typescript
import {
  OfficeProcessingError,
  OfficeValidationError,
  OfficeProviderError,
  OfficeSizeError,
} from "@juspay/neurolink";

try {
  const result = await neurolink.generate({
    input: {
      text: "Analyze this document",
      officeFiles: ["document.docx"],
    },
    provider: "bedrock",
  });
} catch (error) {
  if (error instanceof OfficeSizeError) {
    console.error(
      `File too large: ${error.actualSize}MB (max: ${error.maxSize}MB)`,
    );
    console.error("Try: --provider google-ai-studio for larger files");
  } else if (error instanceof OfficeProviderError) {
    console.error(`Provider ${error.provider} doesn't support Office files`);
    console.error(
      `Supported providers: ${error.supportedProviders.join(", ")}`,
    );
  } else if (error instanceof OfficeValidationError) {
    console.error(`Invalid Office file: ${error.message}`);
    console.error(`Validation type: ${error.validationType}`);
  } else if (error instanceof OfficeProcessingError) {
    console.error(`Office processing failed: ${error.message}`);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Metadata Fields

When processing Office documents, the following metadata is available:

| Field               | Type             | Description                      |
| ------------------- | ---------------- | -------------------------------- |
| `confidence`        | `number`         | Detection confidence (0-100)     |
| `size`              | `number`         | File size in bytes               |
| `filename`          | `string`         | Original filename                |
| `format`            | `OfficeFileType` | Detected Office format           |
| `provider`          | `string`         | Provider used for processing     |
| `estimatedPages`    | `number`         | Estimated page/slide/sheet count |
| `hasEmbeddedImages` | `boolean`        | Whether document contains images |
| `hasCharts`         | `boolean`        | Whether document contains charts |

### Accessing Metadata

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze this document",
    officeFiles: ["report.docx"],
  },
  provider: "bedrock",
});

// Metadata available in result
console.log(result.metadata?.officeFiles?.[0]);
// {
//   format: "docx",
//   size: 245760,
//   estimatedPages: 12,
//   hasEmbeddedImages: true,
//   hasCharts: false
// }
```

## Best Practices

### 1. Choose the Right Provider

```typescript
// For comprehensive Office support
provider: "bedrock"; // Best overall Office document support

// For Word documents primarily
provider: "vertex"; // Good DOCX support

// For enterprise deployments
provider: "bedrock"; // AWS infrastructure integration
```

### 2. Optimize File Size

```typescript
// Check file size before processing
import { stat } from "fs/promises";

async function validateOfficeFile(filePath: string, provider: string) {
  const stats = await stat(filePath);
  const sizeMB = stats.size / (1024 * 1024);

  const limits: Record<string, number> = {
    bedrock: 5,
    vertex: 5,
    anthropic: 5,
  };

  if (sizeMB > (limits[provider] || 5)) {
    throw new Error(
      `File ${filePath} (${sizeMB.toFixed(2)}MB) exceeds ${limits[provider]}MB limit for ${provider}`,
    );
  }

  console.log(`✓ File validated: ${sizeMB.toFixed(2)}MB`);
}

await validateOfficeFile("report.docx", "bedrock");
```

### 3. Use Streaming for Large Documents

```typescript
// For long documents, use streaming to get results faster
const stream = await neurolink.stream({
  input: {
    text: "Provide a comprehensive analysis of this 100-page document",
    officeFiles: ["long-report.docx"],
  },
  provider: "bedrock",
  maxTokens: 8000,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

### 4. Be Specific in Your Prompts

```typescript
// ❌ Too vague
"Tell me about this document";

// ✅ Specific and actionable
"Extract all action items with their due dates from this meeting notes document";
"List the top 5 products by revenue from the sales spreadsheet";
"Summarize the key points from each slide in this presentation";
"Compare the financial projections between these two quarterly reports";
```

## Limitations

### File Format Requirements

- **Must** be valid Office Open XML format (`.docx`, `.pptx`, `.xlsx`)
- **Must** be within provider size limits (typically 5MB)
- **Must** not be password-protected or encrypted
- Legacy formats (`.doc`, `.xls`, `.ppt`) have limited support

### Provider Limitations

| Limitation          | Description                 | Workaround                              |
| ------------------- | --------------------------- | --------------------------------------- |
| Size limits         | Most providers limit to 5MB | Split large documents or convert to PDF |
| Password protection | Not supported               | Remove password before processing       |
| Macros              | VBA macros are ignored      | N/A - security feature                  |
| External links      | May not be resolved         | Embed content instead                   |
| Complex formatting  | Some formatting may be lost | Focus on content extraction             |

### Token Usage

Office documents consume significant tokens. The following are approximate estimates that may vary by provider and content complexity:

- **Simple DOCX**: ~500-1,000 tokens per page
- **Complex DOCX** (with images/tables): ~1,500-3,000 tokens per page
- **XLSX**: ~100-500 tokens per sheet (depends on data density)
- **PPTX**: ~200-1,000 tokens per slide

> **Note:** Token estimates are based on typical document content. Actual usage may vary depending on document complexity, provider implementation, and model-specific tokenization.

**Tip:** Set appropriate `maxTokens` for Office document analysis:

```typescript
await neurolink.generate({
  input: {
    text: "Summarize this 20-page document",
    officeFiles: ["document.docx"],
  },
  provider: "bedrock",
  maxTokens: 4000, // Allow enough tokens for response
});
```

## Troubleshooting

### Error: "Office files are not currently supported"

**Problem:** Using unsupported provider (OpenAI, Ollama, etc.)

**Solution:**

```bash
# Change provider to supported one
neurolink generate "Analyze document" --office doc.docx --provider bedrock

# Or use auto-detection with correct provider
neurolink generate "Analyze document" --file doc.docx --provider vertex
```

### Error: "File size exceeds limit"

**Problem:** File too large for provider (>5MB for most providers)

**Solution:**

```bash
# Option 1: Split the document into smaller parts
# Option 2: Convert to PDF first (may have larger size limits)
# Option 3: Extract key sections manually
```

### Error: "Invalid Office file format"

**Problem:** File is not a valid Office Open XML format or corrupted

**Solution:**

```bash
# Verify file is valid Office format
file document.docx  # Should show "Microsoft Word 2007+"

# Check file extension matches actual format
# Ensure file is not password-protected
```

### Error: "Provider not specified"

**Problem:** No provider selected (Office files require explicit provider)

**Solution:**

```typescript
// ❌ Missing provider
await neurolink.generate({
  input: {
    text: "Analyze",
    officeFiles: ["doc.docx"],
  },
});

// ✅ Specify provider
await neurolink.generate({
  input: {
    text: "Analyze",
    officeFiles: ["doc.docx"],
  },
  provider: "bedrock", // Required for Office files
});
```

### Office Content Not Being Analyzed

**Problem:** AI says "I cannot read the document" even though file is attached

**Common Causes:**

1. **Wrong provider**: Make sure using supported provider
2. **File path wrong**: Verify file exists at specified path
3. **Buffer issue**: If using Buffer, ensure it's valid Office data
4. **Format mismatch**: Ensure file extension matches actual format

**Debug:**

```typescript
import { readFile, stat } from "fs/promises";

// Verify file exists
await stat("document.docx"); // Throws if not found

// Verify it's a valid Office file (DOCX is ZIP-based)
const buffer = await readFile("document.docx");
const header = buffer.slice(0, 4);
// DOCX files start with ZIP magic bytes: PK\x03\x04
console.log("Magic bytes:", header.toString("hex")); // Should be "504b0304"

// Check size
const sizeMB = buffer.length / (1024 * 1024);
console.log("Size:", sizeMB.toFixed(2), "MB");
```

## Migration Guide

### Migrating from Manual Document Processing

If you were previously using manual document extraction:

**Before (Manual Processing):**

```typescript
// Old approach: Extract text manually
import { readFileSync } from "fs";
import mammoth from "mammoth";

const docBuffer = readFileSync("report.docx");
const { value: text } = await mammoth.extractRawText({ buffer: docBuffer });

const result = await provider.generate({
  input: { text: `Analyze this document:\n\n${text}` },
});
```

**After (Native Support):**

```typescript
// New approach: Direct document support
const result = await neurolink.generate({
  input: {
    text: "Analyze this document",
    officeFiles: ["report.docx"],
  },
  provider: "bedrock",
});
```

### Migrating from PDF-First Workflow

If you were converting Office files to PDF first:

**Before (PDF Conversion):**

```typescript
// Old approach: Convert to PDF first
import { convertToPdf } from "some-pdf-library";

await convertToPdf("report.docx", "report.pdf");

const result = await neurolink.generate({
  input: {
    text: "Analyze this document",
    pdfFiles: ["report.pdf"],
  },
  provider: "vertex",
});
```

**After (Direct Office Support):**

```typescript
// New approach: Direct Office document support
const result = await neurolink.generate({
  input: {
    text: "Analyze this document",
    officeFiles: ["report.docx"], // No conversion needed
  },
  provider: "bedrock",
});
```

### API Changes Summary

| Previous API               | New API                     | Notes                            |
| -------------------------- | --------------------------- | -------------------------------- |
| Manual text extraction     | `officeFiles: [...]`        | Native document support          |
| PDF conversion workflow    | Direct Office support       | No conversion needed             |
| Provider-specific handling | Unified `officeFiles` array | Works across supported providers |
| Custom MIME type handling  | Auto-detection              | Format automatically detected    |

## Usage Examples

Here are complete working examples for common use cases:

### Basic Word Document Analysis

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: {
    text: "Summarize the key points from this document",
    officeFiles: ["meeting-notes.docx"],
  },
  provider: "bedrock",
});

console.log(result.content);
```

### Excel Spreadsheet Data Extraction

```typescript
const result = await neurolink.generate({
  input: {
    text: "What are the top 5 products by revenue?",
    officeFiles: ["sales-data.xlsx"],
  },
  provider: "bedrock",
});
```

### PowerPoint Presentation Summarization

```typescript
const result = await neurolink.generate({
  input: {
    text: "Create an executive summary of this presentation",
    officeFiles: ["quarterly-review.pptx"],
  },
  provider: "bedrock",
});
```

### Multiple Document Comparison

```typescript
const result = await neurolink.generate({
  input: {
    text: "Compare Q1 and Q2 reports and highlight the key differences",
    officeFiles: ["q1-report.docx", "q2-report.docx"],
  },
  provider: "bedrock",
});
```

### Mixed File Type Analysis

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze all documents and provide a comprehensive summary",
    files: ["report.docx", "data.xlsx", "chart.png", "notes.pdf"],
  },
  provider: "bedrock",
});
```

## Related Features

- [Multimodal Chat](./multimodal-chat.md) - Overview of multimodal capabilities
- [PDF Support](./pdf-support.md) - PDF document processing
- [CSV Support](./csv-support.md) - CSV file processing

## Technical Details

### Office Document Processing Flow

```
1. User provides Office file(s)
   ↓
2. FileDetector validates format (magic bytes for ZIP/Office Open XML)
   ↓
3. OfficeProcessor checks provider support
   ↓
4. Validate size limits
   ↓
5. Pass Buffer to messageBuilder
   ↓
6. Format as provider-specific document type
   ↓
7. Send to provider's native document API
   ↓
8. Provider processes document content
   ↓
9. Return AI response
```

### Implementation Files

- **`src/lib/utils/officeProcessor.ts`** - Office document validation and processing
- **`src/lib/utils/fileDetector.ts`** - File type detection (includes Office formats)
- **`src/lib/utils/messageBuilder.ts`** - Multimodal message construction
- **`src/lib/types/fileTypes.ts`** - Office type definitions
- **`src/cli/factories/commandFactory.ts`** - CLI `--office` flag handling

## Performance Considerations

### Processing Speed

- **Small DOCX (<1MB)**: ~2-5 seconds
- **Large DOCX (>5MB)**: ~5-15 seconds
- **Complex PPTX**: ~5-20 seconds (depends on slide count)
- **Data-heavy XLSX**: ~3-10 seconds

### Memory Usage

- Office files loaded as Buffers in memory
- Large files may impact performance
- Consider processing large files in batches

## Future Enhancements

Planned features for Office document support:

- **OpenAI Support**: Document-to-text conversion for GPT models
- **Azure OpenAI**: Native document support when available
- **Page Selection**: Analyze specific pages/slides/sheets only
- **Content Extraction**: Extract specific elements (tables, charts)
- **Template Processing**: Fill document templates with AI-generated content
- **Legacy Format Support**: Improved `.doc`, `.xls`, `.ppt` support

## Feedback and Support

Found a bug or have a feature request? Please:

1. Check existing issues on GitHub
2. Create a new issue with:
   - Provider used
   - Office file details (format, size)
   - Error message or unexpected behavior
   - Sample code (if possible)

## Changelog

### Version 8.3.0+

- ✅ Initial Office document support for DOCX, PPTX, XLSX
- ✅ AWS Bedrock native support via Converse API
- ✅ Google Vertex AI support
- ✅ Anthropic Claude support
- ✅ Auto-detection via `--file` flag
- ✅ Multiple document processing
- ✅ Size limit validation
- ✅ Comprehensive error messages
- ✅ CLI and SDK integration
- ✅ Streaming support
- ✅ Mixed multimodal inputs (Office + PDF + CSV + images)

---

**Next:** [Multimodal Chat Guide](./multimodal-chat.md) | [PDF Support](./pdf-support.md) | [CSV Support](./csv-support.md)
