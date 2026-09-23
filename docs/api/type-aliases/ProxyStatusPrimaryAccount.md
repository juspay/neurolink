[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:3523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3523)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:3524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3524)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:3525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3525)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:3526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3526)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:3527](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3527)
