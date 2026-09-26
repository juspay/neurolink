[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SanitizeFileNameOptions

# Type Alias: SanitizeFileNameOptions

> **SanitizeFileNameOptions** = `object`

Defined in: [types/file.ts:902](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L902)

Options for filename sanitization.

## Properties

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/file.ts:904](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L904)

Maximum length for the filename (default: 255)

---

### replacement?

> `optional` **replacement?**: `string`

Defined in: [types/file.ts:906](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L906)

Replacement character for invalid chars (default: '\_')

---

### blockDangerousExtensions?

> `optional` **blockDangerousExtensions?**: `boolean`

Defined in: [types/file.ts:908](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L908)

Whether to block dangerous extensions (default: true)

---

### allowHiddenFiles?

> `optional` **allowHiddenFiles?**: `boolean`

Defined in: [types/file.ts:910](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L910)

Whether to allow hidden files starting with dot (default: false)
