[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisorOptions

# Type Alias: UpdaterWorkerSupervisorOptions

> **UpdaterWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:3203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3203)

Dependencies and callbacks used to supervise the updater worker process.

## Properties

### spawnWorker

> **spawnWorker**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3204)

#### Returns

`number` \| `undefined`

---

### isProcessRunning

> **isProcessRunning**: (`pid`) => `boolean`

Defined in: [types/proxy.ts:3205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3205)

#### Parameters

##### pid

`number`

#### Returns

`boolean`

---

### stopWorker

> **stopWorker**: (`pid`) => `void`

Defined in: [types/proxy.ts:3206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3206)

#### Parameters

##### pid

`number`

#### Returns

`void`

---

### onPidChange?

> `optional` **onPidChange?**: (`pid`) => `void`

Defined in: [types/proxy.ts:3207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3207)

#### Parameters

##### pid

`number` \| `undefined`

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3208)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### intervalMs?

> `optional` **intervalMs?**: `number`

Defined in: [types/proxy.ts:3209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3209)
