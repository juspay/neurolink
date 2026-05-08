[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEEventHandlers

# Type Alias: SSEEventHandlers

> **SSEEventHandlers** = `object`

Defined in: [types/client.ts:1448](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1448)

SSE event handlers

## Properties

### onOpen?

> `optional` **onOpen?**: () => `void`

Defined in: [types/client.ts:1449](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1449)

#### Returns

`void`

---

### onClose?

> `optional` **onClose?**: () => `void`

Defined in: [types/client.ts:1450](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1450)

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Defined in: [types/client.ts:1451](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1451)

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/client.ts:1452](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1452)

#### Parameters

##### event

[`ClientStreamEvent`](ClientStreamEvent.md)

#### Returns

`void`

---

### onReconnect?

> `optional` **onReconnect?**: (`attempt`) => `void`

Defined in: [types/client.ts:1453](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1453)

#### Parameters

##### attempt

`number`

#### Returns

`void`

---

### onStateChange?

> `optional` **onStateChange?**: (`state`) => `void`

Defined in: [types/client.ts:1454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1454)

#### Parameters

##### state

[`SSEState`](SSEState.md)

#### Returns

`void`
