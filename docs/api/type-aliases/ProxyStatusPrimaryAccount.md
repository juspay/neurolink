[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:3591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3591)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:3592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3592)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:3593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3593)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:3594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3594)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:3595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3595)
