[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVLoaderOptions

# Type Alias: CSVLoaderOptions

> **CSVLoaderOptions** = [`LoaderOptions`](LoaderOptions.md) & `object`

Defined in: [types/rag.ts:545](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L545)

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
