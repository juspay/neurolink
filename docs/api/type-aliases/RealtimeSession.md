[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeSession

# Type Alias: RealtimeSession

> **RealtimeSession** = `object`

Defined in: [types/realtime.ts:94](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L94)

Realtime session information

## Properties

### id

> **id**: `string`

Defined in: [types/realtime.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L96)

Session ID

---

### state

> **state**: [`RealtimeSessionState`](RealtimeSessionState.md)

Defined in: [types/realtime.ts:98](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L98)

Current state

---

### provider

> **provider**: [`RealtimeConfig`](RealtimeConfig.md)\[`"provider"`\]

Defined in: [types/realtime.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L101)

Provider name — narrowed to the validated config provider union so
session state stays aligned with what `connect()` accepts.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/realtime.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L103)

Model being used

---

### createdAt

> **createdAt**: `Date`

Defined in: [types/realtime.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L105)

Session creation time

---

### lastActivityAt

> **lastActivityAt**: `Date`

Defined in: [types/realtime.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L107)

Last activity time

---

### config

> **config**: [`RealtimeConfig`](RealtimeConfig.md)

Defined in: [types/realtime.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L109)

Session configuration

---

### isOpen?

> `optional` **isOpen?**: () => `boolean`

Defined in: [types/realtime.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L111)

Check if session is open

#### Returns

`boolean`

---

### close?

> `optional` **close?**: () => `Promise`\<`void`\>

Defined in: [types/realtime.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L113)

Close the session

#### Returns

`Promise`\<`void`\>
