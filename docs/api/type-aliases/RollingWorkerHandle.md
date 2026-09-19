[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:3200](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3200)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3201)

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:3202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3202)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`) => `void`

Defined in: [types/proxy.ts:3203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3203)

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

Defined in: [types/proxy.ts:3208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3208)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3209)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3212](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3212)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
