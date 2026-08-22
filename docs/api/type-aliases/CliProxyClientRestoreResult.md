[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyClientRestoreResult

# Type Alias: CliProxyClientRestoreResult

> **CliProxyClientRestoreResult** = `object`

Defined in: [types/proxyClient.ts:46](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L46)

Outcome of restoring one configurator.

## Properties

### id

> **id**: `string`

Defined in: [types/proxyClient.ts:47](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L47)

---

### displayName

> **displayName**: `string`

Defined in: [types/proxyClient.ts:48](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L48)

---

### restored

> **restored**: `boolean`

Defined in: [types/proxyClient.ts:50](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L50)

True only when a previous configuration was actually restored.

---

### error?

> `optional` **error?**: `Error`

Defined in: [types/proxyClient.ts:51](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L51)
