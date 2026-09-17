[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:3210](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3210)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:3211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3211)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:3212](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3212)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:3213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3213)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:3214](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3214)

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
