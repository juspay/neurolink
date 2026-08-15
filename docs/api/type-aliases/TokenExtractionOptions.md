[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenExtractionOptions

# Type Alias: TokenExtractionOptions

> **TokenExtractionOptions** = `object`

Defined in: [types/common.ts:403](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L403)

Options for token extraction from raw usage objects.

## Properties

### calculateCacheSavings?

> `optional` **calculateCacheSavings?**: `boolean`

Defined in: [types/common.ts:408](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L408)

Whether to calculate cache savings percentage

#### Default

```ts
true;
```

---

### missingOptionalBehavior?

> `optional` **missingOptionalBehavior?**: `"zero"` \| `"undefined"`

Defined in: [types/common.ts:415](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L415)

How to handle missing optional fields

- "zero": Return 0 for missing optional fields
- "undefined": Return undefined for missing optional fields (default)
