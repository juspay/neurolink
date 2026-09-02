[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:2721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2721)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:2722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2722)

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:2723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2723)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`) => `void`

Defined in: [types/proxy.ts:2724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2724)

#### Parameters

##### generation

`number`

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

##### callback

(`error?`) => `void`

#### Returns

`void`

---

### terminate

> **terminate**: (`signal?`) => `void`

Defined in: [types/proxy.ts:2729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2729)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:2730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2730)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:2733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2733)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
