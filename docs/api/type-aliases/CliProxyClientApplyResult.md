[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyClientApplyResult

# Type Alias: CliProxyClientApplyResult

> **CliProxyClientApplyResult** = `object`

Defined in: [types/proxyClient.ts:63](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L63)

Outcome of applying one configurator, for per-client CLI reporting.

## Properties

### id

> **id**: `string`

Defined in: [types/proxyClient.ts:64](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L64)

---

### displayName

> **displayName**: `string`

Defined in: [types/proxyClient.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L65)

---

### applied

> **applied**: `boolean`

Defined in: [types/proxyClient.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L70)

True only when the CLI's configuration points at the proxy: written now,
or already written and left as it was.

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxyClient.ts:76](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L76)

Set when the write landed but is not yet in effect — see
CliProxyClientConfigurator.postApplyNote. Callers must render this; a
silent note is the failure it exists to prevent.

---

### error?

> `optional` **error?**: `Error`

Defined in: [types/proxyClient.ts:78](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L78)

Present when the configurator threw; the caller decides how loud to be.
