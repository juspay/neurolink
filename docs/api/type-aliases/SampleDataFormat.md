[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SampleDataFormat

# Type Alias: SampleDataFormat

> **SampleDataFormat** = `"object"` \| `"json"` \| `"csv"` \| `"markdown"`

Defined in: [types/file.ts:224](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L224)

Sample data format options for CSV metadata

- 'json': JSON string representation (default, backward compatible)
- 'object': Structured array of row objects (best for programmatic use)
- 'csv': CSV formatted string preview
- 'markdown': Markdown table format
