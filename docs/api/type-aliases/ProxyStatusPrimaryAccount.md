[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:3251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3251)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:3252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3252)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:3253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3253)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:3254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3254)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:3255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3255)
