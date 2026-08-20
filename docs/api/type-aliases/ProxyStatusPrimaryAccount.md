[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:2811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2811)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:2812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2812)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:2813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2813)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:2814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2814)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:2815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2815)
