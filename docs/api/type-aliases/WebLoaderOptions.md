[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebLoaderOptions

# Type Alias: WebLoaderOptions

> **WebLoaderOptions** = [`LoaderOptions`](LoaderOptions.md) & `object`

Defined in: [types/rag.ts:555](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L555)

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
