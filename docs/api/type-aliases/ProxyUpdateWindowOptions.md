[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowOptions

# Type Alias: ProxyUpdateWindowOptions

> **ProxyUpdateWindowOptions** = `object`

Defined in: [types/proxy.ts:2908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2908)

Dependencies and timing controls for the updater's safe-window coordinator.

## Properties

### quietThresholdMs

> **quietThresholdMs**: `number`

Defined in: [types/proxy.ts:2909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2909)

---

### quietWaitMs

> **quietWaitMs**: `number`

Defined in: [types/proxy.ts:2910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2910)

---

### drainWaitMs

> **drainWaitMs**: `number`

Defined in: [types/proxy.ts:2911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2911)

---

### pollIntervalMs

> **pollIntervalMs**: `number`

Defined in: [types/proxy.ts:2912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2912)

---

### getActivity

> **getActivity**: () => `Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

Defined in: [types/proxy.ts:2913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2913)

#### Returns

`Promise`\<[`ProxyRuntimeActivity`](ProxyRuntimeActivity.md) \| `null`\>

---

### setDraining

> **setDraining**: (`draining`) => `Promise`\<`boolean`\>

Defined in: [types/proxy.ts:2914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2914)

#### Parameters

##### draining

`boolean`

#### Returns

`Promise`\<`boolean`\>

---

### isStopping

> **isStopping**: () => `boolean`

Defined in: [types/proxy.ts:2915](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2915)

#### Returns

`boolean`

---

### isParentAlive

> **isParentAlive**: () => `boolean`

Defined in: [types/proxy.ts:2916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2916)

#### Returns

`boolean`

---

### onPhase?

> `optional` **onPhase?**: (`phase`, `activity`) => `void`

Defined in: [types/proxy.ts:2917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2917)

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

Defined in: [types/proxy.ts:2921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2921)

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2922)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
