[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorOptions

# Type Alias: RollingWorkerSupervisorOptions

> **RollingWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:2816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2816)

## Properties

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:2817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2817)

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

Defined in: [types/proxy.ts:2821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2821)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:2822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2822)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:2824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2824)

Bound IPC socket offers independently of active HTTP requests.

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2825)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2826)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:2827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2827)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onReplacementRequested?

> `optional` **onReplacementRequested?**: (`request`) => `void`

Defined in: [types/proxy.ts:2828](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2828)

#### Parameters

##### request

###### generation

`number`

###### pid

`number`

###### reason

`"environment"` \| `"socket_offer_timeout"`

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:2833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2833)

#### Parameters

##### message

`string`

#### Returns

`void`
