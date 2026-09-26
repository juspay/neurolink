[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:3258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3258)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:3259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3259)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:3260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3260)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:3261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3261)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:3262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3262)

---

### allowBusyDrain?

> `optional` **allowBusyDrain?**: `boolean`

Defined in: [types/proxy.ts:3264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3264)

Automatic supervisor refresh must defer instead of draining busy traffic.

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:3265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3265)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:3266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3266)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:3267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3267)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:3268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3268)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:3269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3269)

#### Parameters

##### phase

`"waiting_for_quiet"` \| `"draining"` \| `"drain_timeout"`

##### activity

[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`

#### Returns

`void`

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:3273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3273)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3274)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
