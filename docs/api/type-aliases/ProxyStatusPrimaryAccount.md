[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:2878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2878)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:2879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2879)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:2880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2880)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:2881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2881)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:2882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2882)
