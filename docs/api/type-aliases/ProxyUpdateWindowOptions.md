[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:2560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2560)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:2561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2561)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:2562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2562)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:2563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2563)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:2564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2564)

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:2565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2565)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:2566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2566)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:2567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2567)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:2568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2568)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:2569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2569)

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

Defined in: [types/proxy.ts:2573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2573)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2574)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
