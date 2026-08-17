[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebLoaderOptions

# Type Alias: WebLoaderOptions

> **WebLoaderOptions** = [`LoaderOptions`](LoaderOptions.md) & `object`

Defined in: [types/rag.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L574)

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
