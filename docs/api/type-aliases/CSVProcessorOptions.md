[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVProcessorOptions

# Type Alias: CSVProcessorOptions

> **CSVProcessorOptions** = `object`

Defined in: [types/file.ts:431](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L431)

CSV processor options

## Properties

### maxRows?

> `optional` **maxRows?**: `number`

Defined in: [types/file.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L432)

---

### formatStyle?

> `optional` **formatStyle?**: `"raw"` \| `"markdown"` \| `"json"`

Defined in: [types/file.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L433)

---

### includeHeaders?

> `optional` **includeHeaders?**: `boolean`

Defined in: [types/file.ts:434](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L434)

---

### sampleDataFormat?

> `optional` **sampleDataFormat?**: [`SampleDataFormat`](SampleDataFormat.md)

Defined in: [types/file.ts:435](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L435)

---

### extension?

> `optional` **extension?**: `string` \| `null`

Defined in: [types/file.ts:436](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L436)

---

### encoding?

> `optional` **encoding?**: `string`

Defined in: [types/file.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L442)

Character encoding override (#362). When omitted, the encoding is detected
from a BOM then `chardet`, falling back to UTF-8. Accepts any label
`iconv-lite` supports (e.g. "utf-8", "utf-16le", "windows-1252", "latin1").

---

### sanitizeColumnNames?

> `optional` **sanitizeColumnNames?**: `boolean`

Defined in: [types/file.ts:447](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L447)

Rewrite column headers into valid identifiers (#378). Opt-in; default false
preserves the raw header strings as object keys.

---

### columnNameCase?

> `optional` **columnNameCase?**: `"camelCase"` \| `"snake_case"`

Defined in: [types/file.ts:449](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L449)

Case style used when `sanitizeColumnNames` is on (#378). Default "snake_case".

---

### parseTimeoutMs?

> `optional` **parseTimeoutMs?**: `number`

Defined in: [types/file.ts:455](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L455)

Wall-clock cap for the streaming parse in milliseconds (#379). On timeout the
parse returns the rows collected so far and flags `metadata.parseTimedOut`,
rather than hanging forever. Defaults: 30s for strings, 5min for files.

---

### skipEmptyLines?

> `optional` **skipEmptyLines?**: `boolean`

Defined in: [types/file.ts:461](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L461)

Skip blank / whitespace-only data rows (#373). Default `true`: blank lines
are excluded from the returned content (including raw CSV text) and from
`metadata.rowCount`. Set to `false` to preserve empty lines literally.
