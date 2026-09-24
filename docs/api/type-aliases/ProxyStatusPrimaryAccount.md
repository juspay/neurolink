[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:3643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3643)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:3644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3644)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:3645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3645)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:3646](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3646)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:3647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3647)
