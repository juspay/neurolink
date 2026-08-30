[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:2699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2699)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:2700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2700)

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:2701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2701)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`) => `void`

Defined in: [types/proxy.ts:2702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2702)

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

Defined in: [types/proxy.ts:2707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2707)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:2708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2708)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:2711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2711)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
