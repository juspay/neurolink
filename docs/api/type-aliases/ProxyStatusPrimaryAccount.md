[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:3237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3237)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:3238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3238)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:3239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3239)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:3240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3240)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:3241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3241)
