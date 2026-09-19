[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:3038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3038)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:3039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3039)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:3040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3040)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:3041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3041)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:3042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3042)

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:3043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3043)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:3044](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3044)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:3045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3045)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:3046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3046)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:3047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3047)

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

Defined in: [types/proxy.ts:3051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3051)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3052)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
