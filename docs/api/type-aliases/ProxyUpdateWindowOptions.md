[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:3198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3198)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:3199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3199)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:3200](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3200)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:3201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3201)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:3202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3202)

---

### allowBusyDrain?

> `optional` **allowBusyDrain?**: `boolean`

Defined in: [types/proxy.ts:3204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3204)

Automatic supervisor refresh must defer instead of draining busy traffic.

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:3205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3205)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:3206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3206)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:3207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3207)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:3208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3208)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:3209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3209)

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

Defined in: [types/proxy.ts:3213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3213)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3214](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3214)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
