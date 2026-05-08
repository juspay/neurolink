[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileErrorCode

# Enumeration: FileErrorCode

Defined in: [processors/errors/FileErrorCode.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L20)

Enumeration of all file processing error codes.
Each code represents a specific failure scenario with associated messaging.

## Enumeration Members

### DOWNLOAD_FAILED

> **DOWNLOAD_FAILED**: `"DOWNLOAD_FAILED"`

Defined in: [processors/errors/FileErrorCode.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L26)

File download failed due to network or server error

---

### DOWNLOAD_TIMEOUT

> **DOWNLOAD_TIMEOUT**: `"DOWNLOAD_TIMEOUT"`

Defined in: [processors/errors/FileErrorCode.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L29)

Download operation exceeded timeout threshold

---

### DOWNLOAD_AUTH_FAILED

> **DOWNLOAD_AUTH_FAILED**: `"DOWNLOAD_AUTH_FAILED"`

Defined in: [processors/errors/FileErrorCode.ts:32](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L32)

Authentication failed when accessing the file

---

### NETWORK_ERROR

> **NETWORK_ERROR**: `"NETWORK_ERROR"`

Defined in: [processors/errors/FileErrorCode.ts:35](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L35)

Network error during download (connection reset, DNS failure, etc.)

---

### FILE_NOT_FOUND

> **FILE_NOT_FOUND**: `"FILE_NOT_FOUND"`

Defined in: [processors/errors/FileErrorCode.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L38)

File was not found at the specified location

---

### RATE_LIMITED

> **RATE_LIMITED**: `"RATE_LIMITED"`

Defined in: [processors/errors/FileErrorCode.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L41)

Request was rate limited by the server

---

### FILE_TOO_LARGE

> **FILE_TOO_LARGE**: `"FILE_TOO_LARGE"`

Defined in: [processors/errors/FileErrorCode.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L48)

File exceeds maximum allowed size

---

### UNSUPPORTED_TYPE

> **UNSUPPORTED_TYPE**: `"UNSUPPORTED_TYPE"`

Defined in: [processors/errors/FileErrorCode.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L51)

File type is not supported for processing

---

### INVALID_FORMAT

> **INVALID_FORMAT**: `"INVALID_FORMAT"`

Defined in: [processors/errors/FileErrorCode.ts:54](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L54)

File format is invalid or malformed

---

### INVALID_MIME_TYPE

> **INVALID_MIME_TYPE**: `"INVALID_MIME_TYPE"`

Defined in: [processors/errors/FileErrorCode.ts:57](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L57)

File MIME type doesn't match expected format

---

### INVALID_MAGIC_BYTES

> **INVALID_MAGIC_BYTES**: `"INVALID_MAGIC_BYTES"`

Defined in: [processors/errors/FileErrorCode.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L60)

File magic bytes don't match expected file type

---

### CORRUPTED_FILE

> **CORRUPTED_FILE**: `"CORRUPTED_FILE"`

Defined in: [processors/errors/FileErrorCode.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L63)

File appears to be corrupted or damaged

---

### INVALID_STRUCTURE

> **INVALID_STRUCTURE**: `"INVALID_STRUCTURE"`

Defined in: [processors/errors/FileErrorCode.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L66)

File internal structure is invalid

---

### PROCESSING_FAILED

> **PROCESSING_FAILED**: `"PROCESSING_FAILED"`

Defined in: [processors/errors/FileErrorCode.ts:73](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L73)

Generic processing failure

---

### PARSING_FAILED

> **PARSING_FAILED**: `"PARSING_FAILED"`

Defined in: [processors/errors/FileErrorCode.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L76)

Failed to parse file content

---

### ENCODING_ERROR

> **ENCODING_ERROR**: `"ENCODING_ERROR"`

Defined in: [processors/errors/FileErrorCode.ts:79](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L79)

Text encoding error (not UTF-8, BOM issues, etc.)

---

### EXTRACTION_FAILED

> **EXTRACTION_FAILED**: `"EXTRACTION_FAILED"`

Defined in: [processors/errors/FileErrorCode.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L82)

Failed to extract content from file

---

### DECOMPRESSION_FAILED

> **DECOMPRESSION_FAILED**: `"DECOMPRESSION_FAILED"`

Defined in: [processors/errors/FileErrorCode.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L85)

Failed to decompress file content

---

### SECURITY_VALIDATION_FAILED

> **SECURITY_VALIDATION_FAILED**: `"SECURITY_VALIDATION_FAILED"`

Defined in: [processors/errors/FileErrorCode.ts:92](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L92)

Security validation failed

---

### XXE_DETECTED

> **XXE_DETECTED**: `"XXE_DETECTED"`

Defined in: [processors/errors/FileErrorCode.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L95)

XML External Entity (XXE) attack detected

---

### XSS_DETECTED

> **XSS_DETECTED**: `"XSS_DETECTED"`

Defined in: [processors/errors/FileErrorCode.ts:98](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L98)

Cross-site scripting (XSS) attack detected

---

### CODE_EXECUTION_DETECTED

> **CODE_EXECUTION_DETECTED**: `"CODE_EXECUTION_DETECTED"`

Defined in: [processors/errors/FileErrorCode.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L101)

Potentially malicious code execution detected

---

### ZIP_BOMB_DETECTED

> **ZIP_BOMB_DETECTED**: `"ZIP_BOMB_DETECTED"`

Defined in: [processors/errors/FileErrorCode.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L104)

Zip bomb or decompression bomb detected

---

### UNKNOWN_ERROR

> **UNKNOWN_ERROR**: `"UNKNOWN_ERROR"`

Defined in: [processors/errors/FileErrorCode.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/processors/errors/FileErrorCode.ts#L111)

Unknown or unexpected error
