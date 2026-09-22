[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1164](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1164)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1165](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1165)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1166](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1166)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1167](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1167)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1168](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1168)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
