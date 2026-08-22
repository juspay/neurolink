[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEEventHandlers

# Type Alias: SSEEventHandlers

> **SSEEventHandlers** = `object`

Defined in: [types/client.ts:1448](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1448)

SSE event handlers

## Properties

### onOpen?

> `optional` **onOpen?**: () => `void`

Defined in: [types/client.ts:1449](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1449)

#### Returns

`void`

---

### onClose?

> `optional` **onClose?**: () => `void`

Defined in: [types/client.ts:1450](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1450)

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Defined in: [types/client.ts:1451](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1451)

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/client.ts:1452](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1452)

#### Parameters

##### event

[`ClientStreamEvent`](ClientStreamEvent.md)

#### Returns

`void`

---

### onReconnect?

> `optional` **onReconnect?**: (`attempt`) => `void`

Defined in: [types/client.ts:1453](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1453)

#### Parameters

##### attempt

`number`

#### Returns

`void`

---

### onStateChange?

> `optional` **onStateChange?**: (`state`) => `void`

Defined in: [types/client.ts:1454](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1454)

#### Parameters

##### state

[`SSEState`](SSEState.md)

#### Returns

`void`
