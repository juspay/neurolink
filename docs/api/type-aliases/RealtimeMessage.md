[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeMessage

# Type Alias: RealtimeMessage

> **RealtimeMessage** = `object`

Realtime message

## Properties

### type

> **type**: [`RealtimeMessageType`](RealtimeMessageType.md)

Message type

---

### id?

> `optional` **id?**: `string`

Message ID

---

### audio?

> `optional` **audio?**: [`RealtimeAudioChunk`](RealtimeAudioChunk.md)

Audio data (for audio messages)

---

### text?

> `optional` **text?**: `string`

Text content (for text/transcript messages)

---

### isPartial?

> `optional` **isPartial?**: `boolean`

Whether this is a partial result

---

### functionCall?

> `optional` **functionCall?**: `object`

Function call data

#### name

> **name**: `string`

#### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

---

### functionResult?

> `optional` **functionResult?**: `object`

Function result data

#### name

> **name**: `string`

#### result

> **result**: `unknown`

---

### error?

> `optional` **error?**: `object`

Error information

#### code

> **code**: `string`

#### message

> **message**: `string`

---

### timestamp

> **timestamp**: `Date`

Timestamp
