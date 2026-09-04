[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:2870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2870)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:2871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2871)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:2872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2872)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:2873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2873)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:2874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2874)

#### Returns

`object`

##### draining

> **draining**: `boolean`

##### sockets

> **sockets**: `number`

##### activeRequests

> **activeRequests**: `number`

##### drained

> **drained**: `boolean`
