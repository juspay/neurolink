[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WSClientEventHandlers

# Type Alias: WSClientEventHandlers

> **WSClientEventHandlers** = `object`

Event handlers for the dedicated NeuroLinkWebSocket client

## Properties

### onOpen?

> `optional` **onOpen?**: () => `void`

#### Returns

`void`

---

### onClose?

> `optional` **onClose?**: (`code`, `reason`) => `void`

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

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### onMessage?

> `optional` **onMessage?**: (`event`) => `void`

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

[`WSClientState`](WSClientState.md)

#### Returns

`void`
