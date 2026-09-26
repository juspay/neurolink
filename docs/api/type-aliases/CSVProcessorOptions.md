[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVProcessorOptions

# Type Alias: CSVProcessorOptions

> **CSVProcessorOptions** = `object`

CSV processor options

## Properties

### maxRows?

> `optional` **maxRows?**: `number`

---

### formatStyle?

> `optional` **formatStyle?**: `"raw"` \| `"markdown"` \| `"json"`

---

### includeHeaders?

> `optional` **includeHeaders?**: `boolean`

---

### sampleDataFormat?

> `optional` **sampleDataFormat?**: [`SampleDataFormat`](SampleDataFormat.md)

---

### extension?

> `optional` **extension?**: `string` \| `null`

---

### encoding?

> `optional` **encoding?**: `string`

Character encoding override (#362). When omitted, the encoding is detected
from a BOM then `chardet`, falling back to UTF-8. Accepts any label
`iconv-lite` supports (e.g. "utf-8", "utf-16le", "windows-1252", "latin1").

---

### sanitizeColumnNames?

> `optional` **sanitizeColumnNames?**: `boolean`

Rewrite column headers into valid identifiers (#378). Opt-in; default false
preserves the raw header strings as object keys.

---

### columnNameCase?

> `optional` **columnNameCase?**: `"camelCase"` \| `"snake_case"`

Case style used when `sanitizeColumnNames` is on (#378). Default "snake_case".

---

### parseTimeoutMs?

> `optional` **parseTimeoutMs?**: `number`

Wall-clock cap for the streaming parse in milliseconds (#379). On timeout the
parse returns the rows collected so far and flags `metadata.parseTimedOut`,
rather than hanging forever. Defaults: 30s for strings, 5min for files.

---

### skipEmptyLines?

> `optional` **skipEmptyLines?**: `boolean`

Skip blank / whitespace-only data rows (#373). Default `true`: blank lines
are excluded from the returned content (including raw CSV text) and from
`metadata.rowCount`. Set to `false` to preserve empty lines literally.
