[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:2581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2581)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:2582](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2582)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:2583](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2583)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:2584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2584)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:2585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2585)

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:2586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2586)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:2587](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2587)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:2588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2588)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:2589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2589)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:2590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2590)

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

Defined in: [types/proxy.ts:2594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2594)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2595)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
