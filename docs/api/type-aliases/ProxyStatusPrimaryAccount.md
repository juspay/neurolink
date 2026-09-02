[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:2900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2900)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:2901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2901)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:2902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2902)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:2903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2903)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:2904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2904)
