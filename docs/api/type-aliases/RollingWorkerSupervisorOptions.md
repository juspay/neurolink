[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorOptions

# Type Alias: RollingWorkerSupervisorOptions

> **RollingWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:3394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3394)

## Properties

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3395)

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

Defined in: [types/proxy.ts:3399](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3399)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3400)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3402)

Bound IPC socket offers independently of active HTTP requests.

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3403](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3403)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3404](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3404)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3405)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3406)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### onReplacementRequested?

> `optional` **onReplacementRequested?**: (`request`) => `void`

Defined in: [types/proxy.ts:3407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3407)

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

Defined in: [types/proxy.ts:3416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3416)

#### Parameters

##### message

`string`

#### Returns

`void`
