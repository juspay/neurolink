[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:2569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2569)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:2570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2570)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:2571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2571)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:2572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2572)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:2573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2573)

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:2574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2574)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:2575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2575)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:2576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2576)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:2577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2577)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:2578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2578)

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

Defined in: [types/proxy.ts:2582](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2582)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2583](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2583)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
