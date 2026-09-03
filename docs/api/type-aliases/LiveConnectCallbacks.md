[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1116](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1116)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1117](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1117)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1118)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1119)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1120](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1120)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
