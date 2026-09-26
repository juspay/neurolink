[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisorOptions

# Type Alias: UpdaterWorkerSupervisorOptions

> **UpdaterWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:3330](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3330)

Dependencies and callbacks used to supervise the updater worker process.

## Properties

### spawnWorker

> **spawnWorker**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3331](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3331)

#### Returns

`number` \| `undefined`

---

### isProcessRunning

> **isProcessRunning**: (`pid`) => `boolean`

Defined in: [types/proxy.ts:3332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3332)

#### Parameters

##### pid

`number`

#### Returns

`boolean`

---

### stopWorker

> **stopWorker**: (`pid`) => `void`

Defined in: [types/proxy.ts:3333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3333)

#### Parameters

##### pid

`number`

#### Returns

`void`

---

### onPidChange?

> `optional` **onPidChange?**: (`pid`) => `void`

Defined in: [types/proxy.ts:3334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3334)

#### Parameters

##### pid

`number` \| `undefined`

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3335)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### intervalMs?

> `optional` **intervalMs?**: `number`

Defined in: [types/proxy.ts:3336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3336)
