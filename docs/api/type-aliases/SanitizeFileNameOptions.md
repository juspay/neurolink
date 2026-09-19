[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SanitizeFileNameOptions

# Type Alias: SanitizeFileNameOptions

> **SanitizeFileNameOptions** = `object`

Defined in: [types/file.ts:677](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L677)

Options for filename sanitization.

## Properties

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/file.ts:679](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L679)

Maximum length for the filename (default: 255)

---

### replacement?

> `optional` **replacement?**: `string`

Defined in: [types/file.ts:681](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L681)

Replacement character for invalid chars (default: '\_')

---

### blockDangerousExtensions?

> `optional` **blockDangerousExtensions?**: `boolean`

Defined in: [types/file.ts:683](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L683)

Whether to block dangerous extensions (default: true)

---

### allowHiddenFiles?

> `optional` **allowHiddenFiles?**: `boolean`

Defined in: [types/file.ts:685](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L685)

Whether to allow hidden files starting with dot (default: false)
