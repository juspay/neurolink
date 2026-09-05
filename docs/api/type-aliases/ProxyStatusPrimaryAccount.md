[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:2916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2916)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:2917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2917)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:2918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2918)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:2919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2919)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:2920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2920)
