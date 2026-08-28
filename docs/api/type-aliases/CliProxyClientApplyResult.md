[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyClientApplyResult

# Type Alias: CliProxyClientApplyResult

> **CliProxyClientApplyResult** = `object`

Defined in: [types/proxyClient.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L47)

Outcome of applying one configurator, for per-client CLI reporting.

## Properties

### id

> **id**: `string`

Defined in: [types/proxyClient.ts:48](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L48)

---

### displayName

> **displayName**: `string`

Defined in: [types/proxyClient.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L49)

---

### applied

> **applied**: `boolean`

Defined in: [types/proxyClient.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L51)

True only when the configurator actually wrote configuration.

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxyClient.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L57)

Set when the write landed but is not yet in effect — see
CliProxyClientConfigurator.postApplyNote. Callers must render this; a
silent note is the failure it exists to prevent.

---

### error?

> `optional` **error?**: `Error`

Defined in: [types/proxyClient.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L59)

Present when the configurator threw; the caller decides how loud to be.
