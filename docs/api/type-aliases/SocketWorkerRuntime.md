[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:2855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2855)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:2856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2856)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:2857](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2857)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:2858](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2858)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:2859](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2859)

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
