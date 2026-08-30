[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisorOptions

# Type Alias: UpdaterWorkerSupervisorOptions

> **UpdaterWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:2608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2608)

Dependencies and callbacks used to supervise the updater worker process.

## Properties

### spawnWorker

> **spawnWorker**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2609](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2609)

#### Returns

`number` \| `undefined`

---

### isProcessRunning

> **isProcessRunning**: (`pid`) => `boolean`

Defined in: [types/proxy.ts:2610](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2610)

#### Parameters

##### pid

`number`

#### Returns

`boolean`

---

### stopWorker

> **stopWorker**: (`pid`) => `void`

Defined in: [types/proxy.ts:2611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2611)

#### Parameters

##### pid

`number`

#### Returns

`void`

---

### onPidChange?

> `optional` **onPidChange?**: (`pid`) => `void`

Defined in: [types/proxy.ts:2612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2612)

#### Parameters

##### pid

`number` \| `undefined`

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:2613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2613)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### intervalMs?

> `optional` **intervalMs?**: `number`

Defined in: [types/proxy.ts:2614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2614)
