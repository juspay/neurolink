[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:3546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3546)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:3547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3547)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:3548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3548)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:3549](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3549)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:3550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3550)

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
