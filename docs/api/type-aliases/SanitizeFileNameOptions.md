[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SanitizeFileNameOptions

# Type Alias: SanitizeFileNameOptions

> **SanitizeFileNameOptions** = `object`

Defined in: [types/file.ts:687](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L687)

Options for filename sanitization.

## Properties

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/file.ts:689](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L689)

Maximum length for the filename (default: 255)

---

### replacement?

> `optional` **replacement?**: `string`

Defined in: [types/file.ts:691](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L691)

Replacement character for invalid chars (default: '\_')

---

### blockDangerousExtensions?

> `optional` **blockDangerousExtensions?**: `boolean`

Defined in: [types/file.ts:693](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L693)

Whether to block dangerous extensions (default: true)

---

### allowHiddenFiles?

> `optional` **allowHiddenFiles?**: `boolean`

Defined in: [types/file.ts:695](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L695)

Whether to allow hidden files starting with dot (default: false)
