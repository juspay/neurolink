[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:2833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2833)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:2834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2834)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:2835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2835)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:2836](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2836)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:2837](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2837)

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
