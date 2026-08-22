[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PinnedAddress

# Type Alias: PinnedAddress

> **PinnedAddress** = `object`

Defined in: [types/safeFetch.ts:12](https://github.com/juspay/neurolink/blob/release/src/lib/types/safeFetch.ts#L12)

One validated address the pinned connect layer is allowed to dial.
Produced by `ssrfGuard.ts:validateAndResolveUrl`, consumed by
`safeFetch.ts:buildPinnedAgent`.

## Properties

### ip

> **ip**: `string`

Defined in: [types/safeFetch.ts:13](https://github.com/juspay/neurolink/blob/release/src/lib/types/safeFetch.ts#L13)

---

### family

> **family**: `4` \| `6`

Defined in: [types/safeFetch.ts:14](https://github.com/juspay/neurolink/blob/release/src/lib/types/safeFetch.ts#L14)
