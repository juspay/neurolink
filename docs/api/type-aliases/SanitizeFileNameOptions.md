[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SanitizeFileNameOptions

# Type Alias: SanitizeFileNameOptions

> **SanitizeFileNameOptions** = `object`

Defined in: [types/file.ts:662](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L662)

Options for filename sanitization.

## Properties

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/file.ts:664](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L664)

Maximum length for the filename (default: 255)

---

### replacement?

> `optional` **replacement?**: `string`

Defined in: [types/file.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L666)

Replacement character for invalid chars (default: '\_')

---

### blockDangerousExtensions?

> `optional` **blockDangerousExtensions?**: `boolean`

Defined in: [types/file.ts:668](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L668)

Whether to block dangerous extensions (default: true)

---

### allowHiddenFiles?

> `optional` **allowHiddenFiles?**: `boolean`

Defined in: [types/file.ts:670](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L670)

Whether to allow hidden files starting with dot (default: false)
