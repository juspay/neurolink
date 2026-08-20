[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntime

# Type Alias: SocketWorkerRuntime

> **SocketWorkerRuntime** = `object`

Defined in: [types/proxy.ts:2766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2766)

## Properties

### acceptSocket

> **acceptSocket**: (`socket`) => `void`

Defined in: [types/proxy.ts:2767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2767)

#### Parameters

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

#### Returns

`void`

---

### drain

> **drain**: () => `void`

Defined in: [types/proxy.ts:2768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2768)

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/proxy.ts:2769](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2769)

#### Returns

`void`

---

### snapshot

> **snapshot**: () => `object`

Defined in: [types/proxy.ts:2770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2770)

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
