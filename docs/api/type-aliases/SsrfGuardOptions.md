[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SsrfGuardOptions

# Type Alias: SsrfGuardOptions

> **SsrfGuardOptions** = `object`

Per-call switches for `validateAndResolveUrl()` / `assertSafeUrlForProxy()`.

## Properties

### allowInsecure?

> `optional` **allowInsecure?**: `boolean`

Accept `http:` as well as `https:`. Default false.

---

### allowPrivateNetwork?

> `optional` **allowPrivateNetwork?**: `boolean`

Skip the blocked-range check (addresses are still resolved and returned). Default false.
