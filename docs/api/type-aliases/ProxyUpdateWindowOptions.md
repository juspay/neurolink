[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:2883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2883)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:2884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2884)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:2885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2885)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:2886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2886)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:2887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2887)

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:2888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2888)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:2889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2889)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:2890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2890)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:2891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2891)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:2892](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2892)

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

Defined in: [types/proxy.ts:2896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2896)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2897)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
