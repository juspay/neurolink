[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:3070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3070)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3071)

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:3072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3072)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`) => `void`

Defined in: [types/proxy.ts:3073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3073)

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

Defined in: [types/proxy.ts:3078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3078)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3079)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3082)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
