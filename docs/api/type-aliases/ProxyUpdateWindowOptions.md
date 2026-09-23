[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:3108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3108)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:3109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3109)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:3110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3110)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:3111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3111)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:3112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3112)

---

### allowBusyDrain?

> `optional` **allowBusyDrain?**: `boolean`

Defined in: [types/proxy.ts:3114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3114)

Automatic supervisor refresh must defer instead of draining busy traffic.

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:3115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3115)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:3116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3116)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:3117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3117)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:3118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3118)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:3119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3119)

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

Defined in: [types/proxy.ts:3123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3123)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3124)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
