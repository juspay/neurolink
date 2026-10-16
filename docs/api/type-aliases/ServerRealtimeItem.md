[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerRealtimeItem

# Type Alias: ServerRealtimeItem

> **ServerRealtimeItem** = `object`

One utterance on the realtime wire: a conversation item.

## Properties

### utterance

> **utterance**: `number`

---

### itemId

> **itemId**: `string`

---

### started

> **started**: `boolean`

`speech_started` went out.

---

### sent

> **sent**: `string`

The committed prefix already sent as deltas.

---

### pending

> **pending**: `object`[]

Server events held until every earlier item has completed.

#### type

> **type**: `string`

#### body

> **body**: `Record`\<`string`, `unknown`\>

---

### finalText?

> `optional` **finalText?**: `string`

---

### engine?

> `optional` **engine?**: `string`

---

### language?

> `optional` **language?**: `string`

---

### languageDetected?

> `optional` **languageDetected?**: `boolean`

---

### corrected

> **corrected**: `boolean`

---

### ready?

> `optional` **ready?**: `string`

The transcript `completed` will carry, once known.

---

### done

> **done**: `boolean`

---

### timer?

> `optional` **timer?**: `ReturnType`\<_typeof_ `setTimeout`\>
