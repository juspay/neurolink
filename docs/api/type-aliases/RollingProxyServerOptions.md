[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

## Properties

### host

> **host**: `string`

---

### port

> **port**: `number`

---

### initialVersion

> **initialVersion**: `string`

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

#### Parameters

##### generation

`number`

##### expectedVersion

`string`

#### Returns

[`RollingWorkerHandle`](RollingWorkerHandle.md)

---

### readyTimeoutMs?

> `optional` **readyTimeoutMs?**: `number`

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

---

### stallReplacementDelayMs?

> `optional` **stallReplacementDelayMs?**: `number`

Backoff after failed pressure-induced replacement, while old worker serves.

---

### maxStallReplacementDelayMs?

> `optional` **maxStallReplacementDelayMs?**: `number`

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

#### Parameters

##### message

`string`

#### Returns

`void`
