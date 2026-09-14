[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:3143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3143)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:3144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3144)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:3145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3145)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:3146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3146)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3147)

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

Defined in: [types/proxy.ts:3151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3151)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3152)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3153)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3154)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3155)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3156)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3157)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3158)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3159)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3160)

#### Parameters

##### message

`string`

#### Returns

`void`
