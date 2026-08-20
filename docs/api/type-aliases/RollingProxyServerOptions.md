[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:2719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2719)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:2720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2720)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:2721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2721)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:2722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2722)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:2723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2723)

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

Defined in: [types/proxy.ts:2727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2727)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:2728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2728)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2729)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2730)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:2731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2731)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:2732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2732)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:2733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2733)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:2734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2734)

#### Parameters

##### message

`string`

#### Returns

`void`
