[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SampleDataFormat

# Type Alias: SampleDataFormat

> **SampleDataFormat** = `"object"` \| `"json"` \| `"csv"` \| `"markdown"`

Defined in: [types/file.ts:132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L132)

Sample data format options for CSV metadata

- 'json': JSON string representation (default, backward compatible)
- 'object': Structured array of row objects (best for programmatic use)
- 'csv': CSV formatted string preview
- 'markdown': Markdown table format
