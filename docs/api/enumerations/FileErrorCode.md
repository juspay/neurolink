[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileErrorCode

# Enumeration: FileErrorCode

Enumeration of all file processing error codes.
Each code represents a specific failure scenario with associated messaging.

## Enumeration Members

### DOWNLOAD_FAILED

> **DOWNLOAD_FAILED**: `"DOWNLOAD_FAILED"`

File download failed due to network or server error

---

### DOWNLOAD_TIMEOUT

> **DOWNLOAD_TIMEOUT**: `"DOWNLOAD_TIMEOUT"`

Download operation exceeded timeout threshold

---

### DOWNLOAD_AUTH_FAILED

> **DOWNLOAD_AUTH_FAILED**: `"DOWNLOAD_AUTH_FAILED"`

Authentication failed when accessing the file

---

### NETWORK_ERROR

> **NETWORK_ERROR**: `"NETWORK_ERROR"`

Network error during download (connection reset, DNS failure, etc.)

---

### FILE_NOT_FOUND

> **FILE_NOT_FOUND**: `"FILE_NOT_FOUND"`

File was not found at the specified location

---

### RATE_LIMITED

> **RATE_LIMITED**: `"RATE_LIMITED"`

Request was rate limited by the server

---

### FILE_TOO_LARGE

> **FILE_TOO_LARGE**: `"FILE_TOO_LARGE"`

File exceeds maximum allowed size

---

### UNSUPPORTED_TYPE

> **UNSUPPORTED_TYPE**: `"UNSUPPORTED_TYPE"`

File type is not supported for processing

---

### INVALID_FORMAT

> **INVALID_FORMAT**: `"INVALID_FORMAT"`

File format is invalid or malformed

---

### INVALID_MIME_TYPE

> **INVALID_MIME_TYPE**: `"INVALID_MIME_TYPE"`

File MIME type doesn't match expected format

---

### INVALID_MAGIC_BYTES

> **INVALID_MAGIC_BYTES**: `"INVALID_MAGIC_BYTES"`

File magic bytes don't match expected file type

---

### CORRUPTED_FILE

> **CORRUPTED_FILE**: `"CORRUPTED_FILE"`

File appears to be corrupted or damaged

---

### INVALID_STRUCTURE

> **INVALID_STRUCTURE**: `"INVALID_STRUCTURE"`

File internal structure is invalid

---

### PROCESSING_FAILED

> **PROCESSING_FAILED**: `"PROCESSING_FAILED"`

Generic processing failure

---

### PARSING_FAILED

> **PARSING_FAILED**: `"PARSING_FAILED"`

Failed to parse file content

---

### ENCODING_ERROR

> **ENCODING_ERROR**: `"ENCODING_ERROR"`

Text encoding error (not UTF-8, BOM issues, etc.)

---

### EXTRACTION_FAILED

> **EXTRACTION_FAILED**: `"EXTRACTION_FAILED"`

Failed to extract content from file

---

### DECOMPRESSION_FAILED

> **DECOMPRESSION_FAILED**: `"DECOMPRESSION_FAILED"`

Failed to decompress file content

---

### SECURITY_VALIDATION_FAILED

> **SECURITY_VALIDATION_FAILED**: `"SECURITY_VALIDATION_FAILED"`

Security validation failed

---

### XXE_DETECTED

> **XXE_DETECTED**: `"XXE_DETECTED"`

XML External Entity (XXE) attack detected

---

### XSS_DETECTED

> **XSS_DETECTED**: `"XSS_DETECTED"`

Cross-site scripting (XSS) attack detected

---

### CODE_EXECUTION_DETECTED

> **CODE_EXECUTION_DETECTED**: `"CODE_EXECUTION_DETECTED"`

Potentially malicious code execution detected

---

### ZIP_BOMB_DETECTED

> **ZIP_BOMB_DETECTED**: `"ZIP_BOMB_DETECTED"`

Zip bomb or decompression bomb detected

---

### UNKNOWN_ERROR

> **UNKNOWN_ERROR**: `"UNKNOWN_ERROR"`

Unknown or unexpected error
