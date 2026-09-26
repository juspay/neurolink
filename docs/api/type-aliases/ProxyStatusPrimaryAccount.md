[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:3653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3653)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:3654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3654)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:3655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3655)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:3656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3656)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:3657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3657)
