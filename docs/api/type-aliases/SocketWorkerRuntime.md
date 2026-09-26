[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:3606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3606)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:3607](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3607)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:3608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3608)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:3609](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3609)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:3610](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3610)

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
