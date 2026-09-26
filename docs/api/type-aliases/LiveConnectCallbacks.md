[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
