[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVProcessorOptions

# Type Alias: CSVProcessorOptions

> **CSVProcessorOptions** = `object`

Defined in: [types/file.ts:492](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L492)

CSV processor options

## Properties

### maxRows?

> `optional` **maxRows?**: `number`

Defined in: [types/file.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L493)

---

### formatStyle?

> `optional` **formatStyle?**: `"raw"` \| `"markdown"` \| `"json"`

Defined in: [types/file.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L494)

---

### includeHeaders?

> `optional` **includeHeaders?**: `boolean`

Defined in: [types/file.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L495)

---

### sampleDataFormat?

> `optional` **sampleDataFormat?**: [`SampleDataFormat`](SampleDataFormat.md)

Defined in: [types/file.ts:496](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L496)

---

### extension?

> `optional` **extension?**: `string` \| `null`

Defined in: [types/file.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L497)

---

### encoding?

> `optional` **encoding?**: `string`

Defined in: [types/file.ts:503](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L503)

Character encoding override (#362). When omitted, the encoding is detected
from a BOM then `chardet`, falling back to UTF-8. Accepts any label
`iconv-lite` supports (e.g. "utf-8", "utf-16le", "windows-1252", "latin1").

---

### sanitizeColumnNames?

> `optional` **sanitizeColumnNames?**: `boolean`

Defined in: [types/file.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L508)

Rewrite column headers into valid identifiers (#378). Opt-in; default false
preserves the raw header strings as object keys.

---

### columnNameCase?

> `optional` **columnNameCase?**: `"camelCase"` \| `"snake_case"`

Defined in: [types/file.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L510)

Case style used when `sanitizeColumnNames` is on (#378). Default "snake_case".

---

### parseTimeoutMs?

> `optional` **parseTimeoutMs?**: `number`

Defined in: [types/file.ts:516](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L516)

Wall-clock cap for the streaming parse in milliseconds (#379). On timeout the
parse returns the rows collected so far and flags `metadata.parseTimedOut`,
rather than hanging forever. Defaults: 30s for strings, 5min for files.

---

### skipEmptyLines?

> `optional` **skipEmptyLines?**: `boolean`

Defined in: [types/file.ts:522](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L522)

Skip blank / whitespace-only data rows (#373). Default `true`: blank lines
are excluded from the returned content (including raw CSV text) and from
`metadata.rowCount`. Set to `false` to preserve empty lines literally.
