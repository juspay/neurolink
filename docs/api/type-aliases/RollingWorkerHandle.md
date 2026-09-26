[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerHandle

# Type Alias: RollingWorkerHandle

> **RollingWorkerHandle** = `object`

## Properties

### pid

> **pid**: `number`

---

### socketTransferTimeoutMs?

> `optional` **socketTransferTimeoutMs?**: `number`

Combined offer and commit budget, before any retry. Defaults to 60s.

---

### sendControl

> **sendControl**: (`message`) => `void`

#### Parameters

##### message

[`ProxyWorkerControlMessage`](ProxyWorkerControlMessage.md)

#### Returns

`void`

---

### sendSocket

> **sendSocket**: (`generation`, `socket`, `callback`, `deadlineAt?`) => `void`

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

#### Parameters

##### signal?

`NodeJS.Signals`

#### Returns

`void`

---

### onMessage

> **onMessage**: (`listener`) => () => `void`

#### Parameters

##### listener

(`message`) => `void`

#### Returns

() => `void`

---

### onExit

> **onExit**: (`listener`) => () => `void`

#### Parameters

##### listener

(`code`, `signal`) => `void`

#### Returns

() => `void`
