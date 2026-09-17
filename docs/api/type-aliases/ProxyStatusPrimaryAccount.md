[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:3255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3255)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:3256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3256)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:3257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3257)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:3258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3258)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:3259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3259)
