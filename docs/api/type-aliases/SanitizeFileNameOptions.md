[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SanitizeFileNameOptions

# Type Alias: SanitizeFileNameOptions

> **SanitizeFileNameOptions** = `object`

Defined in: [types/file.ts:706](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L706)

Options for filename sanitization.

## Properties

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/file.ts:708](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L708)

Maximum length for the filename (default: 255)

---

### replacement?

> `optional` **replacement?**: `string`

Defined in: [types/file.ts:710](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L710)

Replacement character for invalid chars (default: '\_')

---

### blockDangerousExtensions?

> `optional` **blockDangerousExtensions?**: `boolean`

Defined in: [types/file.ts:712](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L712)

Whether to block dangerous extensions (default: true)

---

### allowHiddenFiles?

> `optional` **allowHiddenFiles?**: `boolean`

Defined in: [types/file.ts:714](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L714)

Whether to allow hidden files starting with dot (default: false)
