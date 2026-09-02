[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisorOptions

# Type Alias: UpdaterWorkerSupervisorOptions

> **UpdaterWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:2630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2630)

Dependencies and callbacks used to supervise the updater worker process.

## Properties

### spawnWorker

> **spawnWorker**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:2631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2631)

#### Returns

`number` \| `undefined`

---

### isProcessRunning

> **isProcessRunning**: (`pid`) => `boolean`

Defined in: [types/proxy.ts:2632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2632)

#### Parameters

##### pid

`number`

#### Returns

`boolean`

---

### stopWorker

> **stopWorker**: (`pid`) => `void`

Defined in: [types/proxy.ts:2633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2633)

#### Parameters

##### pid

`number`

#### Returns

`void`

---

### onPidChange?

> `optional` **onPidChange?**: (`pid`) => `void`

Defined in: [types/proxy.ts:2634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2634)

#### Parameters

##### pid

`number` \| `undefined`

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:2635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2635)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### intervalMs?

> `optional` **intervalMs?**: `number`

Defined in: [types/proxy.ts:2636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2636)
