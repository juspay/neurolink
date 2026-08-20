[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:2471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2471)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:2472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2472)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:2473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2473)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:2474](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2474)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:2475](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2475)

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:2476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2476)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:2477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2477)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:2478](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2478)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:2479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2479)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:2480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2480)

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

Defined in: [types/proxy.ts:2484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2484)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2485)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
