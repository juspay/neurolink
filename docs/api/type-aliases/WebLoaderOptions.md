[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebLoaderOptions

# Type Alias: WebLoaderOptions

> **WebLoaderOptions** = [`LoaderOptions`](LoaderOptions.md) & `object`

Defined in: [types/rag.ts:515](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L515)

Web loader options

## Type Declaration

### timeout?

> `optional` **timeout?**: `number`

Request timeout in milliseconds

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Custom headers for request

### extractMainContent?

> `optional` **extractMainContent?**: `boolean`

Extract only main content (remove navigation, ads, etc.)

### contentSelector?

> `optional` **contentSelector?**: `string`

Selector for main content (CSS selector)

### userAgent?

> `optional` **userAgent?**: `string`

User agent string
