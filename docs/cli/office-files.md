# Office Document Support

NeuroLink provides seamless support for Microsoft Office documents (DOCX, PPTX, XLSX) as **multimodal input types** - attach Word documents, PowerPoint presentations, and Excel spreadsheets directly to your AI prompts for document analysis, data extraction, and content processing.

## Overview

Office document support in NeuroLink works like other multimodal inputs (images, PDFs, CSVs). The system:

1. **Validates** office files using magic byte detection and format verification
2. **Extracts** text content from documents while preserving structure
3. **Processes** content into LLM-optimized text format
4. **Injects** formatted content into your prompt text
5. **Works** with ALL AI providers (not limited to specific models)

## Quick Start

### CLI Usage

```bash
# Analyze a Word document
npx @juspay/neurolink generate "Summarize this document" \
  --docx ./report.docx

# Analyze a PowerPoint presentation
npx @juspay/neurolink generate "Extract key points from this presentation" \
  --pptx ./slides.pptx

# Analyze an Excel spreadsheet
npx @juspay/neurolink generate "What are the trends in this data?" \
  --xlsx ./financials.xlsx

# Multiple office files
npx @juspay/neurolink generate "Compare these documents" \
  --docx ./report-v1.docx \
  --docx ./report-v2.docx

# Mix different office file types
npx @juspay/neurolink generate "Summarize the report and verify against the spreadsheet" \
  --docx ./report.docx \
  --xlsx ./data.xlsx
```

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Basic Word document analysis
const result = await neurolink.generate({
  input: {
    text: "Summarize the key points of this document",
    docxFiles: ["./report.docx"],
  },
});

// PowerPoint presentation analysis
const presentation = await neurolink.generate({
  input: {
    text: "Extract the main topics from each slide",
    pptxFiles: ["./presentation.pptx"],
  },
});

// Excel spreadsheet analysis
const spreadsheet = await neurolink.generate({
  input: {
    text: "Analyze the financial data and identify trends",
    xlsxFiles: ["./financials.xlsx"],
  },
});

// Multiple office files
const comparison = await neurolink.generate({
  input: {
    text: "Compare these two versions of the report",
    docxFiles: ["./report-v1.docx", "./report-v2.docx"],
  },
});
```

## CLI Flags Reference

### `--docx` / `-d`

Attach Word document (.docx) files for analysis.

```bash
# Single file
npx @juspay/neurolink generate "Summarize this" --docx report.docx

# Multiple files
npx @juspay/neurolink generate "Compare these" --docx v1.docx --docx v2.docx

# With other options
npx @juspay/neurolink generate "Summarize" \
  --docx report.docx \
  --provider openai \
  --model gpt-4o \
  --enableAnalytics
```

**Supported file types:**
- `.docx` - Microsoft Word 2007+ documents
- `.doc` files are not supported (use `.docx` format)

### `--pptx` / `-p`

Attach PowerPoint presentation (.pptx) files for analysis.

```bash
# Single presentation
npx @juspay/neurolink generate "Extract key points" --pptx slides.pptx

# Multiple presentations
npx @juspay/neurolink generate "Compare presentations" \
  --pptx q1-review.pptx \
  --pptx q2-review.pptx

# Stream mode
npx @juspay/neurolink stream "Explain each slide" --pptx presentation.pptx
```

**Supported file types:**
- `.pptx` - Microsoft PowerPoint 2007+ presentations
- `.ppt` files are not supported (use `.pptx` format)

### `--xlsx` / `-x`

Attach Excel spreadsheet (.xlsx) files for analysis.

```bash
# Single spreadsheet
npx @juspay/neurolink generate "Analyze this data" --xlsx data.xlsx

# Multiple spreadsheets
npx @juspay/neurolink generate "Compare Q1 vs Q2" \
  --xlsx q1-data.xlsx \
  --xlsx q2-data.xlsx

# With provider selection
npx @juspay/neurolink generate "Find trends" \
  --xlsx financials.xlsx \
  --provider google-ai
```

**Supported file types:**
- `.xlsx` - Microsoft Excel 2007+ spreadsheets
- `.xls` files are not supported (use `.xlsx` format)

## Mixed File Usage

Office documents can be combined with other file types for comprehensive analysis:

### Office + Images

```bash
# Verify presentation matches diagram
npx @juspay/neurolink generate "Does the diagram match the presentation content?" \
  --pptx architecture.pptx \
  --image diagram.png
```

### Office + PDFs

```bash
# Compare Word document with PDF
npx @juspay/neurolink generate "Compare the draft and final versions" \
  --docx draft.docx \
  --pdf final.pdf
```

### Office + CSV

```bash
# Verify report against raw data
npx @juspay/neurolink generate "Verify the report figures match the raw data" \
  --docx report.docx \
  --csv raw-data.csv
```

### Multiple Office Types

```bash
# Comprehensive project analysis
npx @juspay/neurolink generate "Summarize the project status from all documents" \
  --docx project-report.docx \
  --pptx status-presentation.pptx \
  --xlsx budget-tracking.xlsx
```

### SDK Mixed Usage

```typescript
// Combine office files with other multimodal inputs
const result = await neurolink.generate({
  input: {
    text: "Analyze all project materials and provide a summary",
    docxFiles: ["./report.docx"],
    pptxFiles: ["./presentation.pptx"],
    xlsxFiles: ["./budget.xlsx"],
    images: ["./chart.png"],
    pdfFiles: ["./contract.pdf"],
  },
});
```

## Loop Mode Support

Office files work seamlessly in loop mode for interactive sessions:

```bash
# Start loop session
npx @juspay/neurolink loop --enable-conversation-memory

# Inside loop:
> generate Summarize this report --docx quarterly-report.docx
> generate What were the key financials? --xlsx financials.xlsx
> generate Create a presentation outline based on the data
```

## Common Use Cases

### Document Summarization

```bash
npx @juspay/neurolink generate "
Provide a comprehensive summary including:
1. Main topics covered
2. Key decisions or recommendations
3. Action items mentioned
4. Important dates or deadlines
" --docx meeting-notes.docx
```

### Presentation Analysis

```bash
npx @juspay/neurolink generate "
For each slide, extract:
1. The main topic
2. Key bullet points
3. Any data or statistics mentioned
" --pptx quarterly-review.pptx
```

### Spreadsheet Analysis

```bash
npx @juspay/neurolink generate "
Analyze this financial data:
1. Calculate total revenue
2. Identify top 5 customers
3. Show month-over-month trends
4. Flag any anomalies
" --xlsx sales-data.xlsx
```

### Document Comparison

```bash
npx @juspay/neurolink generate "
Compare these two versions of the document:
1. What sections changed?
2. What was added or removed?
3. Summarize the key differences
" --docx contract-v1.docx --docx contract-v2.docx
```

### Cross-Document Verification

```bash
npx @juspay/neurolink generate "
Verify consistency across documents:
1. Do the numbers in the report match the spreadsheet?
2. Are there any discrepancies?
3. Highlight any mismatches
" --docx annual-report.docx --xlsx financial-data.xlsx
```

## Error Messages

### File Not Found

```
Error: Office document not found: ./missing-file.docx
  Verify the file path is correct (relative or absolute)
  Current directory: /path/to/project
```

**Solution:** Check that the file exists at the specified path.

### Invalid File Format

```
Error: Invalid DOCX file format: ./corrupted.docx
  The file does not appear to be a valid Word document.
  Ensure it's a .docx file (not .doc or another format).
```

**Solution:** Ensure the file is a valid `.docx` format. Use Microsoft Word or another tool to re-save the file.

### Unsupported Format

```
Error: Unsupported office document format: ./legacy.doc
  Legacy .doc format is not supported.
  Please convert to .docx format using Microsoft Word or LibreOffice.
```

**Solution:** Convert legacy `.doc`, `.ppt`, or `.xls` files to modern `.docx`, `.pptx`, or `.xlsx` formats.

### File Too Large

```
Error: Office document exceeds size limit: ./huge-file.xlsx (50MB)
  Maximum supported file size: 25MB
  Consider splitting the file or reducing content.
```

**Solution:** Reduce file size by removing unnecessary content, compressing images, or splitting into multiple files.

### Password Protected

```
Error: Password-protected document: ./secure.docx
  Password-protected office documents are not supported.
  Remove password protection to process the file.
```

**Solution:** Remove password protection from the document before processing.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "File not found" | Incorrect path | Use absolute path or verify relative path from current directory |
| "Invalid format" | Corrupted file | Re-save file in proper format |
| "Not supported" | Legacy format (.doc, .ppt, .xls) | Convert to modern format (.docx, .pptx, .xlsx) |
| "File too large" | Exceeds size limit | Reduce file size or split content |
| "Empty content" | No extractable text | Ensure document contains text content |
| "Permission denied" | File access issue | Check file permissions |

### Debug Mode

Use debug mode to see detailed processing information:

```bash
npx @juspay/neurolink generate "Analyze this" \
  --docx report.docx \
  --debug
```

Debug output includes:
- File detection results
- Content extraction progress
- Provider processing information
- Token usage details

## Best Practices

### 1. Use Modern Formats

Always use modern Office formats (`.docx`, `.pptx`, `.xlsx`) for best compatibility:

```bash
# ✅ Good - Modern format
--docx report.docx

# ❌ Avoid - Legacy format (not supported)
--docx report.doc
```

### 2. Keep Files Reasonable Size

For best results, keep office files under 10MB:

```bash
# Large files may take longer to process
npx @juspay/neurolink generate "Summarize" \
  --docx large-report.docx \
  --timeout 180  # Increase timeout for large files
```

### 3. Be Specific in Prompts

Provide clear, specific instructions for better results:

```bash
# ❌ Vague
npx @juspay/neurolink generate "Tell me about this" --docx doc.docx

# ✅ Specific
npx @juspay/neurolink generate "
Extract all action items from this meeting notes document.
Format as a numbered list with assignee and deadline.
" --docx meeting-notes.docx
```

### 4. Combine With Analytics

Enable analytics to track token usage and costs:

```bash
npx @juspay/neurolink generate "Analyze document" \
  --docx report.docx \
  --enableAnalytics \
  --debug
```

### 5. Use Streaming for Long Documents

For documents that may generate long responses, use streaming:

```bash
npx @juspay/neurolink stream "Provide detailed analysis" \
  --docx comprehensive-report.docx
```

## Provider Compatibility

Office document processing works with all AI providers:

| Provider | DOCX | PPTX | XLSX | Notes |
|----------|------|------|------|-------|
| OpenAI | ✅ | ✅ | ✅ | All GPT-4 models |
| Anthropic | ✅ | ✅ | ✅ | Claude 3.x models |
| Google AI | ✅ | ✅ | ✅ | Gemini models |
| Vertex AI | ✅ | ✅ | ✅ | Gemini models |
| AWS Bedrock | ✅ | ✅ | ✅ | Claude and other models |
| Azure OpenAI | ✅ | ✅ | ✅ | All deployed models |
| Ollama | ✅ | ✅ | ✅ | Local models |
| Mistral | ✅ | ✅ | ✅ | Mistral models |
| LiteLLM | ✅ | ✅ | ✅ | Depends on upstream |

## Help Text

View built-in help for office document options:

```bash
npx @juspay/neurolink generate --help
```

Output includes:
```
Options:
  --docx, -d     Add Word document (.docx) for analysis
                 (can be used multiple times)              [string]
  --pptx, -p     Add PowerPoint presentation (.pptx) for analysis
                 (can be used multiple times)              [string]
  --xlsx, -x     Add Excel spreadsheet (.xlsx) for analysis
                 (can be used multiple times)              [string]
```

## Related Features

- [Multimodal Chat](../features/multimodal-chat.md) - Overview of multimodal capabilities
- [PDF Support](../features/pdf-support.md) - PDF document processing
- [CSV Support](../features/csv-support.md) - CSV file processing
- [CLI Commands](commands.md) - Complete CLI reference
- [SDK API Reference](../sdk/api-reference.md) - TypeScript API equivalents

## Technical Details

### Processing Flow

```
1. User provides office file(s)
   ↓
2. FileDetector validates format (magic bytes)
   ↓
3. OfficeProcessor extracts content
   ↓
4. Text content formatted for LLM
   ↓
5. Pass to messageBuilder
   ↓
6. Format as prompt content
   ↓
7. Send to AI provider
   ↓
8. Return AI response
```

### Supported Content Extraction

**DOCX (Word):**
- Paragraphs and text content
- Headings and structure
- Tables (converted to text)
- Lists and formatting

**PPTX (PowerPoint):**
- Slide titles
- Text content from each slide
- Speaker notes
- Tables and bullet points

**XLSX (Excel):**
- Cell values
- Multiple sheets
- Formulas (evaluated values)
- Data tables

## Summary

- Office document support includes **DOCX**, **PPTX**, and **XLSX** files
- Use `--docx`, `--pptx`, `--xlsx` CLI flags (with aliases `-d`, `-p`, `-x`)
- SDK uses `docxFiles`, `pptxFiles`, `xlsxFiles` arrays
- Works with **ALL AI providers**
- Supports multiple files and mixed file types
- Full support in `generate`, `stream`, and `loop` commands
- Use modern Office formats (2007+) for best compatibility
