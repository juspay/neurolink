[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SanitizeFileNameOptions

# Type Alias: SanitizeFileNameOptions

> **SanitizeFileNameOptions** = `object`

Defined in: [types/file.ts:813](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L813)

Options for filename sanitization.

## Properties

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/file.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L815)

Maximum length for the filename (default: 255)

---

### replacement?

> `optional` **replacement?**: `string`

Defined in: [types/file.ts:817](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L817)

Replacement character for invalid chars (default: '\_')

---

### blockDangerousExtensions?

> `optional` **blockDangerousExtensions?**: `boolean`

Defined in: [types/file.ts:819](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L819)

Whether to block dangerous extensions (default: true)

---

### allowHiddenFiles?

> `optional` **allowHiddenFiles?**: `boolean`

Defined in: [types/file.ts:821](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L821)

Whether to allow hidden files starting with dot (default: false)
