[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SanitizeFileNameOptions

# Type Alias: SanitizeFileNameOptions

> **SanitizeFileNameOptions** = `object`

Options for filename sanitization.

## Properties

### maxLength?

> `optional` **maxLength?**: `number`

Maximum length for the filename (default: 255)

---

### replacement?

> `optional` **replacement?**: `string`

Replacement character for invalid chars (default: '\_')

---

### blockDangerousExtensions?

> `optional` **blockDangerousExtensions?**: `boolean`

Whether to block dangerous extensions (default: true)

---

### allowHiddenFiles?

> `optional` **allowHiddenFiles?**: `boolean`

Whether to allow hidden files starting with dot (default: false)
