[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1096](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1096)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1097](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1097)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1098](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1098)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1099](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1099)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1100](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1100)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
