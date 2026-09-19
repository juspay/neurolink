[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SanitizeFileNameOptions

# Type Alias: SanitizeFileNameOptions

> **SanitizeFileNameOptions** = `object`

Defined in: [types/file.ts:760](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L760)

Options for filename sanitization.

## Properties

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/file.ts:762](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L762)

Maximum length for the filename (default: 255)

---

### replacement?

> `optional` **replacement?**: `string`

Defined in: [types/file.ts:764](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L764)

Replacement character for invalid chars (default: '\_')

---

### blockDangerousExtensions?

> `optional` **blockDangerousExtensions?**: `boolean`

Defined in: [types/file.ts:766](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L766)

Whether to block dangerous extensions (default: true)

---

### allowHiddenFiles?

> `optional` **allowHiddenFiles?**: `boolean`

Defined in: [types/file.ts:768](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L768)

Whether to allow hidden files starting with dot (default: false)
