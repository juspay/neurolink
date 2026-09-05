[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStatusPrimaryAccount

# Type Alias: ProxyStatusPrimaryAccount

> **ProxyStatusPrimaryAccount** = `object`

Defined in: [types/proxy.ts:2929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2929)

Primary-account info exposed by the proxy `/status` endpoint.
`source` is "configured" when the operator's `routing.primaryAccount` is
authenticated and enabled, otherwise "fallback" — either no primary set
or the configured one is missing/disabled.

## Properties

### configured

> **configured**: `string` \| `null`

Defined in: [types/proxy.ts:2930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2930)

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxy.ts:2931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2931)

---

### label

> **label**: `string` \| `null`

Defined in: [types/proxy.ts:2932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2932)

---

### source

> **source**: `"configured"` \| `"fallback"`

Defined in: [types/proxy.ts:2933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2933)
