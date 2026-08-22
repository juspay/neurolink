[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:2801](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2801)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:2802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2802)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:2803](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2803)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:2804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2804)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:2805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2805)
