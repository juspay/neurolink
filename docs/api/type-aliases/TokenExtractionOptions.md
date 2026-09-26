[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenExtractionOptions

# Type Alias: TokenExtractionOptions

> **TokenExtractionOptions** = `object`

Options for token extraction from raw usage objects.

## Properties

### calculateCacheSavings?

> `optional` **calculateCacheSavings?**: `boolean`

Whether to calculate cache savings percentage

#### Default

```ts
true;
```

---

### missingOptionalBehavior?

> `optional` **missingOptionalBehavior?**: `"zero"` \| `"undefined"`

How to handle missing optional fields

- "zero": Return 0 for missing optional fields
- "undefined": Return undefined for missing optional fields (default)
