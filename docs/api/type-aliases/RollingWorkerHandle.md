[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:2736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2736)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:2737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2737)

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:2738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2738)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`) => `void`

Defined in: [types/proxy.ts:2739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2739)

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

Defined in: [types/proxy.ts:2744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2744)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:2745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2745)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:2748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2748)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
