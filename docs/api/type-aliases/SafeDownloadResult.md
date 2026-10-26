[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SafeDownloadResult

# Type Alias: SafeDownloadResult

> **SafeDownloadResult** = `object`

`safeDownloadWithMeta()` — the body plus what the response said about it.

## Properties

### buffer

> **buffer**: `Buffer`

---

### contentType

> **contentType**: `string`

`Content-Type` of the final response, `""` when absent.

---

### contentEncoding

> **contentEncoding**: `string`

`Content-Encoding` of the final response, `""` when absent.

---

### finalUrl

> **finalUrl**: `string`

The URL that produced the body — differs from the request URL after a redirect.

---

### redirects

> **redirects**: `number`

Redirect hops that were followed.
