[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVProcessorOptions

# Type Alias: CSVProcessorOptions

> **CSVProcessorOptions** = `object`

Defined in: [types/file.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L324)

CSV processor options

## Properties

### maxRows?

> `optional` **maxRows?**: `number`

Defined in: [types/file.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L325)

---

### formatStyle?

> `optional` **formatStyle?**: `"raw"` \| `"markdown"` \| `"json"`

Defined in: [types/file.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L326)

---

### includeHeaders?

> `optional` **includeHeaders?**: `boolean`

Defined in: [types/file.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L327)

---

### sampleDataFormat?

> `optional` **sampleDataFormat?**: [`SampleDataFormat`](SampleDataFormat.md)

Defined in: [types/file.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L328)

---

### extension?

> `optional` **extension?**: `string` \| `null`

Defined in: [types/file.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L329)

---

### encoding?

> `optional` **encoding?**: `string`

Defined in: [types/file.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L335)

Character encoding override (#362). When omitted, the encoding is detected
from a BOM then `chardet`, falling back to UTF-8. Accepts any label
`iconv-lite` supports (e.g. "utf-8", "utf-16le", "windows-1252", "latin1").

---

### sanitizeColumnNames?

> `optional` **sanitizeColumnNames?**: `boolean`

Defined in: [types/file.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L340)

Rewrite column headers into valid identifiers (#378). Opt-in; default false
preserves the raw header strings as object keys.

---

### columnNameCase?

> `optional` **columnNameCase?**: `"camelCase"` \| `"snake_case"`

Defined in: [types/file.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L342)

Case style used when `sanitizeColumnNames` is on (#378). Default "snake_case".

---

### parseTimeoutMs?

> `optional` **parseTimeoutMs?**: `number`

Defined in: [types/file.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L348)

Wall-clock cap for the streaming parse in milliseconds (#379). On timeout the
parse returns the rows collected so far and flags `metadata.parseTimedOut`,
rather than hanging forever. Defaults: 30s for strings, 5min for files.

---

### skipEmptyLines?

> `optional` **skipEmptyLines?**: `boolean`

Defined in: [types/file.ts:354](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L354)

Skip blank / whitespace-only data rows (#373). Default `true`: blank lines
are excluded from the returned content (including raw CSV text) and from
`metadata.rowCount`. Set to `false` to preserve empty lines literally.
