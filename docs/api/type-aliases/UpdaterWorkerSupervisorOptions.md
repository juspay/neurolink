[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisorOptions

# Type Alias: UpdaterWorkerSupervisorOptions

> **UpdaterWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:2651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2651)

Dependencies and callbacks used to supervise the updater worker process.

## Properties

### spawnWorker

> **spawnWorker**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2652)

#### Returns

`number` \| `undefined`

---

### isProcessRunning

> **isProcessRunning**: (`pid`) => `boolean`

Defined in: [types/proxy.ts:2653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2653)

#### Parameters

##### pid

`number`

#### Returns

`boolean`

---

### stopWorker

> **stopWorker**: (`pid`) => `void`

Defined in: [types/proxy.ts:2654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2654)

#### Parameters

##### pid

`number`

#### Returns

`void`

---

### onPidChange?

> `optional` **onPidChange?**: (`pid`) => `void`

Defined in: [types/proxy.ts:2655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2655)

#### Parameters

##### pid

`number` \| `undefined`

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:2656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2656)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### intervalMs?

> `optional` **intervalMs?**: `number`

Defined in: [types/proxy.ts:2657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2657)
