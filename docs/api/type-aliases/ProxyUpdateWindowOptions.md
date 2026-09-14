[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:2869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2869)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:2870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2870)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:2871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2871)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:2872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2872)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:2873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2873)

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:2874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2874)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:2875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2875)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:2876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2876)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:2877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2877)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:2878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2878)

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

Defined in: [types/proxy.ts:2882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2882)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2883)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
