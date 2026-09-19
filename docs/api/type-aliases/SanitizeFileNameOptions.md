[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SanitizeFileNameOptions

# Type Alias: SanitizeFileNameOptions

> **SanitizeFileNameOptions** = `object`

Defined in: [types/file.ts:728](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L728)

Options for filename sanitization.

## Properties

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/file.ts:730](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L730)

Maximum length for the filename (default: 255)

---

### replacement?

> `optional` **replacement?**: `string`

Defined in: [types/file.ts:732](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L732)

Replacement character for invalid chars (default: '\_')

---

### blockDangerousExtensions?

> `optional` **blockDangerousExtensions?**: `boolean`

Defined in: [types/file.ts:734](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L734)

Whether to block dangerous extensions (default: true)

---

### allowHiddenFiles?

> `optional` **allowHiddenFiles?**: `boolean`

Defined in: [types/file.ts:736](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L736)

Whether to allow hidden files starting with dot (default: false)
