# Office Document Progress Indicators

## Overview

The CLI now includes comprehensive progress indicators for office document processing (DOCX, PPTX, XLSX files). These indicators provide visual feedback during file processing operations using the `ora` spinner library, consistent with other file processing indicators in the CLI.

## Features

### File Type Support

- **DOCX** (Word Documents) - 📄
- **PPTX** (PowerPoint Presentations) - 📊
- **XLSX** (Excel Spreadsheets) - 📈

### Visual Indicators

Each file type has:

- Distinctive emoji for visual identification
- File name display with dimmed styling
- Processing status messages
- Success/failure indicators

### CLI Flags

New command-line flags for office documents:

```bash
# Word documents
neurolink generate "Analyze this" --docx document.docx

# PowerPoint presentations
neurolink generate "Summarize slides" --pptx presentation.pptx

# Excel spreadsheets
neurolink generate "Review data" --xlsx spreadsheet.xlsx

# Multiple office files
neurolink generate "Analyze all" \
  --docx report.docx \
  --pptx slides.pptx \
  --xlsx data.xlsx
```

## Usage Examples

### Single File Processing

```typescript
import { showProcessingSpinner } from "./cli/utils/spinner.js";

// Show spinner for a single file
const spinner = showProcessingSpinner("document.docx");

// Processing happens here...

// On success
spinner?.succeed("Processed document.docx successfully");

// On failure
spinner?.fail("Failed to process document.docx");
```

### Multiple File Processing

```typescript
import { showMultiFileSpinner } from "./cli/utils/spinner.js";

const files = ["doc1.docx", "presentation.pptx", "data.xlsx"];
const progress = showMultiFileSpinner(files);

// Update progress for each file
progress.updateFile("doc1.docx", "success");
progress.updateFile("presentation.pptx", "error", "Invalid format");
progress.updateFile("data.xlsx", "success");

// Complete processing
progress.complete();
```

### Quiet Mode

Spinners can be suppressed in quiet mode:

```typescript
const spinner = showProcessingSpinner("document.docx", quietMode);
// Returns null if quietMode is true
```

## Implementation Details

### Spinner Utility (`src/cli/utils/spinner.ts`)

#### Functions

1. **`showProcessingSpinner(file, quiet?)`**
   - Shows a spinner for a single file
   - Automatically detects file type and selects appropriate emoji
   - Returns Ora spinner instance or null in quiet mode

2. **`showMultiFileSpinner(files, quiet?)`**
   - Shows progress for multiple files
   - Returns object with:
     - `updateFile(file, status, message?)` - Update file status
     - `complete()` - Finish processing
     - `spinner` - Ora instance or null

3. **`showOfficeFileSpinner(file, quiet?)`**
   - Convenience wrapper for office files
   - Identical to `showProcessingSpinner`

### File Type Detection

The utility automatically detects file types from extensions:

```typescript
// From file paths
"document.docx" → 📄 DOCX
"presentation.pptx" → 📊 PPTX
"spreadsheet.xlsx" → 📈 XLSX

// From URLs
"https://example.com/file.docx" → 📄 DOCX

// From Buffers
Buffer → 📁 buffer
```

### CLI Integration (`src/cli/factories/commandFactory.ts`)

#### Processing Functions

- `processCliDOCXFiles(docxFiles?)` - Process DOCX file arguments
- `processCliPPTXFiles(pptxFiles?)` - Process PPTX file arguments
- `processCliXLSXFiles(xlsxFiles?)` - Process XLSX file arguments

#### Commands Updated

- `generate` command - Shows spinners for office files
- `stream` command - Shows spinners for office files

## Current Status

### ✅ Completed

- Spinner utility implementation
- CLI flag additions (`--docx`, `--pptx`, `--xlsx`)
- File type detection and emoji mapping
- Success/failure message handling
- Multi-file progress tracking
- Quiet mode support
- Integration points in generate/stream commands
- Manual test script

### ⏳ Pending

- **OFFICE-013 Implementation** - Actual office document processing
  - DOCX processing (mammoth library is installed)
  - PPTX processing
  - XLSX processing
  - Integration with FileDetector
  - FileType enum updates

Once OFFICE-013 is complete, the spinners will automatically work with the actual file processing.

## Testing

### Manual Testing

Run the manual test script to verify spinner functionality:

```bash
npx tsx test/manual/spinner-test.ts
```

This will visually demonstrate:

- Single file spinners for each office type
- Multi-file spinner with success/error cases
- Quiet mode behavior

### Integration Testing

After OFFICE-013 is implemented, test with real files:

```bash
# Test with actual office documents
neurolink generate "Summarize" --docx sample.docx
neurolink generate "Analyze" --pptx slides.pptx
neurolink generate "Review" --xlsx data.xlsx

# Test multiple files
neurolink generate "Process all" \
  --docx doc1.docx \
  --docx doc2.docx \
  --pptx presentation.pptx \
  --xlsx spreadsheet.xlsx
```

## Design Principles

1. **Consistency** - Uses same ora library and patterns as existing file processing (PDF, CSV, images)

2. **Visual Clarity** - Distinctive emojis make it easy to identify file types at a glance

3. **Graceful Degradation** - Quiet mode allows suppressing all spinner output

4. **Error Handling** - Clear success/failure messages with optional error details

5. **Scalability** - Supports both single and multiple file processing scenarios

## Future Enhancements

Potential improvements for future iterations:

- Progress percentage for large files
- File size indicators
- Processing time estimates
- Parallel processing visualization
- Color-coded status indicators
- Integration with progress bars for batch operations

## Related Files

- `src/cli/utils/spinner.ts` - Spinner utility implementation
- `src/cli/factories/commandFactory.ts` - CLI command integration
- `test/manual/spinner-test.ts` - Manual test script
- `src/lib/utils/fileDetector.ts` - File detection (needs office type support)
- `src/lib/types/fileTypes.ts` - File types (needs office type additions)
