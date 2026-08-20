[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisorOptions

# Type Alias: UpdaterWorkerSupervisorOptions

> **UpdaterWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:2541](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2541)

Dependencies and callbacks used to supervise the updater worker process.

## Properties

### spawnWorker

> **spawnWorker**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2542](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2542)

#### Returns

`number` \| `undefined`

---

### isProcessRunning

> **isProcessRunning**: (`pid`) => `boolean`

Defined in: [types/proxy.ts:2543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2543)

#### Parameters

##### pid

`number`

#### Returns

`boolean`

---

### stopWorker

> **stopWorker**: (`pid`) => `void`

Defined in: [types/proxy.ts:2544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2544)

#### Parameters

##### pid

`number`

#### Returns

`void`

---

### onPidChange?

> `optional` **onPidChange?**: (`pid`) => `void`

Defined in: [types/proxy.ts:2545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2545)

#### Parameters

##### pid

`number` \| `undefined`

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:2546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2546)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### intervalMs?

> `optional` **intervalMs?**: `number`

Defined in: [types/proxy.ts:2547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2547)
