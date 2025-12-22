# Office Test Fixtures

This directory contains test fixtures for office file error handling tests (OFFICE-019).

## Test Fixtures

### Corrupted Office Files
- **corrupted.docx** - Invalid DOCX file (not a valid ZIP)
- **corrupted.pptx** - Invalid PPTX file (not a valid ZIP)  
- **corrupted.xlsx** - Invalid XLSX file (not a valid ZIP)

These files contain corrupted content that starts with "PK" but is not a valid ZIP archive, used to test format validation.

### Empty Office Files
- **empty.docx** - Empty DOCX file (0 bytes)
- **empty.pptx** - Empty PPTX file (0 bytes)
- **empty.xlsx** - Empty XLSX file (0 bytes)

These files are completely empty to test empty file detection and validation.

### Non-Office ZIP File
- **non-office.zip** - Valid ZIP file but not an Office document

This file simulates a ZIP file that doesn't contain Office Open XML structure.

### Large Office File
- **large.docx** - Large DOCX file (6MB)

This file is used to test file size limit enforcement (default limit is 5MB).

## Usage

These fixtures are used by `/test/unit/office-error-handling.test.ts` to test:

1. Corrupted file detection
2. Empty file handling
3. File size limit enforcement
4. Non-office ZIP file detection
5. Clear and actionable error messages

## Error Types Tested

- **OfficeValidationError** - Format validation failures
- **OfficeSizeError** - File size limit violations
- **OfficeProviderError** - Unsupported provider errors
- **Timeout errors** - Processing timeout scenarios
