[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:3419](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3419)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:3420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3420)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:3421](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3421)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:3422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3422)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3423](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3423)

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

Defined in: [types/proxy.ts:3427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3427)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3428)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3429)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3430)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3431)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3432)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3433)

---

### stallReplacementDelayMs?

> `optional` **stallReplacementDelayMs?**: `number`

Defined in: [types/proxy.ts:3435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3435)

Backoff after failed pressure-induced replacement, while old worker serves.

---

### maxStallReplacementDelayMs?

> `optional` **maxStallReplacementDelayMs?**: `number`

Defined in: [types/proxy.ts:3436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3436)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3437)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3438)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3439)

#### Parameters

##### message

`string`

#### Returns

`void`
