[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:3231](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3231)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:3232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3232)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:3233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3233)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:3234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3234)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:3235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3235)

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
