[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WSClientEventHandlers

# Type Alias: WSClientEventHandlers

> **WSClientEventHandlers** = `object`

Defined in: [types/client.ts:1028](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1028)

Event handlers for the dedicated NeuroLinkWebSocket client

## Properties

### onOpen?

> `optional` **onOpen?**: () => `void`

Defined in: [types/client.ts:1029](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1029)

#### Returns

`void`

---

### onClose?

> `optional` **onClose?**: (`code`, `reason`) => `void`

Defined in: [types/client.ts:1030](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1030)

#### Parameters

##### code

`number`

##### reason

`string`

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Defined in: [types/client.ts:1031](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1031)

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### onMessage?

> `optional` **onMessage?**: (`event`) => `void`

Defined in: [types/client.ts:1032](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1032)

#### Parameters

##### event

[`ClientStreamEvent`](ClientStreamEvent.md)

#### Returns

`void`

---

### onReconnect?

> `optional` **onReconnect?**: (`attempt`) => `void`

Defined in: [types/client.ts:1033](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1033)

#### Parameters

##### attempt

`number`

#### Returns

`void`

---

### onStateChange?

> `optional` **onStateChange?**: (`state`) => `void`

Defined in: [types/client.ts:1034](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1034)

#### Parameters

##### state

[`WSClientState`](WSClientState.md)

#### Returns

`void`
