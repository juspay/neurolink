[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:3045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3045)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3046)

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:3047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3047)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`) => `void`

Defined in: [types/proxy.ts:3048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3048)

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

Defined in: [types/proxy.ts:3053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3053)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3054)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3057)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
