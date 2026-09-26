[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SanitizeFileNameOptions

# Type Alias: SanitizeFileNameOptions

> **SanitizeFileNameOptions** = `object`

Defined in: [types/file.ts:851](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L851)

Options for filename sanitization.

## Properties

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/file.ts:853](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L853)

Maximum length for the filename (default: 255)

---

### replacement?

> `optional` **replacement?**: `string`

Defined in: [types/file.ts:855](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L855)

Replacement character for invalid chars (default: '\_')

---

### blockDangerousExtensions?

> `optional` **blockDangerousExtensions?**: `boolean`

Defined in: [types/file.ts:857](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L857)

Whether to block dangerous extensions (default: true)

---

### allowHiddenFiles?

> `optional` **allowHiddenFiles?**: `boolean`

Defined in: [types/file.ts:859](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L859)

Whether to allow hidden files starting with dot (default: false)
