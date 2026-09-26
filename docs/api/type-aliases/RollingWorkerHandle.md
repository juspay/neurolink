[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:3433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3433)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3434)

---

### socketTransferTimeoutMs?

> `optional` **socketTransferTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3436)

Combined offer and commit budget, before any retry. Defaults to 60s.

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:3437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3437)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`, `deadlineAt?`) => `void`

Defined in: [types/proxy.ts:3438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3438)

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

Defined in: [types/proxy.ts:3445](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3445)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3446](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3446)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3449)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
