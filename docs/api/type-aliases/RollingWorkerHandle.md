[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

Defined in: [types/proxy.ts:3283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3283)

## Properties

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3284)

---

### socketTransferTimeoutMs?

> `optional` **socketTransferTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3286)

Combined offer and commit budget, before any retry. Defaults to 60s.

---

### sendControl

> **sendControl**: (`message`) => `void`

Defined in: [types/proxy.ts:3287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3287)

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`, `deadlineAt?`) => `void`

Defined in: [types/proxy.ts:3288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3288)

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

Defined in: [types/proxy.ts:3295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3295)

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3296](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3296)

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

Defined in: [types/proxy.ts:3299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3299)

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
