[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:3248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3248)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:3249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3249)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:3250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3250)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:3251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3251)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:3252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3252)

---

### allowBusyDrain?

> `optional` **allowBusyDrain?**: `boolean`

Defined in: [types/proxy.ts:3254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3254)

Automatic supervisor refresh must defer instead of draining busy traffic.

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:3255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3255)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:3256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3256)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:3257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3257)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:3258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3258)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:3259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3259)

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

Defined in: [types/proxy.ts:3263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3263)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3264)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
