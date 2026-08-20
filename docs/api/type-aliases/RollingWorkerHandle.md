[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:2632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2632)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:2633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2633)

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:2634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2634)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`) => `void`

Defined in: [types/proxy.ts:2635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2635)

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

Defined in: [types/proxy.ts:2640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2640)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:2641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2641)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:2644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2644)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
