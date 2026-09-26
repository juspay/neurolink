[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BadWordsConfig

# Type Alias: BadWordsConfig

> **BadWordsConfig** = `object`

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

---

### list?

> `optional` **list?**: `string`[]

---

### regexPatterns?

> `optional` **regexPatterns?**: `string`[]

---

### replacementText?

> `optional` **replacementText?**: `string`

Text to use when replacing filtered content.

#### Default

```ts
'[REDACTED]'

Examples:
- '[REDACTED]' (default)
- '***'
- '####'
- '[FILTERED]'
```
