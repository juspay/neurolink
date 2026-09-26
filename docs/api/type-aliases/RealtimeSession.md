[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeSession

# Type Alias: RealtimeSession

> **RealtimeSession** = `object`

Realtime session information

## Properties

### id

> **id**: `string`

Session ID

---

### state

> **state**: [`RealtimeSessionState`](RealtimeSessionState.md)

Current state

---

### provider

> **provider**: [`RealtimeConfig`](RealtimeConfig.md)\[`"provider"`\]

Provider name — narrowed to the validated config provider union so
session state stays aligned with what `connect()` accepts.

---

### model?

> `optional` **model?**: `string`

Model being used

---

### createdAt

> **createdAt**: `Date`

Session creation time

---

### lastActivityAt

> **lastActivityAt**: `Date`

Last activity time

---

### config

> **config**: [`RealtimeConfig`](RealtimeConfig.md)

Session configuration

---

### isOpen?

> `optional` **isOpen?**: () => `boolean`

Check if session is open

#### Returns

`boolean`

---

### close?

> `optional` **close?**: () => `Promise`\<`void`\>

Close the session

#### Returns

`Promise`\<`void`\>
