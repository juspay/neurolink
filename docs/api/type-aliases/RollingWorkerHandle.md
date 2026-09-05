[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:2742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2742)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:2743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2743)

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:2744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2744)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`) => `void`

Defined in: [types/proxy.ts:2745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2745)

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

Defined in: [types/proxy.ts:2750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2750)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:2751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2751)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:2754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2754)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
