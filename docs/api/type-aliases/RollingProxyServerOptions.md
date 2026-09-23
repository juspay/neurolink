[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:3399](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3399)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:3400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3400)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:3401](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3401)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:3402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3402)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3403](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3403)

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

Defined in: [types/proxy.ts:3407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3407)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3408](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3408)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3409](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3409)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3410)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3411](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3411)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3412](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3412)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3413](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3413)

---

### stallReplacementDelayMs?

> `optional` **stallReplacementDelayMs?**: `number`

Defined in: [types/proxy.ts:3415](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3415)

Backoff after failed pressure-induced replacement, while old worker serves.

---

### maxStallReplacementDelayMs?

> `optional` **maxStallReplacementDelayMs?**: `number`

Defined in: [types/proxy.ts:3416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3416)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3417](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3417)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3418)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

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
