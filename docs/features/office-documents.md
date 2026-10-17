---
title: "Office Documents Support"
description: Attach DOCX, PPTX, and XLSX documents to AI prompts with the files array or the --file flag; NeuroLink extracts the text and sends it to any provider
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

NeuroLink reads Word, Excel, and PowerPoint files itself and puts their content into the prompt as text. Attach them through the same `input.files` array (or `--file` flag) that carries every other file type; there is no separate Office input field and no provider restriction.

## Overview

When a request carries an Office file, NeuroLink:

1. **Detects** the format from the file's bytes, MIME type, and extension.
2. **Extracts** the content in-process: Word through `mammoth` (converted to Markdown), Excel through `exceljs`, and PowerPoint by reading the slide XML inside the `.pptx` package.
3. **Appends** the extracted text to the prompt under a heading that names the file (`## Document: "report.docx"`, `## Spreadsheet: "sales.xlsx"`, `## Presentation: "deck.pptx"`).
4. **Sends** an ordinary text prompt to whichever provider you chose.

Because the model receives text, Office files work with every provider and model, including ones with no document API (OpenAI, Ollama, Mistral, and so on). The model sees what the extractors can read: text, tables, and speaker notes. It does not see images, charts, or shapes that carry no text.

## Supported File Types

| Format                | Extension | MIME Type                                                                   | What the model receives                                 |
| --------------------- | --------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Word Document**     | `.docx`   | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`   | Markdown (headings, lists, tables) and a metrics line   |
| **PowerPoint**        | `.pptx`   | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | Text of every slide, table rows, and each slide's notes |
| **Excel Spreadsheet** | `.xlsx`   | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`         | Every sheet (or one you name) in the format you choose  |

The same three routes also carry OpenDocument text, spreadsheet and presentation files (`.odt`, `.ods`, `.odp`) and RTF (`.rtf`), which are read as plain text.

**Legacy binary formats** (`.doc`, `.xls`, `.ppt`) are recognised but not parsed: the readers only understand the Office Open XML packages above. The request still succeeds, and the model receives a short note saying the file was attached but its content could not be extracted. Re-save such files as `.docx`, `.xlsx`, or `.pptx` first.

## Quick Start

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Word document
const summary = await neurolink.generate({
  input: {
    text: "Summarize the key points from this document",
    files: ["report.docx"],
  },
  provider: "openai",
});

// PowerPoint presentation (slide text, tables, and speaker notes)
const slides = await neurolink.generate({
  input: {
    text: "List the main topic of each slide and any speaker-note caveats",
    files: ["quarterly-review.pptx"],
  },
  provider: "anthropic",
});

// Excel spreadsheet
const sheet = await neurolink.generate({
  input: {
    text: "What are the top 5 products by revenue in this spreadsheet?",
    files: ["sales-data.xlsx"],
  },
  provider: "vertex",
});

// Several documents, mixed with other file types
const comparison = await neurolink.generate({
  input: {
    text: "Compare the revenue figures in the report against the spreadsheet",
    files: ["q1-report.docx", "data.xlsx", "chart.png", "notes.pdf"],
  },
  provider: "openai",
});

// Streaming
const result = await neurolink.stream({
  input: {
    text: "Provide a detailed analysis of this contract",
    files: ["contract.docx"],
  },
  provider: "openai",
});

for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

### CLI Usage

```bash
# Attach an Office file
neurolink generate "Summarize this document" --file report.docx --provider openai

# Several files
neurolink generate "Compare these reports" --file q1.docx --file q2.docx --provider openai

# Spreadsheet
neurolink generate "Analyze sales trends" --file sales.xlsx --provider openai

# Presentation
neurolink generate "Extract key points from the slides" --file presentation.pptx --provider openai

# Mixed file types
neurolink generate "Analyze all documents" --file report.docx --file data.xlsx --provider openai

# Stream mode
neurolink stream "Explain this document in detail" --file document.docx --provider openai

# Note: `batch` does NOT accept --file. The flag is deliberately unregistered
# there because it would collide with the prompts-file positional, so Office
# attachments are only available on `generate` and `stream`.
```

The CLI has no flags for `officeOptions`; choosing a sheet or a spreadsheet format is an SDK feature (see below).

## What the Model Receives

### DOCX structure and metrics

A `.docx` is converted to Markdown before it reaches the model, so headings, ordered and unordered lists, and tables survive as structure rather than being flattened into prose. Each document is prefixed with a metrics line:

```
Document: 42 words, 9 paragraphs, 268 characters

# Quarterly Platform Report

## Adoption

- Merchant onboarding automated
- Settlement latency reduced

| Region | Merchants | Volume |
| --- | --- | --- |
| APAC | 128 | 44200 |
```

### PPTX slides, tables, and speaker notes

A `.pptx` is read slide by slide, in slide-number order. Each slide's text comes first, then its speaker notes on a `**Speaker notes:**` line:

```
Presentation: 2 slide(s)

### Slide 1
Q3 Revenue & Growth
Region | Owner | Volume
APAC | Priya & Sam | 44200
EMEA |  | Line one Line two
**Speaker notes:** Mention the RTO improvement & Q3 <plan>.

### Slide 2
Hire two analysts
**Speaker notes:** Ask finance about headcount.
```

- Text boxes and titles come out one text run per line, with XML character references decoded (`&amp;` is shown as `&`, `&lt;` as `<`, `&#169;` as the copyright sign).
- A table row becomes one line with the cells joined by `|`. An empty cell keeps its separator, so the cells of a row can still be counted (`Q3 |  |` has three, `| Open |` has three), and a cell with several paragraphs or line breaks is joined onto the one line with spaces. A row with no text at all is dropped. A literal `|` in cell text is not escaped, so it reads like a separator.
- Speaker notes are always included. There is no option to turn them off.
- A slide with no text and no notes is left out. A deck of nothing but pictures therefore arrives as the `Presentation: N slide(s)` header alone.
- Pictures, charts, SmartArt, and shapes that hold no text contribute nothing.

### Selecting and formatting spreadsheet data

```typescript
// Only the "Transactions" sheet, rendered as a markdown table
await neurolink.generate({
  input: {
    text: "Which transactions were refunded?",
    files: ["workbook.xlsx"],
  },
  provider: "openai",
  officeOptions: { sheetName: "Transactions", formatStyle: "markdown" },
});

// Row objects keyed by the header row, for a model that reasons better over JSON
await neurolink.generate({
  input: { text: "Total the amounts.", files: ["workbook.xlsx"] },
  provider: "openai",
  officeOptions: { formatStyle: "json" },
});
```

Naming a sheet that does not exist does not silently fall back to every sheet. The prompt reports the miss and lists the available sheet names.

## Options

`officeOptions` is accepted by `generate()` and `stream()`. Two fields are read, both by the spreadsheet reader:

| Option        | Type                                     | Default | Effect                                                                                                                                                                                                       |
| ------------- | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sheetName`   | `string`                                 | all     | Restrict the workbook to the named sheet. An unknown name is reported in the prompt together with the sheets that do exist.                                                                                  |
| `formatStyle` | `"raw" \| "csv" \| "markdown" \| "json"` | `"raw"` | How each sheet is rendered: tab-separated preview (`raw`), comma-separated values with RFC 4180 quoting (`csv`), a markdown table (`markdown`), or an array of row objects keyed by the header row (`json`). |

The exported `OfficeProcessorOptions` type also declares `format`, `extractTextOnly`, `maxSizeMB`, `includeMetadata`, `processAllSheets`, and `includeSlideNotes`. Nothing reads them today, so setting them has no effect. The DOCX and PPTX readers take no options.

### File input formats

```typescript
// Path (relative or absolute)
files: ["./documents/report.docx", "/absolute/path/to/data.xlsx"];

// Buffer (from fs.readFile or any other source)
import { readFile } from "node:fs/promises";
const pptxBuffer = await readFile("deck.pptx");
files: [pptxBuffer];

// A mix of both
files: ["report.docx", pptxBuffer, "./sales.xlsx"];
```

Office files can sit in `input.files` next to PDFs, images, CSV, audio, and code. Office documents have no field of their own: there are no `docxFiles`, `pptxFiles`, `xlsxFiles`, or `officeFiles` inputs, so always use `input.files`.

## Large Files

An Office file in `input.files` (or `--file`) is always extracted and inlined in full, whatever its size. There is no on-demand mode for it through `generate()`, `stream()` or the CLI, so a very large workbook or deck is bounded by the limits under [Limitations](#limitations) and by the model's context window.

An SDK caller that wants selective reads can use `FileReferenceRegistry` (exported from `@juspay/neurolink/files`) directly, which is a separate path from `input.files`. Its `extractContent` call returns only the slides in `pages` for a presentation (with the same text and speaker notes as above, and `(No text content on this slide)` for a slide that has neither), or the `sheet`, `row_range` and `columns` you name for a spreadsheet.

## Error Handling

Extraction problems do not throw. If an Office file is corrupt, password-protected, a legacy binary format, or simply empty, the prompt carries a note in place of its content and the request goes on:

```
[Presentation File: "deck.pptx"]
Size: 2.0 KB
Format: application/vnd.openxmlformats-officedocument.presentationml.presentation
Error: Could not extract content (ADM-ZIP: Invalid or unsupported zip format. No END header found).
The file was attached but could not be fully analyzed.
```

A file that cannot be loaded at all does fail the request. A missing path, for example, surfaces as:

```
Failed to process file "deck.pptx": ENOENT: no such file or directory, open 'deck.pptx'
```

```typescript
try {
  await neurolink.generate({
    input: { text: "Analyze this document", files: ["document.docx"] },
    provider: "openai",
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
}
```

There are no Office-specific error classes.

## Best Practices

### 1. Narrow spreadsheets before sending them

Every sheet is rendered into the prompt by default. For a large workbook, name the sheet you need and pick the format the model handles best:

```typescript
officeOptions: { sheetName: "Transactions", formatStyle: "csv" }
```

### 2. Use streaming for long documents

```typescript
const result = await neurolink.stream({
  input: {
    text: "Provide a comprehensive analysis of this 100-page document",
    files: ["long-report.docx"],
  },
  provider: "anthropic",
  maxTokens: 8000,
});

for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

### 3. Be specific in your prompts

```typescript
// Too vague
"Tell me about this document";

// Specific and actionable
"Extract all action items with their due dates from this meeting notes document";
"List the top 5 products by revenue from the sales spreadsheet";
"Summarize the key points from each slide, and flag anything the speaker notes contradict";
"Compare the financial projections between these two quarterly reports";
```

## Limitations

- **Open XML only.** `.docx`, `.xlsx`, and `.pptx` are parsed. Legacy `.doc`, `.xls`, and `.ppt` are not (see above).
- **Text, tables, and notes only.** Embedded images and charts are not sent to the model (a Word image shows up as an `![alt](embedded-image)` marker), and VBA macros are never run.
- **No encrypted files.** A password-protected file cannot be read and arrives as a placeholder note.
- **Size bounds.** Word and Excel files are bounded at 100 MB each, and a presentation's extracted content at 100 MB in total (the limits live in `src/lib/processors/config/sizeLimits.ts`). Files over the 200 MB general ceiling are refused when loaded.
- **Prompt size.** The extracted text counts against the model's context window. A big workbook or a long document can fill it; use `sheetName`, a leaner `formatStyle`, or a model with a larger window.

## Troubleshooting

### The model says it cannot read the document

Look for the `Could not extract content` note in the prompt. Typical causes:

1. **Legacy format**: a `.doc`, `.xls`, or `.ppt`. Re-save it as `.docx`, `.xlsx`, or `.pptx`.
2. **Corrupt or truncated file**: confirm it opens in Office. An Office Open XML file is a ZIP and starts with the bytes `PK\x03\x04`.
3. **Password protection**: remove the password before attaching.
4. **No text in the file**: a deck of pictures or a scanned document has nothing to extract, and a picture-only deck arrives as just the `Presentation: N slide(s)` header with no placeholder note. Convert scans to text with OCR first, or attach the images instead.

```typescript
import { readFile } from "node:fs/promises";

const buffer = await readFile("document.docx");
console.log("Magic bytes:", buffer.subarray(0, 4).toString("hex")); // "504b0304"
console.log("Size:", (buffer.length / (1024 * 1024)).toFixed(2), "MB");
```

### A sheet is missing from the output

If you passed `sheetName`, the name must match exactly. When it does not, the prompt says so and lists the sheet names the workbook has.

### A request fails with `Failed to process file`

The path or URL could not be loaded. Check that the file exists and that the process can read it.

## Migrating from Manual Extraction

If you extracted text yourself before sending it to the model:

```typescript
// Before: extract by hand, paste into the prompt
import { readFileSync } from "node:fs";
import mammoth from "mammoth";

const { value: text } = await mammoth.extractRawText({
  buffer: readFileSync("report.docx"),
});
const result = await neurolink.generate({
  input: { text: `Analyze this document:\n\n${text}` },
  provider: "openai",
});

// After: attach the file; headings, lists, and tables are kept as Markdown
const result = await neurolink.generate({
  input: { text: "Analyze this document", files: ["report.docx"] },
  provider: "openai",
});
```

## Related Features

- [Multimodal Chat](./multimodal-chat.md) - Overview of multimodal capabilities
- [PDF Support](./pdf-support.md) - PDF document processing
- [CSV Support](./csv-support.md) - CSV file processing

## Technical Details

### Office Document Processing Flow

```
1. The caller lists the file in input.files (SDK) or passes --file (CLI)
   ↓
2. FileDetector identifies the format (magic bytes, MIME type, extension)
   ↓
3. The matching reader extracts the content:
   WordProcessor (docx), ExcelProcessor (xlsx), PptxProcessor (pptx)
   ↓
4. messageBuilder appends it to input.text under a "## Document / Spreadsheet /
   Presentation" heading
   ↓
5. The provider receives a plain text prompt
```

An extraction failure at step 3 produces the placeholder note shown under Error Handling instead of content.

### Implementation Files

- **`src/lib/processors/document/`** - `WordProcessor`, `ExcelProcessor`, `PptxProcessor`, `RtfProcessor`, `OpenDocumentProcessor`
- **`src/lib/utils/fileDetector.ts`** - Format detection and routing of Office files to their readers
- **`src/lib/utils/messageBuilder.ts`** - Appends extracted text to the prompt
- **`src/lib/types/file.ts`** - `OfficeProcessorOptions`
- **`src/lib/files/fileReferenceRegistry.ts`** - Targeted slide, sheet, and row reads for files held in a `FileReferenceRegistry` (SDK only; not reached through `input.files`)
- **`src/cli/factories/commandFactory.ts`** - CLI `--file` flag handling

---

**Next:** [Multimodal Chat Guide](./multimodal-chat.md) | [PDF Support](./pdf-support.md) | [CSV Support](./csv-support.md)
