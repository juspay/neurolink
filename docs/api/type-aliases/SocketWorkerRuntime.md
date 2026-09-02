[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:2864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2864)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:2865](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2865)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:2866](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2866)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:2867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2867)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:2868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2868)

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
