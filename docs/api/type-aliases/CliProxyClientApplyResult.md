[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyClientApplyResult

# Type Alias: CliProxyClientApplyResult

> **CliProxyClientApplyResult** = `object`

Defined in: [types/proxyClient.ts:36](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L36)

Outcome of applying one configurator, for per-client CLI reporting.

## Properties

### id

> **id**: `string`

Defined in: [types/proxyClient.ts:37](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L37)

---

### displayName

> **displayName**: `string`

Defined in: [types/proxyClient.ts:38](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L38)

---

### applied

> **applied**: `boolean`

Defined in: [types/proxyClient.ts:40](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L40)

True only when the configurator actually wrote configuration.

---

### error?

> `optional` **error?**: `Error`

Defined in: [types/proxyClient.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L42)

Present when the configurator threw; the caller decides how loud to be.
