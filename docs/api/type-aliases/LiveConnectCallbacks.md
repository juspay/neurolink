[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1098](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1098)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1099](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1099)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1100](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1100)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1101](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1101)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1102](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1102)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
