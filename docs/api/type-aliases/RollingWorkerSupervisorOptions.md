[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorOptions

# Type Alias: RollingWorkerSupervisorOptions

> **RollingWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:3397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3397)

## Properties

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3398)

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

Defined in: [types/proxy.ts:3402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3402)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3403](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3403)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3405)

Bound IPC socket offers independently of active HTTP requests.

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3406)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3407)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3408](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3408)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3409](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3409)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### onReplacementRequested?

> `optional` **onReplacementRequested?**: (`request`) => `void`

Defined in: [types/proxy.ts:3410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3410)

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

Defined in: [types/proxy.ts:3419](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3419)

#### Parameters

##### message

`string`

#### Returns

`void`
