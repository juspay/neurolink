[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessingOptions

# Type Alias: FileProcessingOptions

> **FileProcessingOptions** = [`ProcessOptions`](ProcessOptions.md) & `object`

Defined in: [types/processor.ts:1059](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L1059)

Options for processing files through the registry.
Extends base ProcessOptions with registry-specific options.

## Type Declaration

### preferredProcessor?

> `optional` **preferredProcessor?**: `string`

Preferred processor name (bypasses auto-detection)

### allowFallback?

> `optional` **allowFallback?**: `boolean`

Whether to fall back to default processing if no processor found

### maxFiles?

> `optional` **maxFiles?**: `number`

Maximum number of files to process (default: 100)

## Example

```typescript
const options: FileProcessingOptions = {
  // Base options
  authHeaders: { Authorization: "Bearer token" },
  timeout: 60000,

  // Registry-specific options
  preferredProcessor: "pdf", // Use specific processor
  allowFallback: true, // Allow fallback if no processor found
  maxFiles: 50, // Limit batch processing
};
```
