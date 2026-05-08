[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeMessage

# Type Alias: RealtimeMessage

> **RealtimeMessage** = `object`

Defined in: [types/realtime.ts:151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L151)

Realtime message

## Properties

### type

> **type**: [`RealtimeMessageType`](RealtimeMessageType.md)

Defined in: [types/realtime.ts:153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L153)

Message type

---

### id?

> `optional` **id?**: `string`

Defined in: [types/realtime.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L155)

Message ID

---

### audio?

> `optional` **audio?**: [`RealtimeAudioChunk`](RealtimeAudioChunk.md)

Defined in: [types/realtime.ts:157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L157)

Audio data (for audio messages)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/realtime.ts:159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L159)

Text content (for text/transcript messages)

---

### isPartial?

> `optional` **isPartial?**: `boolean`

Defined in: [types/realtime.ts:161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L161)

Whether this is a partial result

---

### functionCall?

> `optional` **functionCall?**: `object`

Defined in: [types/realtime.ts:163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L163)

Function call data

#### name

> **name**: `string`

#### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

---

### functionResult?

> `optional` **functionResult?**: `object`

Defined in: [types/realtime.ts:168](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L168)

Function result data

#### name

> **name**: `string`

#### result

> **result**: `unknown`

---

### error?

> `optional` **error?**: `object`

Defined in: [types/realtime.ts:173](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L173)

Error information

#### code

> **code**: `string`

#### message

> **message**: `string`

---

### timestamp

> **timestamp**: `Date`

Defined in: [types/realtime.ts:178](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L178)

Timestamp
