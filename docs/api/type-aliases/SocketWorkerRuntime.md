[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:2884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2884)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:2885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2885)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:2886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2886)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:2887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2887)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:2888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2888)

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
