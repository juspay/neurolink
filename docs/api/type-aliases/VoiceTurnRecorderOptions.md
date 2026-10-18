[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoiceTurnRecorderOptions

# Type Alias: VoiceTurnRecorderOptions

> **VoiceTurnRecorderOptions** = `object`

Options for `createVoiceTurnRecorder`.

## Properties

### write

> **write**: (`record`) => `Promise`\<`void`\>

Stores one exchange. Throwing means "not stored"; the recorder retries.

#### Parameters

##### record

[`VoiceTurnRecord`](VoiceTurnRecord.md)

#### Returns

`Promise`\<`void`\>

---

### onClosed?

> `optional` **onClosed?**: (`record`) => `void`

An exchange closed: called once per exchange, in order, before its write is queued, so it never waits behind earlier writes.

#### Parameters

##### record

[`VoiceTurnRecord`](VoiceTurnRecord.md)

#### Returns

`void`

---

### onRecorded?

> `optional` **onRecorded?**: (`record`) => `void`

A write succeeded.

#### Parameters

##### record

[`VoiceTurnRecord`](VoiceTurnRecord.md)

#### Returns

`void`

---

### onPermanentFailure?

> `optional` **onPermanentFailure?**: (`record`, `error`) => `void`

A write failed after every retry. The call continues.

#### Parameters

##### record

[`VoiceTurnRecord`](VoiceTurnRecord.md)

##### error

`unknown`

#### Returns

`void`

---

### settleMs?

> `optional` **settleMs?**: `number`

How long a closed reply waits for its user transcript (default 1500 ms).

---

### retries?

> `optional` **retries?**: `number`

Retries after the first failed attempt (default 2).

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Base delay between attempts; grows linearly (default 250 ms).

---

### callEndedNote?

> `optional` **callEndedNote?**: `string`

Appended to a reply that was cut off by the call ending.

---

### noReplyNote?

> `optional` **noReplyNote?**: `string`

Stored as the reply when the call ended with the user's turn unanswered.

---

### callId?

> `optional` **callId?**: `string`

Prefix of synthetic turn ids (default: a random id).

---

### now?

> `optional` **now?**: () => `number`

Clock, for tests.

#### Returns

`number`
