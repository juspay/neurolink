[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WebLoaderOptions

# Type Alias: WebLoaderOptions

> **WebLoaderOptions** = [`LoaderOptions`](LoaderOptions.md) & `object`

Web loader options

## Type Declaration

### timeout?

> `optional` **timeout?**: `number`

Request timeout in milliseconds

### attachmentPolicy?

> `optional` **attachmentPolicy?**: [`AttachmentPolicy`](AttachmentPolicy.md)

Attachment policy for the fetch: HTTPS-only and public hosts unless it
says otherwise, redirects re-validated per hop. The environment-derived
default applies when absent.

### maxBytes?

> `optional` **maxBytes?**: `number`

Cap on the fetched document in bytes. Default 25 MiB.

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
