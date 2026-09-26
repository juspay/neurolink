[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisorOptions

# Type Alias: UpdaterWorkerSupervisorOptions

> **UpdaterWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:3270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3270)

Dependencies and callbacks used to supervise the updater worker process.

## Properties

### spawnWorker

> **spawnWorker**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3271)

#### Returns

`number` \| `undefined`

---

### isProcessRunning

> **isProcessRunning**: (`pid`) => `boolean`

Defined in: [types/proxy.ts:3272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3272)

#### Parameters

##### pid

`number`

#### Returns

`boolean`

---

### stopWorker

> **stopWorker**: (`pid`) => `void`

Defined in: [types/proxy.ts:3273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3273)

#### Parameters

##### pid

`number`

#### Returns

`void`

---

### onPidChange?

> `optional` **onPidChange?**: (`pid`) => `void`

Defined in: [types/proxy.ts:3274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3274)

#### Parameters

##### pid

`number` \| `undefined`

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3275)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### intervalMs?

> `optional` **intervalMs?**: `number`

Defined in: [types/proxy.ts:3276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3276)
