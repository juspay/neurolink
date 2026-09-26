[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEEventHandlers

# Type Alias: SSEEventHandlers

> **SSEEventHandlers** = `object`

SSE event handlers

## Properties

### onOpen?

> `optional` **onOpen?**: () => `void`

#### Returns

`void`

---

### onClose?

> `optional` **onClose?**: () => `void`

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

#### Parameters

##### event

[`ClientStreamEvent`](ClientStreamEvent.md)

#### Returns

`void`

---

### onReconnect?

> `optional` **onReconnect?**: (`attempt`) => `void`

#### Parameters

##### attempt

`number`

#### Returns

`void`

---

### onStateChange?

> `optional` **onStateChange?**: (`state`) => `void`

#### Parameters

##### state

[`SSEState`](SSEState.md)

#### Returns

`void`
