[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVLoaderOptions

# Type Alias: CSVLoaderOptions

> **CSVLoaderOptions** = [`LoaderOptions`](LoaderOptions.md) & `object`

Defined in: [types/rag.ts:585](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L585)

CSV loader options

## Type Declaration

### delimiter?

> `optional` **delimiter?**: `string`

Delimiter character

### hasHeader?

> `optional` **hasHeader?**: `boolean`

Whether first row is header

### columns?

> `optional` **columns?**: `string`[]

Column names (if no header)

### outputFormat?

> `optional` **outputFormat?**: `"text"` \| `"json"` \| `"markdown"`

Output format

### sanitizeColumnNames?

> `optional` **sanitizeColumnNames?**: `boolean`

Rewrite headers into valid identifiers (#378). Opt-in; default false keeps
the raw header strings as JSON keys / table columns.

### columnNameCase?

> `optional` **columnNameCase?**: `"camelCase"` \| `"snake_case"`

Case style used when `sanitizeColumnNames` is on (#378). Default "snake_case".
