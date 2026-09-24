[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:3479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3479)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:3480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3480)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:3481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3481)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:3482](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3482)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:3483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3483)

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
