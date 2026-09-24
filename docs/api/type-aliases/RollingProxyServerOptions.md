[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:3422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3422)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:3423](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3423)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:3424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3424)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:3425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3425)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3426)

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

Defined in: [types/proxy.ts:3430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3430)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3431)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3432)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3433)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3434)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3435)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3436)

---

### stallReplacementDelayMs?

> `optional` **stallReplacementDelayMs?**: `number`

Defined in: [types/proxy.ts:3438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3438)

Backoff after failed pressure-induced replacement, while old worker serves.

---

### maxStallReplacementDelayMs?

> `optional` **maxStallReplacementDelayMs?**: `number`

Defined in: [types/proxy.ts:3439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3439)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3440)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3441)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3442)

#### Parameters

##### message

`string`

#### Returns

`void`
