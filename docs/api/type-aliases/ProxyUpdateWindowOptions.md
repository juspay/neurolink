[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:3131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3131)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:3132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3132)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:3133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3133)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:3134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3134)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:3135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3135)

---

### allowBusyDrain?

> `optional` **allowBusyDrain?**: `boolean`

Defined in: [types/proxy.ts:3137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3137)

Automatic supervisor refresh must defer instead of draining busy traffic.

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:3138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3138)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:3139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3139)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:3140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3140)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:3141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3141)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:3142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3142)

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

Defined in: [types/proxy.ts:3146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3146)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3147)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
