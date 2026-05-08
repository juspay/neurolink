[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenExtractionOptions

# Type Alias: TokenExtractionOptions

> **TokenExtractionOptions** = `object`

Defined in: [types/common.ts:373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L373)

Options for token extraction from raw usage objects.

## Properties

### calculateCacheSavings?

> `optional` **calculateCacheSavings?**: `boolean`

Defined in: [types/common.ts:378](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L378)

Whether to calculate cache savings percentage

#### Default

```ts
true;
```

---

### missingOptionalBehavior?

> `optional` **missingOptionalBehavior?**: `"zero"` \| `"undefined"`

Defined in: [types/common.ts:385](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L385)

How to handle missing optional fields

- "zero": Return 0 for missing optional fields
- "undefined": Return undefined for missing optional fields (default)
