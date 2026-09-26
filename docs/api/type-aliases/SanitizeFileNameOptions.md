[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SanitizeFileNameOptions

# Type Alias: SanitizeFileNameOptions

> **SanitizeFileNameOptions** = `object`

Defined in: [types/file.ts:836](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L836)

Options for filename sanitization.

## Properties

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/file.ts:838](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L838)

Maximum length for the filename (default: 255)

---

### replacement?

> `optional` **replacement?**: `string`

Defined in: [types/file.ts:840](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L840)

Replacement character for invalid chars (default: '\_')

---

### blockDangerousExtensions?

> `optional` **blockDangerousExtensions?**: `boolean`

Defined in: [types/file.ts:842](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L842)

Whether to block dangerous extensions (default: true)

---

### allowHiddenFiles?

> `optional` **allowHiddenFiles?**: `boolean`

Defined in: [types/file.ts:844](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L844)

Whether to allow hidden files starting with dot (default: false)
