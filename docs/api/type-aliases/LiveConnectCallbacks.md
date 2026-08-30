[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1101](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1101)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1102](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1102)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1103](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1103)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1104](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1104)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1105](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1105)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
