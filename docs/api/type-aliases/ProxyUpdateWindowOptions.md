[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:2575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2575)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:2576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2576)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:2577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2577)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:2578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2578)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:2579](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2579)

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:2580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2580)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:2581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2581)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:2582](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2582)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:2583](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2583)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:2584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2584)

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

Defined in: [types/proxy.ts:2588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2588)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2589)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
