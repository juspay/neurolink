[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseStreamReturn

# Type Alias: UseStreamReturn

> **UseStreamReturn** = `object`

useStream hook return type

## Properties

### start

> **start**: (`options`) => `void`

Start streaming

#### Parameters

##### options

`object` & [`UnknownRecord`](UnknownRecord.md)

#### Returns

`void`

---

### stop

> **stop**: () => `void`

Stop streaming

#### Returns

`void`

---

### text

> **text**: `string`

Current text content

---

### events

> **events**: [`ClientStreamEvent`](ClientStreamEvent.md)[]

All events received

---

### isStreaming

> **isStreaming**: `boolean`

Streaming state

---

### error

> **error**: [`ClientApiError`](ClientApiError.md) \| `null`

Error state
