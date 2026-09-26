[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:3549](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3549)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:3550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3550)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:3551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3551)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:3552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3552)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3553)

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

Defined in: [types/proxy.ts:3557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3557)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3558](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3558)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3559)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3560)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3561)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3562)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3563)

---

### stallReplacementDelayMs?

> `optional` **stallReplacementDelayMs?**: `number`

Defined in: [types/proxy.ts:3565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3565)

Backoff after failed pressure-induced replacement, while old worker serves.

---

### maxStallReplacementDelayMs?

> `optional` **maxStallReplacementDelayMs?**: `number`

Defined in: [types/proxy.ts:3566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3566)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3567)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3568)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3569)

#### Parameters

##### message

`string`

#### Returns

`void`
