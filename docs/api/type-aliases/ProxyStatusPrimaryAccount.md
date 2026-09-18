[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:3276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3276)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:3277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3277)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:3278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3278)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:3279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3279)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:3280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3280)
