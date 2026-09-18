[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:3182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3182)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:3183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3183)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:3184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3184)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:3185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3185)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3186)

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

Defined in: [types/proxy.ts:3190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3190)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3191)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3192)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3193)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3194)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3195)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3196)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3197)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3198)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3199)

#### Parameters

##### message

`string`

#### Returns

`void`
