[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:3373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3373)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3374)

---

### socketTransferTimeoutMs?

> `optional` **socketTransferTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3376)

Combined offer and commit budget, before any retry. Defaults to 60s.

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:3377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3377)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`, `deadlineAt?`) => `void`

Defined in: [types/proxy.ts:3378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3378)

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

Defined in: [types/proxy.ts:3385](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3385)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3386](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3386)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3389)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
