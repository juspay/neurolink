[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorOptions

# Type Alias: RollingWorkerSupervisorOptions

> **RollingWorkerSupervisorOptions** = `object`

## Properties

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

Bound IPC socket offers independently of active HTTP requests.

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

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

### onReplacementRequested?

> `optional` **onReplacementRequested?**: (`request`) => `void`

#### Parameters

##### request

###### generation

`number`

###### pid

`number`

###### reason

`"environment"` \| `"socket_offer_timeout"` \| `"socket_commit_timeout"` \| `"socket_transfer_failure"`

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
