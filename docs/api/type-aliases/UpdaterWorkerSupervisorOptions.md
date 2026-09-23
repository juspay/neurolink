[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdaterWorkerSupervisorOptions

# Type Alias: UpdaterWorkerSupervisorOptions

> **UpdaterWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:3180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3180)

Dependencies and callbacks used to supervise the updater worker process.

## Properties

### spawnWorker

> **spawnWorker**: () => `number` \| `undefined`

Defined in: [types/proxy.ts:3181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3181)

#### Returns

`number` \| `undefined`

---

### isProcessRunning

> **isProcessRunning**: (`pid`) => `boolean`

Defined in: [types/proxy.ts:3182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3182)

#### Parameters

##### pid

`number`

#### Returns

`boolean`

---

### stopWorker

> **stopWorker**: (`pid`) => `void`

Defined in: [types/proxy.ts:3183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3183)

#### Parameters

##### pid

`number`

#### Returns

`void`

---

### onPidChange?

> `optional` **onPidChange?**: (`pid`) => `void`

Defined in: [types/proxy.ts:3184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3184)

#### Parameters

##### pid

`number` \| `undefined`

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3185)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### intervalMs?

> `optional` **intervalMs?**: `number`

Defined in: [types/proxy.ts:3186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3186)
