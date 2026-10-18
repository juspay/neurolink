[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoiceTurnRecorder

# Type Alias: VoiceTurnRecorder

> **VoiceTurnRecorder** = `object`

The recorder returned by `createVoiceTurnRecorder`.

## Properties

### userTranscript

> **userTranscript**: (`segment`) => `void`

A final transcript segment of what the user said. Interim segments are ignored.

#### Parameters

##### segment

###### text

`string`

###### final

`boolean`

#### Returns

`void`

---

### assistantDelta

> **assistantDelta**: (`delta`) => `void`

A piece of the assistant's reply as it is produced.

#### Parameters

##### delta

`string`

#### Returns

`void`

---

### assistantMessage

> **assistantMessage**: (`message`) => `void`

The assistant's message was added: the reply is complete (or was cut off).

#### Parameters

##### message

###### id

`string`

###### text

`string`

###### interrupted?

`boolean`

#### Returns

`void`

---

### expectGreeting

> **expectGreeting**: () => `void`

The next assistant-only reply is the agent's opening greeting, not an
answer: it is skipped and never paired with the user's first question.
Call it once, when the agent is about to speak its greeting.

#### Returns

`void`

---

### toolStart

> **toolStart**: (`call`) => `void`

A tool call started in the current exchange. `callId` pairs it with its end when calls overlap.

#### Parameters

##### call

###### name

`string`

###### args?

`unknown`

###### callId?

`string`

#### Returns

`void`

---

### toolEnd

> **toolEnd**: (`call`) => `void`

A tool call finished in the current exchange.

#### Parameters

##### call

###### name

`string`

###### result?

`unknown`

###### error?

`string`

###### callId?

`string`

#### Returns

`void`

---

### flush

> **flush**: (`budgetMs`) => `Promise`\<[`VoiceTurnRecorderStats`](VoiceTurnRecorderStats.md)\>

Shutdown: close what is open, then wait for pending writes — but no longer
than `budgetMs`. Safe to call more than once.

#### Parameters

##### budgetMs

`number`

#### Returns

`Promise`\<[`VoiceTurnRecorderStats`](VoiceTurnRecorderStats.md)\>

---

### stats

> **stats**: () => [`VoiceTurnRecorderStats`](VoiceTurnRecorderStats.md)

Counters, for logs and tests.

#### Returns

[`VoiceTurnRecorderStats`](VoiceTurnRecorderStats.md)
