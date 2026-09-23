[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:3303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3303)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3304)

---

### socketTransferTimeoutMs?

> `optional` **socketTransferTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3306)

Combined offer and commit budget, before any retry. Defaults to 60s.

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:3307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3307)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`, `deadlineAt?`) => `void`

Defined in: [types/proxy.ts:3308](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3308)

#### Parameters

##### generation

`number`

##### socket

[`TransferableProxySocket`](TransferableProxySocket.md)

##### callback

(`error?`) => `void`

##### deadlineAt?

`number`

#### Returns

`void`

---

### terminate

> **terminate**: (`signal?`) => `void`

Defined in: [types/proxy.ts:3315](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3315)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3316)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3319)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
