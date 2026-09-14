[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:3192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3192)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:3193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3193)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:3194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3194)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:3195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3195)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:3196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3196)

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
