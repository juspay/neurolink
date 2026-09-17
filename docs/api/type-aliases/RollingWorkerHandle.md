[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:3049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3049)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3050)

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:3051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3051)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`) => `void`

Defined in: [types/proxy.ts:3052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3052)

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

Defined in: [types/proxy.ts:3057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3057)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3058)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3061](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3061)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
